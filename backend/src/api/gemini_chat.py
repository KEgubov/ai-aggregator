import logging
from fastapi import APIRouter
from backend.src.clients.gemini_client import gemini_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/gemini", tags=["chat"])

@router.get("/chat")
async def input_message(text: str) -> str:
    response = await gemini_client.generate_response(text)
    return response or "Не удалось получить ответ от Gemini."
