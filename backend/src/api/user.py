from fastapi import APIRouter, HTTPException
from fastapi.params import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.api.dependency import get_current_user, get_user_service, get_session
from backend.src.schemas.custom import CurrentUserDTO
from backend.src.service.user_service import UserService

router = APIRouter(prefix="/user", tags=["User"])


@router.get("/profile")
async def get_profile(
    user_service: UserService = Depends(get_user_service),
    current_user: CurrentUserDTO = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Возвращает профиль текущего авторизованного пользователя."""
    profile = await user_service.get_user_profile(session, current_user.user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "ok", "profile": profile}


@router.put("/profile/username/change")
async def change_username(
    username: str,
    user_service: UserService = Depends(get_user_service),
    current_user: CurrentUserDTO = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Изменяет имя текущего пользователя."""
    change_name = await user_service.change_username(current_user.user_id, username)
    if not change_name:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "ok", "change_name": change_name}
