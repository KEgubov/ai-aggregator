import logging
from collections.abc import AsyncIterator

from groq import AsyncGroq, PermissionDeniedError, APIStatusError

from backend.src.configs.api_config import api_settings

logger = logging.getLogger(__name__)


class GroqClient:
    """Асинхронная обертка над Groq API."""

    def __init__(self):
        self.client = AsyncGroq(api_key=api_settings.GROQ_API, max_retries=3)

    async def generate_response(self, model: str, prompt: str) -> str:
        response = await self.client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=model,
        )
        return response.choices[0].message.content or ""

    async def stream_chat(self, model: str, prompt: str) -> AsyncIterator[str]:
        try:
            stream = await self.client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=model,
                stream=True,
            )
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except PermissionDeniedError:
            logger.error("Groq API: доступ запрещён (403). Проверьте GROQ_API и доступ к модели %s", model)
            yield (
                "⚠ Groq отклонил запрос (403 Forbidden). "
                "Проверьте ключ GROQ_API в .env и что модель доступна вашему аккаунту."
            )
        except APIStatusError as e:
            logger.error("Groq API error %s for model %s: %s", e.status_code, model, e)
            yield f"⚠ Ошибка Groq API ({e.status_code}): {e}"
        except Exception as e:
            logger.exception("Непредвиденная ошибка в GroqClient: %s", e)
            yield "⚠ Произошла ошибка при обращении к Groq."


groq_client = GroqClient()
