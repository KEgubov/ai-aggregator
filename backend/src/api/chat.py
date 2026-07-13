from fastapi import APIRouter, Depends

from backend.src.api.dependency import get_current_user, get_chat_service
from backend.src.schemas.chat_schema import ChatAddDTO

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/create")
async def create_chat(
    chat: ChatAddDTO,
    chat_service = Depends(get_chat_service),
    current_user = Depends(get_current_user)
):
    chat_add = await chat_service.validate_create_chat(chat, owner_id=current_user.user_id)
    return {"status": "ok", "chat": chat_add}