from sqlalchemy import func, select, update
from sqlalchemy_utils import Ltree
from backend.src.core.database import async_session
from backend.src.models.orm_models import ChatMessage


class MessageRepository:

    @staticmethod
    async def get_message_by_id(parent_id: int) -> ChatMessage:
        async with async_session() as session:
            query = (
                select(ChatMessage)
                .where(ChatMessage.message_id == parent_id)
            )
            result = await session.execute(query)
            return result.scalar_one_or_none()

    @staticmethod
    async def counting_messages(chat_id: int) -> int:
        async with async_session() as session:
            query = (
                select(func.max(ChatMessage.message_id))
                .where(ChatMessage.chat_id == chat_id)
            )
            result = await session.execute(query)
            return result.scalar()

    @staticmethod
    async def create_message(message: ChatMessage) -> ChatMessage:
        async with async_session() as session:
            session.add(message)
            await session.commit()
            await session.refresh(message)
            return message

    @staticmethod
    async def update_path(message_id: int, path: str) -> ChatMessage:
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
        async with async_session() as session:
            query = (
                select(ChatMessage)
                .where(ChatMessage.chat_id == chat_id)
                .order_by(ChatMessage.message_id)
            )
            result = await session.execute(query)
            return list(result.scalars().all())
