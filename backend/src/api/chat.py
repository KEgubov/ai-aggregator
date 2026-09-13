from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from backend.src.api.dependency import get_current_user, get_chat_service, get_session
from backend.src.schemas.chat_schema import ChatDTO
from backend.src.schemas.custom import ChatMemberDTO, PreviewInviteDTO

router = APIRouter(prefix="/chats", tags=["Chat"])


@router.post(
    "/create",
    response_model=ChatDTO,
    status_code=status.HTTP_201_CREATED,
)
async def create_chat(
    chat_service=Depends(get_chat_service),
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ChatDTO:
    """Создаёт личный чат и добавляет текущего пользователя в участники."""
    chat_add = await chat_service.validate_create_chat(
        session=session, owner_id=current_user.user_id
    )
    return chat_add


@router.get(
    "/all",
    response_model=list[ChatDTO],
)
async def get_chats(
    chat_service=Depends(get_chat_service),
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ChatDTO] | list[Any]:
    """Возвращает список личных чатов текущего пользователя."""
    chats = await chat_service.validate_personal_chats_from_user(
        session=session, user_id=current_user.user_id
    )
    if not chats:
        return []
    return chats


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


@router.get(
    "/members",
    response_model=list[ChatMemberDTO],
)
async def get_members(
    chat_id: int,
    chat_service=Depends(get_chat_service),
    current_user=Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ChatMemberDTO]:
    """Возвращает участников чата (владелец + остальные)."""
    chat_members = await chat_service.validate_chat_members(session, chat_id)
    if not chat_members:
        raise HTTPException(status_code=404, detail="Not found")
    return chat_members


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
    return {"token": token}


@router.post(
    "/join/{token}",
    response_model=ChatDTO,
)
async def join(
    token: str,
    current_user=Depends(get_current_user),
    chat_service=Depends(get_chat_service),
    session: AsyncSession = Depends(get_session),
):
    chat = await chat_service.join_chat(session, current_user.user_id, token)
    if not chat:
        raise HTTPException(status_code=404, detail="Not found")
    return chat


@router.get(
    "/join/{token}",
    response_model=PreviewInviteDTO,
)
async def preview_join(
    token: str,
    current_user=Depends(get_current_user),
    chat_service=Depends(get_chat_service),
    session: AsyncSession = Depends(get_session),
):
    return await chat_service.preview_invite(session, token, current_user.user_id)


@router.patch(
    "/{chat_id}/rename",
    response_model=ChatDTO,
)
async def rename(
    chat_id: int,
    name: str,
    current_user=Depends(get_current_user),
    chat_service=Depends(get_chat_service),
    session: AsyncSession = Depends(get_session),
) -> ChatDTO:
    return await chat_service.rename_chat(session, current_user.user_id, chat_id, name)
