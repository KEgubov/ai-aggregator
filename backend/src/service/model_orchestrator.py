from typing import Any, AsyncGenerator

from fastapi import HTTPException


class AIOrchestrator:
    def __init__(self, model_service, gemini_client, groq_client):
        self.model_service = model_service
        self.gemini_client = gemini_client
        self.groq_client = groq_client

    async def orchestrate_generation(
        self, model_id: int, text: str
    ) -> AsyncGenerator[Any, Any]:
        meta_list = await self.model_service.get_meta_for_api(model_id)

        if not meta_list:
            raise HTTPException(status_code=404, detail=f"Model {model_id} not found")

        meta = meta_list[0]
        provider_name = meta.provider_name
        model_name = meta.model_name

        if provider_name in ["gemini", "gem"]:
            async for chunk in self.gemini_client.stream_response(
                model=model_name, prompt=text
            ):
                yield chunk
        elif provider_name in [
            "groq",
            "allam",
            "canopylabs",
            "llama",
            "openai",
            "qwen",
            "whisper",
        ]:
            async for chunk in self.groq_client.stream_chat(
                model=model_name, prompt=text
            ):
                yield chunk
        else:
            raise HTTPException(
                status_code=400, detail=f"Provider '{provider_name}' is not supported"
            )
