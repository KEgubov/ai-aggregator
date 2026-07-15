import logging

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from backend.src.api.dependency import get_ai_orchestrator, get_current_user, \
    get_model_service
from backend.src.schemas.custom import CurrentUserDTO
from backend.src.service.model_orchestrator import AIOrchestrator
from backend.src.service.model_service import ModelService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/message", tags=["Message"])


@router.get("/send", response_model=None)
async def stream_message(
    chat_id: int,
    model_id: int,
    text: str,
    orchestrator: AIOrchestrator = Depends(get_ai_orchestrator),
    model_service: ModelService = Depends(get_model_service),
    current_user: CurrentUserDTO = Depends(get_current_user),
) -> StreamingResponse:
    linked_model = await model_service.link_model(
        chat_id, model_id, current_user.user_id
    )
    if not linked_model:
        logger.warning(f"Model with id {model_id} not linked")
    return StreamingResponse(
        orchestrator.orchestrate_generation(model_id=model_id, text=text),
        media_type="text/plain; charset=utf-8",
    )
