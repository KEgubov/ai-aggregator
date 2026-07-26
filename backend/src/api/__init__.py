from fastapi import APIRouter

from backend.src.api.send_message import router as send_message_router
from backend.src.api.models_info import router as models_info
from backend.src.api.chat import router as chat_router
from backend.src.api.auth import router as registration_router
from backend.src.api.user import router as user_router

main_router = APIRouter()

main_router.include_router(send_message_router)
main_router.include_router(models_info)
main_router.include_router(registration_router)
main_router.include_router(chat_router)
main_router.include_router(user_router)
