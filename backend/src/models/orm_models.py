import datetime
from decimal import Decimal
from typing import Annotated, Any, Optional

from sqlalchemy import String, ForeignKey, Text, func, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy_utils import LtreeType
from sqlalchemy.orm import DeclarativeBase, mapped_column, Mapped, relationship

intpk = Annotated[int, mapped_column(primary_key=True, autoincrement=True)]

str_20 = Annotated[str, 20]
str_100 = Annotated[str, 100]
str_255 = Annotated[str, 255]


class Base(DeclarativeBase):
    """Базовый declarative-класс для всех ORM-моделей приложения.

    Содержит сопоставление типовых строковых аннотаций (``str_20``, ``str_100``,
    ``str_255``) с типами колонок SQLAlchemy и единую реализацию ``__repr__``
    для удобной отладки и логирования.
    """

    type_annotation_map = {
        str_20: String(20),
        str_100: String(100),
        str_255: String(255),
    }

    def __repr__(self):
        cols = []
        for col in self.__table__.columns.keys():
            cols.append(f"{col}={getattr(self, col)!r}")
        return f"<{self.__class__.__name__}, {', '.join(cols)}>"


class User(Base):
    """Пользователь системы — человек, работающий с проектами и сообщениями.

    Один пользователь может состоять в нескольких проектах (через
    :class:`ProjectMember`) и быть автором множества сообщений
    (:class:`Message`).
    """
    __tablename__ = "users"

    user_id: Mapped[intpk]  # Уникальный идентификатор
    email: Mapped[str_255] = mapped_column(unique=True, nullable=False)  # Логин (уникальный)
    username: Mapped[str_100] = mapped_column(nullable=False)  # Отображаемое имя
    avatar_url: Mapped[Optional[str]]  # Ссылка на аватар
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=func.now()
    )  # Дата регистрации
    last_seen_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(timezone=True)
    )  # Последний раз был в сети

    project_memberships = relationship("ProjectMember", back_populates="user")
    """Членства пользователя в проектах (связь many-to-many через :class:`ProjectMember`)."""

    messages = relationship("Message", back_populates="author")
    """Сообщения, автором которых является этот пользователь."""


class Project(Base):
    """Проект — изолированный контекст чата со своей историей и участниками.

    Каждый проект принадлежит одному владельцу и содержит дерево сообщений.
    Удаление проекта каскадно удаляет участников и сообщения.
    """
    __tablename__ = "projects"

    project_id: Mapped[intpk]  # Уникальный идентификатор
    name: Mapped[str_255] = mapped_column(nullable=False)  # Название проекта
    description: Mapped[Optional[str]] = mapped_column(Text)  # Описание проекта (необязательно)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"))  # Кто создал
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=func.now()
    )  # Дата создания
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )  # Дата обновления

    members = relationship(
        "ProjectMember", back_populates="project", cascade="all, delete-orphan"
    )
    """Участники проекта; при удалении проекта записи членства удаляются каскадно."""

    messages = relationship(
        "Message", back_populates="project", cascade="all, delete-orphan"
    )
    """Все сообщения проекта; при удалении проекта удаляются каскадно."""


class ProjectMember(Base):
    """Связь many-to-many между пользователями и проектами.

    Составной первичный ключ ``(project_id, user_id)`` гарантирует, что один
    пользователь не может быть добавлен в проект дважды.
    """
    __tablename__ = "project_members"

    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.project_id"), primary_key=True
    )  # Какой проект
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), primary_key=True)  # Какой пользователь
    joined_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=func.now()
    )  # Когда присоединился

    project = relationship("Project", back_populates="members")
    """Проект, к которому относится это членство."""

    user = relationship("User", back_populates="project_memberships")
    """Пользователь — участник проекта."""


class AIProviders(Base):
    """Провайдер AI-моделей (Groq, OpenRouter и т.п.).

    Хранит идентификатор и базовый URL API провайдера. Конкретные модели
    и тарифы задаются через :class:`AIProviderModel`.
    """
    __tablename__ = "ai_providers"

    provider_id: Mapped[intpk]  # Уникальный идентификатор
    provider_name: Mapped[str_20] = mapped_column(nullable=False)  # Системное имя (groq, openrouter)
    base_url: Mapped[str_100]  # Базовый URL API


