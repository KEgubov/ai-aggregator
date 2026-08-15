"""ORM-модели приложения AI Aggregator.

Архитектура чатов
-----------------
Два независимых типа чатов без связи между собой:

* **Chat** (``chats``) — личный чат вне проекта. Владелец — ``owner_id``,
  участники — через :class:`ChatMember`.
  Сообщения хранятся в :class:`ChatMessage` (``chat_messages``).
* **ProjectChat** (``project_chats``) — чат внутри проекта. Проект доступен
  через ``ProjectMember`` → :class:`Project`. Участники конкретного чата —
  через :class:`ProjectChatMember`. Прямого ``owner_id`` у проектного чата нет.

Таблицы сообщений разделены: личные и проектные сообщения не смешиваются.
"""

import datetime
from decimal import Decimal
from typing import Annotated, Any, Optional

from sqlalchemy import String, ForeignKey, Text, func, DateTime, Numeric, Boolean
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import DeclarativeBase, mapped_column, Mapped, relationship
from sqlalchemy_utils import LtreeType

intpk = Annotated[int, mapped_column(primary_key=True, autoincrement=True)]

str_20 = Annotated[str, 20]
str_100 = Annotated[str, 100]
str_255 = Annotated[str, 255]


class Base(DeclarativeBase):
    """Базовый declarative-класс для всех ORM-моделей приложения."""

    type_annotation_map = {
        str_20: String(20),
        str_100: String(100),
        str_255: String(255),
        Decimal: Numeric(),
        bool: Boolean(),
    }

    def __repr__(self) -> str:
        """Краткое строковое представление модели со всеми колонками."""
        cols = []
        for col in self.__table__.columns.keys():
            cols.append(f"{col}={getattr(self, col)!r}")
        return f"<{self.__class__.__name__}, {', '.join(cols)}>"


class User(Base):
    """Пользователь системы.

    Связь с чатами различается по типу:

    * личные чаты (:class:`Chat`) — владение через ``owned_personal_chats``,
      участие через ``chat_memberships`` → :class:`ChatMember`;
    * проектные чаты (:class:`ProjectChat`) — через ``project_memberships``
      → :class:`Project`; участие в чате — через ``project_chat_memberships``
      → :class:`ProjectChatMember`.

    Attributes:
        user_id: Первичный ключ.
        email: Уникальный адрес электронной почты (логин).
        username: Отображаемое имя.
        about_me: Краткое описание профиля (до 20 символов).
        avatar_url: URL аватара, необязательно.
        created_at: Дата регистрации.
        last_seen_at: Время последней активности, необязательно.
    """

    __tablename__ = "users"

    user_id: Mapped[intpk]
    email: Mapped[str_255] = mapped_column(unique=True, nullable=False)
    password: Mapped[str_255] = mapped_column(nullable=False)
    username: Mapped[str_100]
    about_me: Mapped[str_20] = mapped_column(nullable=False)
    avatar_url: Mapped[Optional[str]]
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=func.now()
    )
    last_seen_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(timezone=True)
    )

    project_memberships = relationship("ProjectMember", back_populates="user")
    chat_memberships = relationship("ChatMember", back_populates="user")
    project_chat_memberships = relationship("ProjectChatMember", back_populates="user")
    chat_messages = relationship("ChatMessage", back_populates="author")
    project_chat_messages = relationship("ProjectChatMessage", back_populates="author")

    owned_projects = relationship(
        "Project", back_populates="owner", foreign_keys="Project.owner_id"
    )
    owned_personal_chats = relationship(
        "Chat", back_populates="owner", foreign_keys="Chat.owner_id"
    )


class Project(Base):
    """Проект — изолированное рабочее пространство.

    Через проект пользователи получают доступ к проектным чатам
    (:class:`ProjectChat`). Личные чаты (:class:`Chat`) с проектом
    не связаны.

    Attributes:
        project_id: Первичный ключ.
        name: Название проекта.
        description: Развёрнутое описание, необязательно.
        owner_id: Создатель и владелец проекта.
        created_at: Дата создания.
        updated_at: Дата последнего изменения.
    """

    __tablename__ = "projects"

    project_id: Mapped[intpk]
    name: Mapped[str_255] = mapped_column(nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"))
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )

    members = relationship(
        "ProjectMember", back_populates="project", cascade="all, delete-orphan"
    )
    project_chats = relationship(
        "ProjectChat", back_populates="project", cascade="all, delete-orphan"
    )
    owner = relationship(
        "User", back_populates="owned_projects", foreign_keys=[owner_id]
    )


