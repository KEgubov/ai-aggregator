import logging

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from backend.src.api.dependency import get_ai_orchestrator, get_current_user
from backend.src.schemas.custom import CurrentUserDTO
from backend.src.service.model_orchestrator import AIOrchestrator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/message", tags=["chat"])


@router.get("/send")
async def stream_message(
    model_id: int,
    text: str,
    orchestrator: AIOrchestrator = Depends(get_ai_orchestrator),
    current_user: CurrentUserDTO = Depends(get_current_user)
) -> StreamingResponse:
    return StreamingResponse(
        orchestrator.orchestrate_generation(model_id=model_id, text=text),
        media_type="text/plain; charset=utf-8",
    )
