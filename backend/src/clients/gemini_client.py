import logging

from google import genai
from google.genai.errors import APIError
from backend.src.configs.api_config import api_settings

logger = logging.getLogger(__name__)

class GeminiClient:
    def __init__(self):
        self.client = genai.Client(api_key=api_settings.GEMINI_API)
        self.model = "gemini-3.5-flash"

    async def generate_response(
        self,
        prompt: str,
        retries: int = 3,
        delay: int = 2,
    ) -> str | None:
        for attempt in range(retries):
            try:
                response = await self.client.aio.models.generate_content(
                    model=self.model,
                    contents=prompt,
                )
                return response.text

            except APIError as e:
                if e.code == 429:
                    if attempt < retries - 1:
                        logger.warning(
                            f"Rate limit hit. Waiting {delay}s... (Attempt {attempt + 1}/{retries})"
                        )
                        import asyncio

                        await asyncio.sleep(delay)
                        delay *= 2
                        continue

                logger.error(f"Google API Error: {e}")
                return "Извините, сервер сейчас перегружен. Пожалуйста, попробуйте позже. ⏳"

            except Exception as e:
                logger.exception(f"Непредвиденная ошибка в GeminiClient: {e}")
                return "Произошла ошибка при обработке запроса."
        return None


gemini_client = GeminiClient()
