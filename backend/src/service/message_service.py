from backend.src.models.orm_models import ChatMessage
from backend.src.schemas.custom import MessageListResponse
from backend.src.schemas.message_schema import MessageAddDTO, MessageDTO


class MessageService:
    def __init__(self, message_repository) -> None:
        self.message_repository = message_repository

    async def get_message(self, parent_id: int) -> MessageDTO | None:
        message = await self.message_repository.get_message_by_id(parent_id)
        if not message:
            return None
        return message

    async def validate_save_message(
        self,
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
            saved = await self.message_repository.create_message(model_message)
            saved.path = str(saved.message_id)
            added_message = await self.message_repository.update_path(
                saved.message_id, saved.path
            )
            if not added_message:
                return None
            return MessageDTO.model_validate(added_message, from_attributes=True)

        parent = await self.get_message(message.parent_id)
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
        saved = await self.message_repository.create_message(model_message)
        saved.path = f"{parent.path}.{saved.message_id}"
        added_message = await self.message_repository.update_path(
            saved.message_id, saved.path
        )
        if not added_message:
            return None
        return MessageDTO.model_validate(added_message, from_attributes=True)

    async def save_ai_message(
        self,
        chat_id: int,
        parent_id: int,
        ai_model: str,
        ai_provider: str,
        content: str,
        metadata: dict | None = None,
    ) -> MessageDTO | None:
        """Сохраняет ответ ассистента как дочернее к явному parent_id (user-сообщение)."""
        parent = await self.get_message(parent_id)
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
        saved = await self.message_repository.create_message(model_message)
        saved.path = f"{parent.path}.{saved.message_id}"
        added_message = await self.message_repository.update_path(
            saved.message_id, saved.path
        )
        if not added_message:
            return None
        return MessageDTO.model_validate(added_message, from_attributes=True)

    async def validate_all_messages(self, chat_id: int) -> MessageListResponse:
        all_messages = await self.message_repository.get_all_messages(chat_id)
        return MessageListResponse(
            messages=[
                MessageDTO.model_validate(row, from_attributes=True)
                for row in all_messages
            ]
        )

    async def get_history_for_generation(
        self, chat_id: int, leaf_path: str
    ) -> list[dict]:
        rows = await self.message_repository.get_branch_messages(chat_id, leaf_path)
        history = []
        for row in rows:
            if not row.content:
                continue
            role = "user" if row.author_type == "user" else "assistant"
            history.append({"role": role, "content": row.content})
        return history
