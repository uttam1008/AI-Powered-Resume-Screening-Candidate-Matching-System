"""
utils/file_parser.py — Extract plain text from PDF and DOCX resume files.
"""
import io
from pathlib import Path

import structlog

logger = structlog.get_logger(__name__)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Parse PDF bytes and return extracted plain text."""
    try:
        import PyPDF2  # type: ignore

        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text.strip()
    except Exception as e:
        logger.warning("pdf.parse_error", error=str(e))
        return ""


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Parse DOCX bytes and return extracted plain text."""
    try:
        from docx import Document  # type: ignore

        doc = Document(io.BytesIO(file_bytes))
        return "\n".join(para.text for para in doc.paragraphs if para.text).strip()
    except Exception as e:
        logger.warning("docx.parse_error", error=str(e))
        return ""


def extract_resume_text(file_bytes: bytes, filename: str) -> str:
    """Dispatch to the correct parser based on file extension."""
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_bytes)
    elif ext in (".docx", ".doc"):
        return extract_text_from_docx(file_bytes)
    else:
        logger.warning("file_parser.unsupported_extension", ext=ext)
        return ""
