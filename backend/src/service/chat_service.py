import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.utils.redis_keys import RedisKeys
from backend.src.models.orm_models import Chat, ChatMember, ChatInviteLink
from backend.src.schemas.chat_schema import ChatDTO
from backend.src.schemas.custom import ChatMemberDTO, ChatTokenDTO
from backend.src.service.exceptions import NotFoundError, ForbiddenError


class ChatService:
    """Бизнес-логика личных чатов: создание, список, удаление."""

    def __init__(self, chat_repository, redis_client):
        self.chat_repository = chat_repository
        self.redis_client = redis_client

    async def validate_create_chat(
        self, session: AsyncSession, owner_id: int
    ) -> ChatDTO | None:
        """Создаёт чат и добавляет владельца в участники."""
        name_chat = "Новый чат"
        chat_model = Chat(
            name=name_chat,
            description=None,
            owner_id=owner_id,
        )
        added_chat = await self.chat_repository.create_chat(session, chat_model)
        chat_member = ChatMember(
            chat_id=added_chat.chat_id,
            user_id=owner_id,
            is_owner=True,
        )
        create_member = await self.chat_repository.added_user_in_members(
            session, chat_member
        )
        await self.redis_client.delete_key(RedisKeys.all_chats(user_id=owner_id))
        if create_member and added_chat:
            result_dto = ChatDTO.model_validate(added_chat, from_attributes=True)
            return result_dto
        return None

    async def validate_personal_chats_from_user(
        self, session: AsyncSession, user_id: int
    ) -> list[ChatDTO] | None:
        """Возвращает личные чаты пользователя в виде списка DTO."""
        cached_chats = await self.redis_client.get(RedisKeys.all_chats(user_id))
        if cached_chats:
            return [ChatDTO.model_validate(c) for c in cached_chats]
        personal_chats = await self.chat_repository.get_personal_chats_from_user(
            session, user_id
        )
        if personal_chats:
            result_dto = [
                ChatDTO.model_validate(row, from_attributes=True)
                for row in personal_chats
            ]
            chats_for_cache = [chat.model_dump(mode="json") for chat in result_dto]
            await self.redis_client.set(RedisKeys.all_chats(user_id), chats_for_cache)
            return result_dto
        return None

    async def response_delete_chat(
        self, session: AsyncSession, chat_id: int, user_id: int
    ) -> bool:
        """Удаляет чат владельца; True при успехе, False если чат не найден."""
        member_id = await self.chat_repository.get_chat_member_ids(session, chat_id)
        response = await self.chat_repository.delete_chat_in_db(
            session, chat_id, user_id
        )
        if not response:
            return False
        for uid in member_id:
            await self.redis_client.delete_key(RedisKeys.all_chats(uid))
        return True

    async def validate_chat_members(
        self, session: AsyncSession, chat_id: int
    ) -> list[ChatMemberDTO] | None:
        """Возвращает участников чата; None если участников нет."""
        chat_members = await self.chat_repository.get_chat_members(session, chat_id)
        if chat_members:
            return [
                ChatMemberDTO.model_validate(row, from_attributes=True)
                for row in chat_members
            ]
        return None

    async def generate_invite_link(
        self, session: AsyncSession, chat_id: int, user_id: int
    ) -> ChatTokenDTO | None:
        response = await self.chat_repository.user_in_chat_member(
            session, chat_id, user_id
        )
        if not response:
            raise NotFoundError(message="User not found")
        my_uuid = uuid.uuid4()
        link_model = ChatInviteLink(
            token=str(my_uuid),
            chat_id=chat_id,
            created_by=user_id,
        )
        link = await self.chat_repository.add_link_in_db(session, link_model)
        if link:
            result_dto = ChatTokenDTO.model_validate(link, from_attributes=True)
            return result_dto
        return None

    async def join_chat(self, session: AsyncSession, user_id: int, token: str):
        invite = await self.chat_repository.find_invite_link(session, token)
        if not invite:
            raise NotFoundError(message="Invite not found")
        response = await self.chat_repository.user_in_chat_member(
            session, invite.chat_id, user_id
        )
        if response:
            model_chat = await self.chat_repository.get_chat_by_id(
                session, invite.chat_id
            )
            if model_chat:
                result_dto = ChatDTO.model_validate(model_chat, from_attributes=True)
                return result_dto
        member_model = ChatMember(
            chat_id=invite.chat_id,
            user_id=user_id,
        )
        member_dto = await self.chat_repository.added_user_in_members(
            session, member_model
        )
        if member_dto:
            await self.redis_client.delete_key(RedisKeys.all_chats(user_id))
            invite.uses_count += 1
            await self.chat_repository.update_invite_link(
                session, token, invite.uses_count
            )
            model_chat = await self.chat_repository.get_chat_by_id(
                session, invite.chat_id
            )
            if model_chat:
                result_dto = ChatDTO.model_validate(model_chat, from_attributes=True)
                return result_dto
        return None

    async def preview_invite(self, session: AsyncSession, token: str, user_id: int) -> dict:
        invite = await self.chat_repository.find_invite_link(session, token)
        if not invite:
            raise NotFoundError(message="Invite not found")
        chat = await self.chat_repository.get_chat_by_id(session, invite.chat_id)
        if not chat:
            raise NotFoundError(message="Chat not found")
        already_member = await self.chat_repository.user_in_chat_member(
            session, invite.chat_id, user_id
        )
        return {
            "name": chat.name,
            "description": chat.description,
            "already_member": already_member is not None,
        }

    async def rename_chat(
        self, session: AsyncSession, user_id: int, chat_id: int, name: str
    ) -> ChatDTO | None:
        is_owner = await self.chat_repository.is_owner_chat(session, user_id, chat_id)
        if is_owner is False:
            raise ForbiddenError(message="Only the chat owner can rename this chat")
        renamed_chat = await self.chat_repository.rename_chat_in_db(
            session, chat_id, name
        )
        if renamed_chat:
            member_id = await self.chat_repository.get_chat_member_ids(session, chat_id)
            for uid in member_id:
                await self.redis_client.delete_key(RedisKeys.all_chats(uid))
            result_dto = ChatDTO.model_validate(renamed_chat, from_attributes=True)
            return result_dto
        return None
