from sqlalchemy import select, Row, update, and_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.models.orm_models import Chat, ChatMember, User, ChatInviteLink


class ChatRepository:
    """Доступ к БД для личных чатов и их участников."""

    @staticmethod
    async def create_chat(session: AsyncSession, chat: Chat):
        """Создаёт чат; при нарушении уникальности поднимает DuplicateError."""
        session.add(chat)
        await session.commit()
        await session.refresh(chat)
        return chat

    @staticmethod
    async def get_chat_by_id(session: AsyncSession, chat_id: int) -> Chat | None:
        query = select(Chat).where(Chat.chat_id == chat_id)
        result = await session.execute(query)
        return result.scalar() if result else None

    @staticmethod
    async def get_personal_chats_from_user(session: AsyncSession, user_id: int):
        """Возвращает все личные чаты, где пользователь — владелец."""
        query = (
            select(Chat)
            .join(ChatMember, ChatMember.chat_id == Chat.chat_id)
            .where(ChatMember.user_id == user_id)
        )
        personal_chats = await session.execute(query)
        return personal_chats.scalars().all() if personal_chats else None

    @staticmethod
    async def delete_chat_in_db(
        session: AsyncSession, chat_id: int, user_id: int
    ) -> bool:
        """Удаляет чат по id, если user_id — владелец; иначе False."""
        chat = await session.scalar(
            select(Chat).where(Chat.chat_id == chat_id, Chat.owner_id == user_id)
        )
        if chat is None:
            return False
        await session.delete(chat)
        await session.commit()
        return True

    @staticmethod
    async def added_user_in_members(
        session: AsyncSession, chat_member: ChatMember
    ) -> ChatMember:
        """Добавляет запись участника чата и возвращает её."""
        session.add(chat_member)
        await session.commit()
        await session.refresh(chat_member)
        return chat_member

    @staticmethod
    async def get_chat_members(
        session: AsyncSession, chat_id: int
    ) -> Row[tuple[str, int]] | None:
        query = (
            select(User.username, User.about_me, ChatMember.is_owner)
            .join(ChatMember, ChatMember.user_id == User.user_id)
            .where(ChatMember.chat_id == chat_id)
        )
        result = await session.execute(query)
        return result.all() if result else None

    @staticmethod
    async def user_in_chat_member(
        session: AsyncSession, chat_id: int, user_id: int
    ) -> ChatMember | None:
        query = (
            select(ChatMember)
            .where(ChatMember.chat_id == chat_id)
            .where(ChatMember.user_id == user_id)
        )
        result = await session.execute(query)
        return result.scalar() if result else None

    @staticmethod
    async def add_link_in_db(
        session: AsyncSession, chat_link: ChatInviteLink
    ) -> ChatInviteLink:
        session.add(chat_link)
        await session.commit()
        await session.refresh(chat_link)
        return chat_link

    @staticmethod
    async def find_invite_link(
        session: AsyncSession, token: str
    ) -> ChatInviteLink | None:
        query = select(ChatInviteLink).where(ChatInviteLink.token == token)
        result = await session.execute(query)
        return result.scalar() if result else None

    @staticmethod
    async def update_invite_link(
        session: AsyncSession, token: str, uses_count: int
    ) -> None:
        stmt = (
            update(ChatInviteLink)
            .where(ChatInviteLink.token == token)
            .values(uses_count=uses_count)
        )
        await session.execute(stmt)
        await session.commit()

    @staticmethod
    async def get_chat_member_ids(
        session: AsyncSession, chat_id: int
    ) -> list[int] | None:
        stmt = select(ChatMember.user_id).where(ChatMember.chat_id == chat_id)
        result = await session.execute(stmt)
        return result.scalars().all() if result else None

    @staticmethod
    async def rename_chat_in_db(session: AsyncSession, chat_id: int, name: str) -> Chat:
        query = (
            update(Chat)
            .where(Chat.chat_id == chat_id)
            .values(name=name)
            .returning(Chat)
        )
        result = await session.execute(query)
        chat = result.scalar_one()
        await session.commit()
        await session.refresh(chat)
        return chat

    @staticmethod
    async def is_owner_chat(session: AsyncSession, user_id: int, chat_id: int) -> bool:
        stmt = select(ChatMember.is_owner).where(
            and_(ChatMember.user_id == user_id, ChatMember.chat_id == chat_id)
        )
        result = await session.execute(stmt)
        value = result.scalar()
        return bool(value)
