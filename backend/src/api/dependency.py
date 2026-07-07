from fastapi import Request

from backend.src.service.model_orchestrator import AIOrchestrator
from backend.src.service.model_service import ModelService


def get_ai_orchestrator(request: Request) -> AIOrchestrator:
    gemini_client = request.app.state.gemini_client
    groq_client = request.app.state.groq_client

    return AIOrchestrator(
        model_service=ModelService(),
        gemini_client=gemini_client,
        groq_client=groq_client,
    )
