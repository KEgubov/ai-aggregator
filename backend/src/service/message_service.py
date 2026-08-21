from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.models.orm_models import ChatMessage
from backend.src.schemas.custom import MessageListResponse
from backend.src.schemas.message_schema import MessageAddDTO, MessageDTO


class MessageService:
    """Бизнес-логика сообщений: сохранение, ветки (ltree), история для генерации."""

    def __init__(self, message_repository) -> None:
        self.message_repository = message_repository

    async def get_message(
        self, session: AsyncSession, parent_id: int
    ) -> MessageDTO | None:
        """Возвращает сообщение по id или None."""
        message = await self.message_repository.get_message_by_id(session, parent_id)
        if not message:
            return None
        return message

    async def validate_save_message(
        self,
        session: AsyncSession,
        message: MessageAddDTO,
        user_id: int,
    ) -> MessageDTO | None:
        """Сохраняет user-сообщение. parent_id=None — корень ветки; иначе явный родитель."""
        if not user_id:
            return None

        if message.parent_id is None:
            model_message = ChatMessage(
                chat_id=message.chat_id,
                content=message.content,
                author_id=user_id,
                parent_id=None,
                context_anchor=message.context_anchor,
                context_text_snippet=message.context_text_snippet,
                author_type="user",
            )
            saved = await self.message_repository.create_message(session, model_message)
            new_path = str(saved.message_id)
            added_message = await self.message_repository.update_path(
                session, saved.message_id, new_path
            )
            if not added_message:
                return None
            return MessageDTO.model_validate(added_message, from_attributes=True)

        parent = await self.get_message(session, message.parent_id)
        if parent is None or parent.chat_id != message.chat_id:
            return None

        model_message = ChatMessage(
            chat_id=message.chat_id,
            content=message.content,
            author_id=user_id,
            parent_id=message.parent_id,
            context_anchor=message.context_anchor,
            context_text_snippet=message.context_text_snippet,
            author_type="user",
        )

        parent_path = str(parent.path) if parent.path else str(parent.message_id)

        saved = await self.message_repository.create_message(session, model_message)
        new_path = f"{parent_path}.{saved.message_id}"
        added_message = await self.message_repository.update_path(
            session, saved.message_id, new_path
        )
        if not added_message:
            return None
        return MessageDTO.model_validate(added_message, from_attributes=True)

    async def save_ai_message(
        self,
        session: AsyncSession,
        chat_id: int,
        parent_id: int,
        ai_model: str,
        ai_provider: str,
        content: str,
        metadata: dict | None = None,
    ) -> MessageDTO | None:
        """Сохраняет ответ ассистента как дочернее к явному parent_id (user-сообщение)."""
        parent = await self.get_message(session, parent_id)
        if parent is None or parent.chat_id != chat_id:
            return None

        model_message = ChatMessage(
            chat_id=chat_id,
            content=content,
            author_id=None,
            parent_id=parent_id,
            author_type="assistant",
            ai_model=ai_model,
            ai_provider=ai_provider,
            message_metadata=metadata or {},
        )

        parent_path = str(parent.path) if parent.path else str(parent.message_id)

        saved = await self.message_repository.create_message(session, model_message)
        new_path = f"{parent_path}.{saved.message_id}"
        added_message = await self.message_repository.update_path(
            session, saved.message_id, new_path
        )
        if not added_message:
            return None
        return MessageDTO.model_validate(added_message, from_attributes=True)

    async def validate_all_messages(
        self, session: AsyncSession, chat_id: int
    ) -> MessageListResponse:
        """Возвращает все сообщения чата в обёртке MessageListResponse."""
        all_messages = await self.message_repository.get_all_messages(session, chat_id)
        return MessageListResponse(
            messages=[
                MessageDTO.model_validate(message, from_attributes=True).model_copy(
                    update={"username": username}
                )
                for message, username in all_messages
            ]
        )

    async def get_history_for_generation(
        self, session: AsyncSession, chat_id: int, leaf_path: str
    ) -> list[dict]:
        """Собирает историю ветки до leaf_path в формате role/content для API моделей."""
        rows = await self.message_repository.get_branch_messages(
            session, chat_id, leaf_path
        )
        history = []
        for row in rows:
            if not row.content:
                continue
            role = "user" if row.author_type == "user" else "assistant"
            content = row.content
            snippet = (row.context_text_snippet or "").strip()
            if role == "user" and snippet:
                content = f"Цитата: «{snippet}»\n\n{row.content}"
            history.append({"role": role, "content": content})
        return history
