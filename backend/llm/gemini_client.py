"""
llm/gemini_client.py — Singleton Gemini API client for text generation and embeddings.
"""
import structlog
import google.generativeai as genai
from google.api_core.exceptions import GoogleAPIError
from tenacity import retry, stop_after_attempt, wait_exponential

from core.config import settings

logger = structlog.get_logger(__name__)

# Configure SDK once at import time
genai.configure(api_key=settings.GEMINI_API_KEY)


class GeminiClient:
    """Wrapper around google-generativeai SDK."""

    def __init__(self) -> None:
        self._model = genai.GenerativeModel(settings.GEMINI_MODEL)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    async def generate(self, prompt: str) -> str:
        """Send a text prompt and return the response text."""
        logger.info("gemini.generate", model=settings.GEMINI_MODEL)
        try:
            response = await self._model.generate_content_async(prompt)
            return response.text
        except GoogleAPIError as e:
            logger.error("gemini.generate_error", error=str(e))
            raise
        except Exception as e:
            logger.error("gemini.unexpected_error", error=str(e))
            raise

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    async def embed(self, text: str) -> list[float]:
        """Generate a text embedding vector."""
        logger.info("gemini.embed", model=settings.GEMINI_EMBEDDING_MODEL)
        try:
            result = await genai.embed_content_async(
                model=settings.GEMINI_EMBEDDING_MODEL,
                content=text,
                task_type="retrieval_document",
            )
            embedding = result["embedding"]
            # Truncate to match database schema required dimensions
            return embedding[:settings.EMBEDDING_DIMENSIONS]
        except GoogleAPIError as e:
            logger.error("gemini.embed_error", error=str(e))
            raise
        except Exception as e:
            logger.error("gemini.unexpected_error", error=str(e))
            raise


# Singleton instance
gemini_client = GeminiClient()
