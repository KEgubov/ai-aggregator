import logging

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from backend.src.clients.gemini_client import gemini_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/gemini", tags=["chat"])

@router.get("/send")
async def stream_message(text: str) -> StreamingResponse:
    async def event_generator():
        async for chunk in gemini_client.stream_response(text):
            yield chunk

    return StreamingResponse(event_generator(), media_type="text/plain; charset=utf-8")
