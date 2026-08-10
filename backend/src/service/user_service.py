from backend.src.core.redis_keys import RedisKeys
from backend.src.models.orm_models import User
from backend.src.schemas.custom import CurrentUserDTO, UserProfileDTO
from backend.src.schemas.user_schema import UserAddDTO, UserDTO


class UserService:
    """Бизнес-логика пользователей: регистрация, профиль, смена имени."""

    def __init__(self, user_repository, redis_client):
        self.user_repository = user_repository
        self.redis_client = redis_client

    async def user_validate(self, user: UserAddDTO) -> UserDTO | None:
        """Регистрирует пользователя; username берётся из локальной части email."""
        username = user.email.split("@", 1)[0]
        model_user = User(
            email=user.email,
            password=user.password,
            username=username,
            about_me=user.about_me,
        )
        added_user = await self.user_repository.create_user_in_db(model_user)
        if added_user:
            result_dto = UserDTO.model_validate(added_user, from_attributes=True)
            return result_dto
        return None

    async def validate_current_user(self, user_id: int) -> CurrentUserDTO | None:
        """Возвращает DTO текущего пользователя по id или None."""
        current_user = await self.user_repository.get_current_user_by_id(user_id)
        if current_user:
            result_dto = CurrentUserDTO.model_validate(current_user, from_attributes=True)
            return result_dto
        return None

    async def get_user_profile(self, user_id: int) -> UserProfileDTO | None:
        """Возвращает профиль пользователя по id или None."""
        cached_user_profile = await self.redis_client.get(RedisKeys.profile(user_id))
        if cached_user_profile:
            return UserProfileDTO.model_validate(cached_user_profile)
        profile = await self.user_repository.get_current_user_by_id(user_id)
        if profile:
            result_dto = UserProfileDTO.model_validate(profile, from_attributes=True)
            profile_for_cache = result_dto.model_dump(mode="json")
            await self.redis_client.set(RedisKeys.profile(user_id), profile_for_cache)
            return result_dto
        return None

    async def change_username(self, user_id: int, username: str) -> str:
        """Обновляет username пользователя и возвращает новое значение."""
        new_username = await self.user_repository.update_username(user_id, username)
        await self.redis_client.delete_key(RedisKeys.profile(user_id))
        return new_username
