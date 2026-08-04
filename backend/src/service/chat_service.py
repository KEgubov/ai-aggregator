import asyncio
import uuid

from backend.src.models.orm_models import Chat, ChatMember, ChatInviteLink
from backend.src.repository.chat_repository import ChatRepository
from backend.src.schemas.chat_schema import ChatDTO, ChatAddDTO
from backend.src.schemas.custom import ChatMemberDTO, ChatInviteLinkDTO
from backend.src.service.exceptions import NotFoundError


class ChatService:
    """Бизнес-логика личных чатов: создание, список, удаление."""

    def __init__(self, chat_repository):
        self.chat_repository = chat_repository

    async def validate_create_chat(
        self, chat: ChatAddDTO, owner_id: int
    ) -> ChatDTO | None:
        """Создаёт чат и добавляет владельца в участники."""
        chat_model = Chat(
            name=chat.name,
            description=chat.description,
            owner_id=owner_id,
        )
        added_chat = await self.chat_repository.create_chat(chat_model)
        chat_member = ChatMember(
            chat_id=added_chat.chat_id,
            user_id=owner_id,
        )
        create_member = await self.chat_repository.added_user_in_members(chat_member)
        if create_member and added_chat:
            result_dto = ChatDTO.model_validate(added_chat, from_attributes=True)
            return result_dto
        return None

    async def validate_personal_chats_from_user(
        self, user_id: int
    ) -> list[ChatDTO] | None:
        """Возвращает личные чаты пользователя в виде списка DTO."""
        personal_chats = await self.chat_repository.get_personal_chats_from_user(
            user_id
        )
        if personal_chats:
            result_dtos = [
                ChatDTO.model_validate(row, from_attributes=True)
                for row in personal_chats
            ]
            return result_dtos
        return None

    async def response_delete_chat(self, chat_id: int, user_id: int) -> bool:
        """Удаляет чат владельца; True при успехе, False если чат не найден."""
        response = await self.chat_repository.delete_chat_in_db(chat_id, user_id)
        if not response:
            return False
        return True

    async def validate_chat_members(self, chat_id: int) -> list[ChatMemberDTO] | None:
        """Возвращает участников чата; None если участников нет."""
        chat_members = await self.chat_repository.get_chat_members(chat_id)
        if chat_members:
            return [
                ChatMemberDTO.model_validate(row, from_attributes=True)
                for row in chat_members
            ]
        return None

    async def generate_invite_link(self, chat_id: int, user_id: int) -> ChatInviteLinkDTO | None:
        response = await self.chat_repository.user_in_chat_member(chat_id, user_id)
        if response is False:
            raise NotFoundError(message="User not found")
        my_uuid = uuid.uuid4()
        link_model = ChatInviteLink(
            token=str(my_uuid),
            chat_id=chat_id,
            created_by=user_id,
        )
        link = await self.chat_repository.add_link_in_db(link_model)
        if link:
            result_dto = ChatInviteLinkDTO.model_validate(link, from_attributes=True)
            return result_dto
        return None
