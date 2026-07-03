from fastapi import APIRouter

from backend.src.api.gemini_chat import router as gemini_router
from backend.src.api.groq_chat import router as groq_router

main_router = APIRouter()

main_router.include_router(gemini_router)
main_router.include_router(groq_router)
