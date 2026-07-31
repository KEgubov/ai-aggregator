import logging
from collections.abc import AsyncIterator
from typing import Any

from groq import AsyncGroq, PermissionDeniedError, APIStatusError

from backend.src.configs.api_config import api_settings

logger = logging.getLogger(__name__)


class GroqClient:
    """Асинхронный клиент Groq Chat Completions."""

    def __init__(self):
        """Инициализирует AsyncGroq по ключу из настроек."""
        self.client = AsyncGroq(api_key=api_settings.GROQ_API, max_retries=3)

    async def generate_response(self, model: str, prompt: str) -> str:
        """Возвращает полный ответ модели на один user-prompt."""
        response = await self.client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=model,
        )
        return response.choices[0].message.content or ""

    async def stream_chat(
        self, model: str, messages: list[dict]
    ) -> AsyncIterator[str | tuple[str, dict[str, Any]]]:
        """Стримит чат; в конце отдаёт ``("usage", meta)`` с токенами."""
        try:
            stream = await self.client.chat.completions.create(
                messages=messages,
                model=model,
                stream=True,
                extra_body={"stream_options": {"include_usage": True}},
            )
            last_usage = None
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

                usage = chunk.usage
                if usage is None and chunk.x_groq is not None:
                    usage = chunk.x_groq.usage
                if usage is not None:
                    last_usage = usage

            if last_usage:
                yield (
                    "usage",
                    {
                        "prompt_token_count": last_usage.prompt_tokens,
                        "candidates_token_count": last_usage.completion_tokens,
                        "total_token_count": last_usage.total_tokens,
                    },
                )
            else:
                yield ("usage", {})
        except PermissionDeniedError:
            logger.error(
                "Groq API: доступ запрещён (403). Проверьте GROQ_API и доступ к модели %s",
                model,
            )
            yield (
                "⚠ Groq отклонил запрос (403 Forbidden). "
                "Проверьте ключ GROQ_API в .env и что модель доступна вашему аккаунту."
            )
            yield ("usage", {})
        except APIStatusError as e:
            logger.error("Groq API error %s for model %s: %s", e.status_code, model, e)
            yield f"⚠ Ошибка Groq API ({e.status_code}): {e}"
            yield ("usage", {})
        except Exception as e:
            logger.exception("Непредвиденная ошибка в GroqClient: %s", e)
            yield "⚠ Произошла ошибка при обращении к Groq."
            yield ("usage", {})


groq_client = GroqClient()