class AIModel(Base):
    """Логическая AI-модель, независимая от конкретного провайдера.

    Одна семья моделей (например, Llama 3.3) может быть доступна у нескольких
    провайдеров через :class:`AIProviderModel`.
    """
    __tablename__ = "ai_models"

    model_id: Mapped[intpk]  # Уникальный идентификатор
    family: Mapped[str_20] = mapped_column(nullable=False)  # Внутреннее название модели
    display_name: Mapped[str_20] = mapped_column(nullable=False)  # Имя в интерфейсе


class AIProviderModel(Base):
    """Конкретная модель у конкретного провайдера с тарифами и возможностями.

    Связывает :class:`AIProviders` и :class:`AIModel` и хранит имя модели
    на стороне API провайдера, цены и флаги поддерживаемых функций.
    """
    __tablename__ = "ai_provider_models"

    provider_model_id: Mapped[intpk]  # Уникальный идентификатор
    provider_id: Mapped[int] = mapped_column(
        ForeignKey("ai_providers.provider_id")
    )  # Провайдер
    model_id: Mapped[int] = mapped_column(
        ForeignKey("ai_models.model_id")
    )  # Логическая модель
    provider_model_name: Mapped[str_100] = mapped_column(nullable=False)  # Имя модели в API провайдера
    input_price: Mapped[Decimal]  # Цена входных токенов
    output_price: Mapped[Decimal]  # Цена выходных токенов
    context_length: Mapped[int]  # Макс. размер контекста (токены)
    supports_stream: Mapped[bool]  # Потоковая генерация
    supports_tools: Mapped[bool]  # Function calling
    supports_vision: Mapped[bool]  # Ввод изображений


class Message(Base):
    """Сообщение в чате проекта — узел дерева диалога.

    Сообщения организованы в иерархию через ``parent_id`` и материализованный
    путь ``path`` (PostgreSQL ``ltree``). Поддерживают текст, структурированный
    JSON-контент, привязку к выделенному фрагменту документа и метаданные
    AI-генерации.
    """
    __tablename__ = "messages"

    message_id: Mapped[intpk]  # Уникальный идентификатор
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.project_id"), nullable=False
    )  # К какому проекту относится
    parent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("messages.message_id")
    )  # Родительское сообщение (None — корень)

    path: Mapped[str] = mapped_column(LtreeType)  # Материализованный путь (ltree)
    # Пример: "1.5.23" означает:
    #   - Корневое сообщение #1
    #     - Его потомок #5
    #       - Его потомок #23

    # Контекстный якорь
    context_anchor: Mapped[Optional[str]] = mapped_column(Text)  # Якорь в документе
    context_text_snippet: Mapped[Optional[str]] = mapped_column(Text)  # Текст, который выделили

    author_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.user_id"))  # Кто написал
    author_type: Mapped[str_20] = mapped_column(nullable=False)  # 'user' | 'ai'

    # AI метаданные
    ai_model: Mapped[Optional[str_100]]  # llama-3, gpt-4
    ai_provider: Mapped[Optional[str_20]]  # groq, openrouter

    content: Mapped[str] = mapped_column(Text, nullable=False)  # Текст сообщения
    content_json: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)  # Структурированный контент
    message_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)  # Токены, стоимость, latency
    position: Mapped[int] = mapped_column(default=0)  # Порядок среди siblings

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=func.now()
    )  # Дата создания
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )  # Дата обновления

    project = relationship("Project", back_populates="messages")
    """Проект, в рамках которого находится сообщение."""

    author = relationship("User", back_populates="messages")
    """Пользователь-автор (если ``author_type`` — ``user``)."""

    parent: Mapped[Optional["Message"]] = relationship(
        "Message",
        remote_side="Message.message_id",
        back_populates="children",
    )
    """Родительское сообщение в дереве диалога."""

    children: Mapped[list["Message"]] = relationship(
        "Message",
        back_populates="parent",
    )
    """Дочерние сообщения — ответы и ветки, растущие от этого узла."""
