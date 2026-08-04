from fastapi import APIRouter, Depends, HTTPException

from backend.src.api.dependency import get_current_user, get_chat_service
from backend.src.schemas.chat_schema import ChatAddDTO

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/create")
async def create_chat(
    chat: ChatAddDTO,
    chat_service=Depends(get_chat_service),
    current_user=Depends(get_current_user),
):
    """Создаёт личный чат и добавляет текущего пользователя в участники."""
    chat_add = await chat_service.validate_create_chat(
        chat, owner_id=current_user.user_id
    )
    return {"status": "ok", "chat": chat_add}


@router.get("/all")
async def get_chats(
    chat_service=Depends(get_chat_service), current_user=Depends(get_current_user)
):
    """Возвращает список личных чатов текущего пользователя."""
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
    """Удаляет личный чат, если текущий пользователь является его владельцем."""
    response = await chat_service.response_delete_chat(chat_id=chat_id, user_id=current_user.user_id)
    if not response:
        raise HTTPException(status_code=404, detail="Not found")
    return {"status": "ok"}


@router.get("/members")
async def get_members(
    chat_id: int,
    chat_service=Depends(get_chat_service),
    current_user=Depends(get_current_user),
):
    """Возвращает участников чата (владелец + остальные)."""
    chat_members = await chat_service.validate_chat_members(chat_id)
    if not chat_members:
        raise HTTPException(status_code=404, detail="Not found")
    return {"status": "ok", "members": chat_members}

@router.post("/{chat_id}/invite")
async def invite(
        chat_id: int,
        current_user = Depends(get_current_user),
        chat_service = Depends(get_chat_service),
):
    token = await chat_service.generate_invite_link(
        chat_id=chat_id,
        user_id=current_user.user_id,
    )
    if not token:
        raise HTTPException(status_code=404, detail="Not found")
    return {"status": "ok", "token": token}
