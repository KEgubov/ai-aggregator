from fastapi import APIRouter

from backend.src.api.send_gemini import router as gemini_router
from backend.src.api.send_groq import router as groq_router
from backend.src.api.models_info import router as models_info
from backend.src.api.chat import router as chat_router

main_router = APIRouter()

main_router.include_router(gemini_router)
main_router.include_router(groq_router)
main_router.include_router(models_info)
