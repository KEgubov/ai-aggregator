from authx import TokenPayload, AuthX
from fastapi import Request, Depends, HTTPException

from backend.src.schemas.custom import CurrentUserDTO
from backend.src.service.auth_service import AuthService
from backend.src.service.chat_service import ChatService
from backend.src.service.message_service import MessageService
from backend.src.service.model_orchestrator import AIOrchestrator
from backend.src.service.model_service import ModelService
from backend.src.service.user_service import UserService

def get_security(request: Request) -> AuthX:
    return request.app.state.security

async def get_token_payload(
    request: Request,
    security: AuthX = Depends(get_security),
) -> TokenPayload:
    return await security.access_token_required(request)

def get_ai_orchestrator(request: Request) -> AIOrchestrator:
    return AIOrchestrator(
        model_service=request.app.state.model_service,
        gemini_client=request.app.state.gemini_client,
        groq_client=request.app.state.groq_client,
    )

def get_auth_service(request: Request) -> AuthService:
    return request.app.state.auth_service

def get_user_service(request: Request) -> UserService:
    return request.app.state.user_service

def get_model_service(request: Request) -> ModelService:
    return request.app.state.model_service

def get_chat_service(request: Request) -> ChatService:
    return request.app.state.chat_service

def get_message_service(request: Request) -> MessageService:
    return request.app.state.message_service

async def get_current_user(
    payload: TokenPayload = Depends(get_token_payload),
    user_service: UserService = Depends(get_user_service),
) -> CurrentUserDTO:
    user = await user_service.validate_current_user(user_id=int(payload.sub))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
