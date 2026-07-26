from fastapi import APIRouter, HTTPException
from fastapi.params import Depends

from backend.src.api.dependency import get_current_user, get_user_service
from backend.src.schemas.custom import CurrentUserDTO
from backend.src.service.user_service import UserService

router = APIRouter(prefix="/user", tags=["User"])

@router.get('/profile')
async def get_profile(
    user_service: UserService = Depends(get_user_service),
    current_user: CurrentUserDTO = Depends(get_current_user)
):
    profile = await user_service.get_user_profile(current_user.user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "ok", "profile": profile}