from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, EmailStr

from backend.src.schemas.message_schema import MessageDTO


class AIModelNameDTO(BaseModel):
    model_name: str = Field(max_length=100, description='Model name for API')

class AIModelMetaDTO(BaseModel):
    model_id: int
    model_name: str = Field(max_length=100, description='Model name for API')
    display_name: str = Field(max_length=100, description='Display name for frontend')
    description: str = Field(max_length=20, description='Description model for frontend')

class UserProfileDTO(BaseModel):
    user_id: int
    username: str = Field(max_length=100, description='Имя пользователя')
    email: EmailStr = Field(max_length=255, description="Email")
    about_me: str = Field(max_length=20, description="Краткое описание профиля")
    created_at: Optional[datetime] = Field(description="Дата создания")
    last_seen_at: Optional[datetime] = Field(description="Последняя активность")

class ModelProviderResponse(BaseModel):
    model_name: str
    display_name: str
    provider_name: str

class LoginData(BaseModel):
    email: EmailStr
    password: str

class CurrentUserDTO(BaseModel):
    user_id: int

class UserIDDTO(BaseModel):
    user_id: int

class MessageListResponse(BaseModel):
    messages: list[MessageDTO]