class Chat(Base):
    """Личный чат вне проекта.

    Не имеет ``project_id`` и не связан с :class:`ProjectChat`.
    Владелец — ``owner_id``; участники — через :class:`ChatMember`.

    Attributes:
        chat_id: Первичный ключ.
        name: Название чата.
        description: Описание, необязательно.
        owner_id: Создатель чата.
        ai_models: Список имён AI-моделей, доступных в чате.
        created_at: Дата создания.
        updated_at: Дата последнего изменения.
    """

    __tablename__ = "chats"

    chat_id: Mapped[intpk]
    name: Mapped[str_255] = mapped_column(nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    ai_models: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), default=list)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )

    owner = relationship(
        "User", back_populates="owned_personal_chats", foreign_keys=[owner_id]
    )
    members = relationship(
        "ChatMember", back_populates="chat", cascade="all, delete-orphan"
    )
    messages = relationship(
        "ChatMessage",
        back_populates="chat",
        cascade="all, delete-orphan",
    )

    invite_links = relationship(
        "ChatInviteLink", back_populates="chat", cascade="all, delete-orphan"
    )


class ProjectChat(Base):
    """Чат внутри проекта.

    Принадлежит одному :class:`Project`. Участники чата — через
    :class:`ProjectChatMember`. Членство в проекте (:class:`ProjectMember`) —
    обязательное условие (проверяется на уровне приложения). Поля
    ``owner_id`` нет. С личными чатами (:class:`Chat`) не пересекается.

    Attributes:
        chat_id: Первичный ключ (отдельная последовательность от ``chats.chat_id``).
        project_id: Родительский проект.
        name: Название чата.
        description: Описание, необязательно.
        ai_models: Список имён AI-моделей, доступных в чате.
        created_at: Дата создания.
        updated_at: Дата последнего изменения.
    """

    __tablename__ = "project_chats"

    chat_id: Mapped[intpk]
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.project_id"), nullable=False
    )
    name: Mapped[str_255] = mapped_column(nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    ai_models: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )

    project = relationship("Project", back_populates="project_chats")
    members = relationship(
        "ProjectChatMember", back_populates="chat", cascade="all, delete-orphan"
    )
    messages = relationship(
        "ProjectChatMessage",
        back_populates="chat",
        cascade="all, delete-orphan",
    )


class ChatMember(Base):
    """Участник личного чата.

    Связывает :class:`User` и :class:`Chat`. К проектным чатам
    (:class:`ProjectChat`) не применяется.

    Attributes:
        chat_id: Личный чат (FK → ``chats.chat_id``).
        user_id: Участник.
        joined_at: Дата присоединения.
    """

    __tablename__ = "chat_members"

    chat_id: Mapped[int] = mapped_column(ForeignKey("chats.chat_id"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), primary_key=True)
    joined_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=func.now()
    )
    is_owner: Mapped[bool] = mapped_column(default=False, nullable=False)

    chat = relationship("Chat", back_populates="members")
    user = relationship("User", back_populates="chat_memberships")


class ProjectChatMember(Base):
    """Участник проектного чата.

    Связывает :class:`User` и :class:`ProjectChat`. К личным чатам
    (:class:`Chat`) не применяется. Пользователь должен быть участником
    проекта (:class:`ProjectMember`) — это обеспечивается на уровне
    приложения, не FK.

    Attributes:
        chat_id: Проектный чат (FK → ``project_chats.chat_id``).
        user_id: Участник.
        joined_at: Дата присоединения.
    """

    __tablename__ = "project_chat_members"

    chat_id: Mapped[int] = mapped_column(
        ForeignKey("project_chats.chat_id"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), primary_key=True)
    joined_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=func.now()
    )

    chat = relationship("ProjectChat", back_populates="members")
    user = relationship("User", back_populates="project_chat_memberships")


class ProjectMember(Base):
    """Участник проекта.

    Даёт доступ к проекту. Участие в конкретном проектном чате
    оформляется отдельно через :class:`ProjectChatMember`.

    Attributes:
        project_id: Проект.
        user_id: Участник.
        joined_at: Дата присоединения.
    """

    __tablename__ = "project_members"

    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.project_id"), primary_key=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), primary_key=True)
    joined_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=func.now()
    )

    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="project_memberships")


