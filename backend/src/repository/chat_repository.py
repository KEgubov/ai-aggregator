from sqlalchemy import select, Row
from sqlalchemy.exc import IntegrityError

from backend.src.core.database import async_session
from backend.src.models.orm_models import Chat, ChatMember, User, ChatInviteLink
from backend.src.service.exceptions import DuplicateError


class ChatRepository:
    """Доступ к БД для личных чатов и их участников."""

    @staticmethod
    async def create_chat(chat: Chat):
        """Создаёт чат; при нарушении уникальности поднимает DuplicateError."""
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
        """Возвращает все личные чаты, где пользователь — владелец."""
        async with async_session() as session:
            query = (
                select(Chat)
                .join(ChatMember, ChatMember.chat_id == Chat.chat_id)
                .where(ChatMember.user_id == user_id)
            )
            personal_chats = await session.execute(query)
            return personal_chats.scalars().all() if personal_chats else None

    @staticmethod
    async def delete_chat_in_db(chat_id: int, user_id: int) -> bool:
        """Удаляет чат по id, если user_id — владелец; иначе False."""
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

    @staticmethod
    async def added_user_in_members(chat_member: ChatMember) -> ChatMember:
        """Добавляет запись участника чата и возвращает её."""
        async with async_session() as session:
            session.add(chat_member)
            await session.commit()
            await session.refresh(chat_member)
            return chat_member

    @staticmethod
    async def get_chat_members(chat_id: int) -> Row[tuple[str, int]] | None:
        async with async_session() as session:
            query = (
                select(User.username, User.about_me)
                .join(ChatMember, ChatMember.user_id == User.user_id)
                .where(ChatMember.chat_id == chat_id)
            )
            result = await session.execute(query)
            return result.all() if result else None

    @staticmethod
    async def user_in_chat_member(chat_id: int, user_id: int) -> bool:
        async with async_session() as session:
            query = (
                select(ChatMember)
                .where(ChatMember.chat_id == chat_id)
                .where(ChatMember.user_id == user_id)
            )
            result = await session.execute(query)
            if not result:
                return False
            return True

    @staticmethod
    async def add_link_in_db(chat_link: ChatInviteLink) -> ChatInviteLink:
        async with async_session() as session:
            session.add(chat_link)
            await session.commit()
            await session.refresh(chat_link)
            return chat_link
