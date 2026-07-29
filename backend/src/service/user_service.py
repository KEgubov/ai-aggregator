from backend.src.models.orm_models import User
from backend.src.schemas.custom import CurrentUserDTO, UserProfileDTO
from backend.src.schemas.user_schema import UserAddDTO, UserDTO


class UserService:
    def __init__(self, user_repository):
        self.user_repository = user_repository

    async def user_validate(self, user: UserAddDTO) -> UserDTO | None:
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
        current_user = await self.user_repository.get_current_user_by_id(user_id)
        if current_user:
            result_dto = CurrentUserDTO.model_validate(current_user, from_attributes=True)
            return result_dto
        return None

    async def get_user_profile(self, user_id: int) -> UserProfileDTO | None:
        profile = await self.user_repository.get_current_user_by_id(user_id)
        if profile:
            result_dto = UserProfileDTO.model_validate(profile, from_attributes=True)
            return result_dto
        return None

    async def change_username(self, user_id: int, username: str) -> str:
        new_username = await self.user_repository.update_username(user_id, username)
        return new_username

