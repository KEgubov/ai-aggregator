import logging
from contextlib import asynccontextmanager

from authx import AuthX
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.src.api import main_router
from backend.src.api.exception_handler import duplicate_error_handler, not_found_error_handler
from backend.src.clients.gemini_client import GeminiClient
from backend.src.clients.groq_client import GroqClient
from backend.src.clients.redis_client import redis_client
from backend.src.configs.auth_config import authx_settings
from backend.src.core.logger import setup_logging
from backend.src.repository.auth_repository import AuthRepository
from backend.src.repository.chat_repository import ChatRepository
from backend.src.repository.message_repository import MessageRepository
from backend.src.repository.models_repository import ModelRepository
from backend.src.repository.user_repository import UserRepository
from backend.src.service.auth_service import AuthService
from backend.src.service.chat_service import ChatService
from backend.src.service.exceptions import DuplicateError, NotFoundError
from backend.src.service.message_service import MessageService
from backend.src.service.model_service import ModelService
from backend.src.service.user_service import UserService

setup_logging("AI Aggregator")

logger = logging.getLogger("app")

async def init_security(app: FastAPI):
    """Инициализация безопасности"""
    app.state.security = AuthX(config=authx_settings.config)

async def init_services(app: FastAPI):
    """Инициализация бизнес-сервисов"""
    app.state.auth_service = AuthService(
        auth_repository=AuthRepository(),
    )
    app.state.user_service = UserService(
        user_repository=UserRepository(),
        redis_client=redis_client
    )
    app.state.model_service = ModelService(
        model_repository=ModelRepository(),
    )
    app.state.chat_service = ChatService(
        chat_repository=ChatRepository(),
        redis_client=redis_client
    )
    app.state.message_service = MessageService(
        message_repository=MessageRepository()
    )

async def init_clients(app: FastAPI):
    """Инициализация внешних клиентов"""
    app.state.gemini_client = GeminiClient()
    app.state.groq_client = GroqClient()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Жизненный цикл приложения: инициализация зависимостей при старте."""
    await init_security(app)
    await init_services(app)
    await init_clients(app)
    await redis_client.connect()
    yield
    await redis_client.disconnect()


app = FastAPI(title="AI Aggregator", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(main_router)

app.add_exception_handler(DuplicateError, duplicate_error_handler)
app.add_exception_handler(NotFoundError, not_found_error_handler)

