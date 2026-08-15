from authx import AuthX
from fastapi import APIRouter, Depends, HTTPException
from fastapi import Response
from sqlalchemy.ext.asyncio import AsyncSession

from backend.src.api.dependency import (
    get_user_service,
    get_security,
    get_auth_service,
    get_session,
)
from backend.src.schemas.custom import LoginData
from backend.src.schemas.user_schema import UserAddDTO
from backend.src.service.auth_service import AuthService
from backend.src.service.user_service import UserService

router = APIRouter(prefix="/user", tags=["User"])


@router.post("/register")
async def user_register(
    user: UserAddDTO,
    user_service: UserService = Depends(get_user_service),
    session: AsyncSession = Depends(get_session),
):
    """Регистрирует нового пользователя."""
    user_add = await user_service.user_validate(session, user)
    return {"status": "ok", "user": user_add}


@router.post("/login")
async def login(
    creds: LoginData,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
    security: AuthX = Depends(get_security),
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """Аутентифицирует пользователя и выставляет JWT в cookie."""
    user = await auth_service.resp_authenticate_user(session, creds)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect login or password")
    token = security.create_access_token(uid=str(user.user_id))
    response.set_cookie(security.config.JWT_ACCESS_COOKIE_NAME, token)
    return {"access_token": token}


@router.post("/logout")
async def logout(response: Response, security: AuthX = Depends(get_security)):
    """Завершает сессию: удаляет auth-cookie."""
    security.unset_cookies(response)
    return {"status": "ok"}
