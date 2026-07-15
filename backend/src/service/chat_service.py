from backend.src.models.orm_models import Chat
from backend.src.schemas.chat_schema import ChatDTO, ChatAddDTO


class ChatService:
    def __init__(self, chat_repository):
        self.chat_repository = chat_repository

    async def validate_create_chat(self, chat: ChatAddDTO, owner_id: int) -> ChatDTO | None:
        chat_model = Chat(
            name=chat.name,
            description=chat.description,
            owner_id=owner_id,
        )
        added_chat = await self.chat_repository.create_chat(chat_model)
        if added_chat:
            result_dto = ChatDTO.model_validate(added_chat, from_attributes=True)
            return result_dto
        return None

    async def validate_personal_chats_from_user(self, user_id: int) -> list[ChatDTO] | None:
        personal_chats = await self.chat_repository.get_personal_chats_from_user(user_id)
        if personal_chats:
            result_dtos = [
                ChatDTO.model_validate(row, from_attributes=True)
                for row in personal_chats
            ]
            return result_dtos
        return None
