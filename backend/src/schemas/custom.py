from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, EmailStr

from backend.src.schemas.message_schema import MessageDTO


class AIModelNameDTO(BaseModel):
    """Имя модели для вызова внешнего API."""

    model_name: str = Field(max_length=100, description='Model name for API')

class AIModelMetaDTO(BaseModel):
    """Метаданные AI-модели для списка в UI."""

    model_id: int
    model_name: str = Field(max_length=100, description='Model name for API')
    display_name: str = Field(max_length=100, description='Display name for frontend')
    description: str = Field(max_length=20, description='Description model for frontend')

class UserProfileDTO(BaseModel):
    """Профиль пользователя для ответа API."""

    user_id: int
    username: str = Field(max_length=100, description='Имя пользователя')
    email: EmailStr = Field(max_length=255, description="Email")
    about_me: str = Field(max_length=20, description="Краткое описание профиля")
    created_at: Optional[datetime] = Field(description="Дата создания")
    last_seen_at: Optional[datetime] = Field(description="Последняя активность")

class ModelProviderResponse(BaseModel):
    """Связка модель + провайдер для оркестрации генерации."""

    model_name: str
    display_name: str
    provider_name: str

class LoginData(BaseModel):
    """Учётные данные для входа."""

    email: EmailStr
    password: str

class CurrentUserDTO(BaseModel):
    """Минимальные данные текущего авторизованного пользователя."""

    user_id: int

class UserIDDTO(BaseModel):
    """Идентификатор пользователя после успешной аутентификации."""

    user_id: int

class MessageListResponse(BaseModel):
    """Обёртка списка сообщений чата."""

    messages: list[MessageDTO]

class ChatMemberDTO(BaseModel):
    """Участник чата для отображения в шапке."""
    username: str
    about_me: str

class ChatInviteLinkDTO(BaseModel):
    token: str
