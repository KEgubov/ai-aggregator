from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.api.dependency import get_current_user, get_chat_service, get_session

router = APIRouter(prefix="/chats", tags=["Chat"])


@router.post("/create")
async def create_chat(
    chat_service=Depends(get_chat_service),
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Создаёт личный чат и добавляет текущего пользователя в участники."""
    chat_add = await chat_service.validate_create_chat(
        session=session, owner_id=current_user.user_id
    )
    return {"status": "ok", "chat": chat_add}


@router.get("/all")
async def get_chats(
    chat_service=Depends(get_chat_service),
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Возвращает список личных чатов текущего пользователя."""
    chats = await chat_service.validate_personal_chats_from_user(
        session=session, user_id=current_user.user_id
    )
    if not chats:
        return {"status": "ok", "chats": []}
    return {"status": "ok", "chats": chats}


@router.delete("/{chat_id}")
async def delete_chat(
    chat_id: int,
    chat_service=Depends(get_chat_service),
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Удаляет личный чат, если текущий пользователь является его владельцем."""
    response = await chat_service.response_delete_chat(
        session=session,
        chat_id=chat_id,
        user_id=current_user.user_id,
    )
    if not response:
        raise HTTPException(status_code=404, detail="Not found")
    return {"status": "ok"}


@router.get("/members")
async def get_members(
    chat_id: int,
    chat_service=Depends(get_chat_service),
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Возвращает участников чата (владелец + остальные)."""
    chat_members = await chat_service.validate_chat_members(session, chat_id)
    if not chat_members:
        raise HTTPException(status_code=404, detail="Not found")
    return {"status": "ok", "members": chat_members}


@router.post("/{chat_id}/invite")
async def invite(
    chat_id: int,
    current_user=Depends(get_current_user),
    chat_service=Depends(get_chat_service),
    session: AsyncSession = Depends(get_session),
):
    token = await chat_service.generate_invite_link(
        session=session,
        chat_id=chat_id,
        user_id=current_user.user_id,
    )
    if not token:
        raise HTTPException(status_code=404, detail="Not found")
    return {"status": "ok", "token": token}


@router.post("/join/{token}")
async def join(
    token: str,
    current_user=Depends(get_current_user),
    chat_service=Depends(get_chat_service),
    session: AsyncSession = Depends(get_session),
):
    chat = await chat_service.join_chat(session, current_user.user_id, token)
    if not chat:
        raise HTTPException(status_code=404, detail="Not found")
    return {"status": "ok", "chat": chat}


@router.get("/join/{token}")
async def preview_join(
    token: str,
    current_user=Depends(get_current_user),
    chat_service=Depends(get_chat_service),
    session: AsyncSession = Depends(get_session),
):
    preview = await chat_service.preview_invite(session, token, current_user.user_id)
    return {"status": "ok", "invite": preview}


@router.patch("/{chat_id}/rename")
async def rename(
    chat_id: int,
    name: str,
    current_user=Depends(get_current_user),
    chat_service=Depends(get_chat_service),
    session: AsyncSession = Depends(get_session),
):
    renamed_chat = await chat_service.rename_chat(
        session, current_user.user_id, chat_id, name
    )
    return {"status": "ok", "renamed_chat": renamed_chat}