class AIProviders(Base):
    """Провайдер AI-моделей (OpenAI, Google, Groq и т.д.).

    Note:
        Имя класса во множественном числе — историческое; одна запись
        описывает одного провайдера.

    Attributes:
        provider_id: Первичный ключ.
        provider_name: Короткое имя провайдера.
        base_url: Базовый URL API провайдера.
    """

    __tablename__ = "ai_providers"

    provider_id: Mapped[intpk]
    provider_name: Mapped[str_20] = mapped_column(nullable=False)
    base_url: Mapped[str_100] = mapped_column(nullable=False)

    provider_models = relationship("AIProviderModel", back_populates="provider")


class AIModel(Base):
    """Логическая AI-модель в каталоге (независимо от провайдера).

    Один и тот же семейство моделей может быть представлен у разных
    провайдеров через :class:`AIProviderModel`.

    Attributes:
        model_id: Первичный ключ.
        model_name: Внутреннее имя модели.
        family: Семейство моделей (например, ``gpt``, ``gemini``).
        display_name: Имя для отображения в UI.
        description: Краткое описание (до 20 символов).
    """

    __tablename__ = "ai_models"

    model_id: Mapped[intpk]
    model_name: Mapped[str_100] = mapped_column(nullable=False)
    family: Mapped[str_20] = mapped_column(nullable=False)
    display_name: Mapped[str_100] = mapped_column(nullable=False)
    description: Mapped[str_20] = mapped_column(nullable=False)

    provider_models = relationship("AIProviderModel", back_populates="model")


class AIProviderModel(Base):
    """Конкретная модель у конкретного провайдера с тарифами и возможностями.

    Связывает :class:`AIProviders` и :class:`AIModel`, хранит цены
    и флаги поддерживаемых функций.

    Attributes:
        provider_model_id: Первичный ключ.
        provider_id: Провайдер.
        model_id: Логическая модель из каталога.
        provider_model_name: Имя модели в API провайдера.
        input_price: Цена за единицу входных токенов.
        output_price: Цена за единицу выходных токенов.
        context_length: Максимальный размер контекста.
        supports_stream: Поддержка потоковой генерации.
        supports_tools: Поддержка вызова инструментов.
        supports_vision: Поддержка изображений.
    """

    __tablename__ = "ai_provider_models"

    provider_model_id: Mapped[intpk]
    provider_id: Mapped[int] = mapped_column(
        ForeignKey("ai_providers.provider_id"), nullable=False
    )
    model_id: Mapped[int] = mapped_column(
        ForeignKey("ai_models.model_id"), nullable=False
    )
    provider_model_name: Mapped[str_100] = mapped_column(nullable=False)
    input_price: Mapped[Decimal] = mapped_column(nullable=False)
    output_price: Mapped[Decimal] = mapped_column(nullable=False)
    context_length: Mapped[int] = mapped_column(nullable=False)
    supports_stream: Mapped[bool] = mapped_column(nullable=False)
    supports_tools: Mapped[bool] = mapped_column(nullable=False)
    supports_vision: Mapped[bool] = mapped_column(nullable=False)

    provider = relationship("AIProviders", back_populates="provider_models")
    model = relationship("AIModel", back_populates="provider_models")


