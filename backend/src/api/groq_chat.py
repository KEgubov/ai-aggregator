import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from backend.src.clients.groq_client import groq_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/groq", tags=["chat"])


@router.get("/chat")
async def response_groq(text: str) -> str:
    response = await groq_client.generate_response(text)
    return response or "Не удалось получить ответ от провайдера Groq."


@router.get("/chat/stream")
async def response_groq_stream(text: str) -> StreamingResponse:
    async def event_generator():
        async for chunk in groq_client.stream_chat(text):
            yield chunk

    return StreamingResponse(event_generator(), media_type="text/plain; charset=utf-8")
