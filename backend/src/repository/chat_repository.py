from sqlalchemy import select, delete
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

    @staticmethod
    async def delete_chat_in_db(chat_id: int, user_id: int) -> bool:
        async with async_session() as session:
            chat = await session.scalar(
                select(Chat).where(Chat.chat_id == chat_id,
                                   Chat.owner_id == user_id)
            )
            if chat is None:
                return False
            await session.delete(chat)
            await session.commit()
            return True
