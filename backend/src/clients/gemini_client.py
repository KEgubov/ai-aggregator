import asyncio
import logging
from typing import Any, AsyncGenerator

from google import genai
from google.genai.errors import APIError

from backend.src.configs.api_config import api_settings

logger = logging.getLogger(__name__)


class GeminiClient:
    def __init__(self):
        self.client = genai.Client(api_key=api_settings.GEMINI_API)

    async def stream_response(
        self,
        model: str,
        messages: list[dict],
        retries: int = 3,
        delay: int = 2,
    ) -> AsyncGenerator[str | None | tuple[str, dict[str, int | None]], Any]:
        for attempt in range(retries):
            try:
                contents = [
                    {"role": "user", "parts": [{"text": m["content"]}]}
                    if m["role"] == "user"
                    else {"role": "model", "parts": [{"text": m["content"]}]}
                    for m in messages
                ]
                stream = await self.client.aio.models.generate_content_stream(
                    model=model,
                    contents=contents,
                )
                last_usage = None
                async for chunk in stream:
                    if chunk.text:
                        yield chunk.text
                    if chunk.usage_metadata:
                        last_usage = chunk.usage_metadata

                if last_usage:
                    yield ("usage", {
                        "prompt_token_count": last_usage.prompt_token_count,
                        "candidates_token_count": last_usage.candidates_token_count,
                        "total_token_count": last_usage.total_token_count,
                    })
                else:
                    yield "usage", {}
                return
            except APIError as e:
                if e.code == 429 and attempt < retries - 1:
                    logger.warning(
                        "Rate limit hit. Waiting %ss... (Attempt %s/%s)",
                        delay,
                        attempt + 1,
                        retries,
                    )
                    await asyncio.sleep(delay)
                    delay *= 2
                    continue
                logger.error("Google API Error: %s", e)
                yield (
                    "Извините, сервер сейчас перегружен. "
                    "Пожалуйста, попробуйте позже. ⏳"
                )
                return
            except Exception as e:
                logger.exception("Непредвиденная ошибка в GeminiClient: %s", e)
                yield "Произошла ошибка при обработке запроса."
                return

    async def generate_response(
        self,
        model: str,
        prompt: str,
        retries: int = 3,
        delay: int = 2,
    ) -> str | None:
        parts: list[str] = []
        async for chunk in self.stream_response(
            model=model, prompt=prompt, retries=retries, delay=delay
        ):
            if isinstance(chunk, str):
                parts.append(chunk)
        return "".join(parts) if parts else None
