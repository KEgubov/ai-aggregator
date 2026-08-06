import asyncio

from sqlalchemy import select, update, func
from sqlalchemy_utils import Ltree
from backend.src.core.database import async_session
from backend.src.models.orm_models import ChatMessage, User


class MessageRepository:
    """Доступ к БД для сообщений чата и ltree-путей веток."""

    @staticmethod
    async def get_message_by_id(parent_id: int) -> ChatMessage:
        """Возвращает сообщение по message_id или None."""
        async with async_session() as session:
            query = (
                select(ChatMessage)
                .where(ChatMessage.message_id == parent_id)
            )
            result = await session.execute(query)
            return result.scalar_one_or_none()

    @staticmethod
    async def create_message(message: ChatMessage) -> ChatMessage:
        """Сохраняет новое сообщение и возвращает его с заполненным id."""
        async with async_session() as session:
            session.add(message)
            await session.commit()
            await session.refresh(message)
            return message

    @staticmethod
    async def update_path(message_id: int, path: str) -> ChatMessage:
        """Обновляет ltree-path сообщения и возвращает актуальную запись."""
        async with async_session() as session:
            query = (
                update(ChatMessage)
                .where(ChatMessage.message_id == message_id)
                .values(path=Ltree(path))
            )
            await session.execute(query)
            await session.commit()
            result = await session.execute(
                select(ChatMessage).where(ChatMessage.message_id == message_id)
            )
            return result.scalar_one()

    @staticmethod
    async def get_all_messages(chat_id: int) -> list[ChatMessage]:
        """Возвращает все сообщения чата в порядке message_id."""
        async with async_session() as session:
            query = (
                select(ChatMessage, User.username)
                .outerjoin(User, ChatMessage.author_id == User.user_id)
                .where(ChatMessage.chat_id == chat_id)
                .order_by(ChatMessage.message_id)
            )
            result = await session.execute(query)
            return result.all()

    @staticmethod
    async def get_branch_messages(chat_id: int, leaf_path: str) -> list[ChatMessage]:
        """Возвращает предков leaf_path (ветку) в порядке глубины ltree."""
        async with async_session() as session:
            query = (
                select(ChatMessage)
                .where(
                    ChatMessage.chat_id == chat_id,
                    ChatMessage.path.ancestor_of(Ltree(leaf_path)),
                )
                .order_by(func.nlevel(ChatMessage.path))
            )
            result = await session.execute(query)
            return list(result.scalars().all())
