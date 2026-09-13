from fastapi import APIRouter, HTTPException
from fastapi.params import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.api.dependency import get_current_user, get_user_service, get_session
from backend.src.schemas.custom import CurrentUserDTO, UserProfileDTO
from backend.src.schemas.user_schema import UserDTO
from backend.src.service.user_service import UserService

router = APIRouter(prefix="/users", tags=["User"])


@router.get(
    "/profile",
    response_model=UserProfileDTO,
)
async def get_profile(
    user_service: UserService = Depends(get_user_service),
    current_user: CurrentUserDTO = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UserProfileDTO | None:
    """Возвращает профиль текущего авторизованного пользователя."""
    profile = await user_service.get_user_profile(session, current_user.user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return profile


@router.patch(
    "/profile/username",
    response_model=UserDTO,
)
async def change_username(
    username: str,
    user_service: UserService = Depends(get_user_service),
    current_user: CurrentUserDTO = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UserDTO | None:
    """Изменяет имя текущего пользователя."""
    change_name = await user_service.change_username(session, current_user.user_id, username)
    if not change_name:
        raise HTTPException(status_code=404, detail="User not found")
    return change_name