class ChatMessage(Base):
    """Сообщение в личном чате (:class:`Chat`).

    Хранится в таблице ``chat_messages``. Не связано с
    :class:`ProjectChatMessage`.

    Attributes:
        message_id: Первичный ключ.
        chat_id: Личный чат-владелец.
        parent_id: Родительское сообщение в дереве веток.
        path: Путь в дереве (``ltree``), например ``1.5.23``.
        context_anchor: Якорь контекста для ветвления.
        context_text_snippet: Фрагмент текста контекста.
        author_id: Автор (пользователь), необязательно для AI-сообщений.
        author_type: Тип автора (``user``, ``assistant`` и т.д.).
        ai_model: Имя модели на момент генерации.
        ai_provider: Имя провайдера на момент генерации.
        content: Текст сообщения.
        content_json: Структурированное содержимое (JSONB).
        message_metadata: Произвольные метаданные (JSONB).
        position: Порядковый номер среди siblings.
        created_at: Дата создания.
        updated_at: Дата последнего изменения.
    """

    __tablename__ = "chat_messages"

    message_id: Mapped[intpk]
    chat_id: Mapped[int] = mapped_column(ForeignKey("chats.chat_id"), nullable=False)
    parent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("chat_messages.message_id")
    )

    path: Mapped[Optional[str]] = mapped_column(LtreeType)

    context_anchor: Mapped[Optional[str]] = mapped_column(Text)
    context_text_snippet: Mapped[Optional[str]] = mapped_column(Text)

    author_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.user_id"))
    author_type: Mapped[str_20] = mapped_column(nullable=False)

    ai_model: Mapped[Optional[str_100]]
    ai_provider: Mapped[Optional[str_20]]

    content: Mapped[Optional[str]] = mapped_column(Text)
    content_json: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)
    message_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    position: Mapped[int] = mapped_column(default=0)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )

    chat = relationship("Chat", back_populates="messages")
    author = relationship("User", back_populates="chat_messages")

    parent: Mapped[Optional["ChatMessage"]] = relationship(
        "ChatMessage",
        remote_side="ChatMessage.message_id",
        back_populates="children",
    )
    children: Mapped[list["ChatMessage"]] = relationship(
        "ChatMessage",
        back_populates="parent",
    )


class ProjectChatMessage(Base):
    """Сообщение в проектном чате (:class:`ProjectChat`).

    Хранится в таблице ``project_chat_messages``. Не связано с
    :class:`ChatMessage`.

    Attributes:
        message_id: Первичный ключ.
        chat_id: Проектный чат-владелец.
        parent_id: Родительское сообщение в дереве веток.
        path: Путь в дереве (``ltree``), например ``1.5.23``.
        context_anchor: Якорь контекста для ветвления.
        context_text_snippet: Фрагмент текста контекста.
        author_id: Автор (пользователь), необязательно для AI-сообщений.
        author_type: Тип автора (``user``, ``assistant`` и т.д.).
        ai_model: Имя модели на момент генерации.
        ai_provider: Имя провайдера на момент генерации.
        content: Текст сообщения.
        content_json: Структурированное содержимое (JSONB).
        message_metadata: Произвольные метаданные (JSONB).
        position: Порядковый номер среди siblings.
        created_at: Дата создания.
        updated_at: Дата последнего изменения.
    """

    __tablename__ = "project_chat_messages"

    message_id: Mapped[intpk]
    chat_id: Mapped[int] = mapped_column(
        ForeignKey("project_chats.chat_id"), nullable=False
    )
    parent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("project_chat_messages.message_id")
    )

    path: Mapped[Optional[str]] = mapped_column(LtreeType)

    context_anchor: Mapped[Optional[str]] = mapped_column(Text)
    context_text_snippet: Mapped[Optional[str]] = mapped_column(Text)

    author_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.user_id"))
    author_type: Mapped[str_20] = mapped_column(nullable=False)

    ai_model: Mapped[Optional[str_100]]
    ai_provider: Mapped[Optional[str_20]]

    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_json: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB)
    message_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    position: Mapped[int] = mapped_column(default=0)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )

    chat = relationship("ProjectChat", back_populates="messages")
    author = relationship("User", back_populates="project_chat_messages")

    parent: Mapped[Optional["ProjectChatMessage"]] = relationship(
        "ProjectChatMessage",
        remote_side="ProjectChatMessage.message_id",
        back_populates="children",
    )
    children: Mapped[list["ProjectChatMessage"]] = relationship(
        "ProjectChatMessage",
        back_populates="parent",
    )


class ChatInviteLink(Base):
    __tablename__ = "chat_invite_links"

    invite_id: Mapped[intpk]
    token: Mapped[str_255] = mapped_column(
        unique=True, nullable=False
    )  # то, что попадает в URL: /join/<token>
    chat_id: Mapped[int] = mapped_column(ForeignKey("chats.chat_id"), nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=func.now()
    )
    expires_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(timezone=True)
    )  # None = без срока

    is_revoked: Mapped[bool] = mapped_column(default=False)  # владелец отозвал ссылку
    max_uses: Mapped[Optional[int]]
    uses_count: Mapped[int] = mapped_column(
        default=0
    )  # сколько раз уже зашли по ссылке

    chat = relationship("Chat", back_populates="invite_links")
    creator = relationship("User")
