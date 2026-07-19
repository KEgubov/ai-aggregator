from fastapi import APIRouter, Depends, HTTPException

from backend.src.api.dependency import get_current_user, get_chat_service
from backend.src.schemas.chat_schema import ChatAddDTO
from backend.src.service import chat_service

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/create")
async def create_chat(
    chat: ChatAddDTO,
    chat_service=Depends(get_chat_service),
    current_user=Depends(get_current_user),
):
    chat_add = await chat_service.validate_create_chat(
        chat, owner_id=current_user.user_id
    )
    return {"status": "ok", "chat": chat_add}


@router.get("/all")
async def get_chats(
    chat_service=Depends(get_chat_service), current_user=Depends(get_current_user)
):
    chats = await chat_service.validate_personal_chats_from_user(
        user_id=current_user.user_id
    )
    if not chats:
        return {"status": "ok", "chats": []}
    return {"status": "ok", "chats": chats}


@router.delete("/{chat_id}")
async def delete_chat(
    chat_id: int,
    chat_service=Depends(get_chat_service),
    current_user=Depends(get_current_user),
):
    response = await chat_service.response_delete_chat(chat_id=chat_id, user_id=current_user.user_id)
    if not response:
        raise HTTPException(status_code=404, detail="Not found")
    return {"status": "ok"}
