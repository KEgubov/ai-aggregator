from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from backend.src.core.database import async_session
from backend.src.models.orm_models import Chat
from backend.src.service.exceptions import DuplicateError


class ChatRepository:

    @staticmethod
    async def create_chat(chat: Chat):
        async with async_session() as session:
            try:
                session.add(chat)
                await session.commit()
                await session.refresh(chat)
                return chat
            except IntegrityError as e:
                if "already exists" in str(e.orig):
                    raise DuplicateError(
                        message="Chat already exists!",
                        error_code="CHAT_DUPLICATE",
                    )

    @staticmethod
    async def get_personal_chats_from_user(user_id: int):
        async with async_session() as session:
            query = (
                select(Chat)
                .where(Chat.owner_id == user_id)
            )
            personal_chats = await session.execute(query)
            return personal_chats.scalars().all() if personal_chats else None
