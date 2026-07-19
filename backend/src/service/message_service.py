from backend.src.models.orm_models import ChatMessage
from backend.src.schemas.custom import MessageListResponse
from backend.src.schemas.message_schema import MessageAddDTO, MessageDTO


class MessageService:
    def __init__(self, message_repository) -> None:
        self.message_repository = message_repository

    async def validate_save_message(
        self,
        message: MessageAddDTO,
        user_id: int,
    ) -> list[MessageDTO] | None:
        max_message_id = await self.message_repository.counting_messages(message.chat_id)
        if max_message_id is None and user_id:
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
            added_message = await self.message_repository.update_path(saved.message_id, saved.path)
            if added_message:
                result_dto = [
                    MessageDTO.model_validate(added_message,
                                              from_attributes=True)
                ]
                return result_dto
        elif max_message_id >= 1 and user_id:
            parent_id = (
                message.parent_id
                if message.parent_id is not None
                else max_message_id
            )
            parent = await self.message_repository.get_message_by_id(parent_id)
            if parent is None or parent.chat_id != message.chat_id:
                return None
            model_message = ChatMessage(
                chat_id=message.chat_id,
                content=message.content,
                author_id=user_id,
                parent_id=parent_id,
                context_anchor=message.context_anchor,
                context_text_snippet=message.context_text_snippet,
                author_type="user",
            )
            saved = await self.message_repository.create_message(model_message)
            saved.path = f"{parent.path}.{saved.message_id}"
            added_message = await self.message_repository.update_path(saved.message_id, saved.path)
            if added_message:
                result_dto = [
                    MessageDTO.model_validate(added_message,
                                              from_attributes=True)
                ]
                return result_dto
        return None

    async def validate_all_messages(self, chat_id: int) -> MessageListResponse:
        all_messages = await self.message_repository.get_all_messages(chat_id)
        return MessageListResponse(
            messages=[
                MessageDTO.model_validate(row, from_attributes=True)
                for row in all_messages
            ]
        )

