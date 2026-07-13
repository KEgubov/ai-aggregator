from authx import AuthX
from fastapi import APIRouter, Depends, HTTPException
from fastapi import Response

from backend.src.api.dependency import get_user_service, get_security, get_auth_service
from backend.src.schemas.custom import LoginData
from backend.src.schemas.user_schema import UserAddDTO
from backend.src.service.auth_service import AuthService
from backend.src.service.user_service import UserService

router = APIRouter(prefix="/user", tags=["User"])


@router.post("/register")
async def user_register(
    user: UserAddDTO, user_service: UserService = Depends(get_user_service)
):
    user_add = await user_service.user_validate(user)
    return {"status": "ok", "user": user_add}


@router.post("/login")
async def login(
    creds: LoginData,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
    security: AuthX = Depends(get_security),
) -> dict[str, str]:
    user = await auth_service.resp_authenticate_user(creds)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect login or password")
    token = security.create_access_token(uid=str(user.user_id))
    response.set_cookie(security.config.JWT_ACCESS_COOKIE_NAME, token)
    return {"access_token": token}
