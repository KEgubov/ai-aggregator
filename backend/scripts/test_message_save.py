import asyncio

from sqlalchemy import delete

from backend.src.core.database import async_session
from backend.src.models.orm_models import ChatMessage
from backend.src.repository.message_repository import MessageRepository
from backend.src.schemas.message_schema import MessageAddDTO
from backend.src.service.message_service import MessageService


async def cleanup_chat(chat_id: int) -> None:
    async with async_session() as session:
        await session.execute(
            delete(ChatMessage).where(ChatMessage.chat_id == chat_id)
        )
        await session.commit()


async def main() -> None:
    chat_id = 1
    user_id = 1
    await cleanup_chat(chat_id)

    service = MessageService(MessageRepository())

    dto1 = MessageAddDTO(chat_id=chat_id, content="Test message 1")
    r1 = await service.validate_save_message(dto1, user_id)
    print("MSG1:", r1[0].model_dump() if r1 else None)

    dto2 = MessageAddDTO(chat_id=chat_id, content="Test message 2")
    r2 = await service.validate_save_message(dto2, user_id)
    print("MSG2:", r2[0].model_dump() if r2 else None)

    dto3 = MessageAddDTO(
        chat_id=chat_id,
        content="Branch question",
        parent_id=r1[0].message_id if r1 else None,
        context_anchor="para-1",
        context_text_snippet="Test message 1",
    )
    r3 = await service.validate_save_message(dto3, user_id)
    print("MSG3:", r3[0].model_dump() if r3 else None)


if __name__ == "__main__":
    asyncio.run(main())
