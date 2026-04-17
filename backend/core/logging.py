"""
core/logging.py — Structured logging configuration using structlog.

Log files are stored at:
    backend/logger/logs/<YYYY-MM-DD>/<HH>.log

All timestamps and log-file naming use IST (Asia/Kolkata, UTC+5:30) — both
when running locally and inside Docker containers.

A new date-folder and hour-file are created automatically the first time a log
entry is written in that date/hour window.  All existing callers that use
    structlog.get_logger(__name__)
continue to work without any changes.
"""

import logging
import pathlib
import structlog
from zoneinfo import ZoneInfo

# ── IST timezone (UTC +05:30) ────────────────────────────────────────────────
_IST = ZoneInfo("Asia/Kolkata")

# ── Path to the log root (backend/logger/logs/) ───────────────────────────────
_LOG_ROOT = pathlib.Path(__file__).resolve().parent.parent / "logger" / "logs"


# ── Custom handler: picks the right file each time a record is emitted ────────
class _HourlyFileHandler(logging.Handler):
    """
    A logging.Handler that writes every record to:
        <LOG_ROOT>/<YYYY-MM-DD>/<HH>.log

    The date/hour are evaluated at emit time, so the file destination rolls
    over automatically as wall-clock date or hour changes — no cron job needed.
    Directories and files are created on demand.
    """

    def __init__(self, log_root: pathlib.Path, level: int = logging.NOTSET):
        super().__init__(level)
        self._log_root = log_root

    def _get_log_path(self) -> pathlib.Path:
        """Return the Path for the current IST date/hour log file."""
        from datetime import datetime

        now = datetime.now(_IST)                      # current time in IST (UTC+5:30)
        date_dir = self._log_root / now.strftime("%Y-%m-%d")
        date_dir.mkdir(parents=True, exist_ok=True)   # create YYYY-MM-DD/ if needed
        return date_dir / f"{now.strftime('%H')}.log" # e.g. 14.log

    def emit(self, record: logging.LogRecord) -> None:
        try:
            log_path = self._get_log_path()
            msg = self.format(record)
            with log_path.open("a", encoding="utf-8") as fh:
                fh.write(msg + "\n")
        except Exception:
            self.handleError(record)


# ── Public API ────────────────────────────────────────────────────────────────
def configure_logging(level: str = "INFO") -> None:
    """
    Configure structlog + stdlib logging.

    - Console: coloured structlog output (unchanged from original behaviour).
    - File:    plain-text lines appended to logger/logs/<YYYY-MM-DD>/<HH>.log
    """
    numeric_level = logging.getLevelName(level)

    # -- 1. Processors shared by both the console renderer and the file formatter
    #        TimeStamper uses utc=False so it stamps in the local/container TZ
    #        which the compose file sets to Asia/Kolkata via TZ=Asia/Kolkata.
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="%Y-%m-%d %H:%M:%S %Z", utc=False),
    ]

    # -- 2. Wire structlog → stdlib so our custom handler receives every record
    structlog.configure(
        processors=[
            *shared_processors,
            # Hand off to stdlib logging
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(numeric_level),
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
    )

    # -- 3. Formatter used by the file handler (plain key=value text)
    plain_formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            structlog.processors.KeyValueRenderer(key_order=["level", "timestamp", "event"]),
        ],
        foreign_pre_chain=shared_processors,
    )

    # -- 4. Formatter used by the console handler (pretty colours)
    console_formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            structlog.dev.ConsoleRenderer(),
        ],
        foreign_pre_chain=shared_processors,
    )

    # -- 5. Console handler (stdout) — mirrors original behaviour
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(console_formatter)

    # -- 6. Hourly file handler
    file_handler = _HourlyFileHandler(_LOG_ROOT, level=numeric_level)
    file_handler.setFormatter(plain_formatter)

    # -- 7. Root logger: attach both handlers
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)

    # Avoid adding duplicate handlers on repeated calls (e.g. during testing)
    if not any(isinstance(h, _HourlyFileHandler) for h in root_logger.handlers):
        root_logger.addHandler(console_handler)
        root_logger.addHandler(file_handler)
