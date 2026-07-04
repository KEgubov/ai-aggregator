import datetime
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
    __tablename__ = "users"

    user_id: Mapped[intpk]
    email: Mapped[str_255] = mapped_column(unique=True, nullable=False)
    username: Mapped[str_100] = mapped_column(nullable=False)
    avatar_url: Mapped[Optional[str]]
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=func.now()
    )
    last_seen_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(timezone=True)
    )

    project_memberships = relationship("ProjectMember", back_populates="user")
    messages = relationship("Message", back_populates="author")


class Project(Base):
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
    messages = relationship(
        "Message", back_populates="project", cascade="all, delete-orphan"
    )


class ProjectMember(Base):
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


class AIModel(Base):
    __tablename__ = "ai_models"

    model_id: Mapped[intpk]
    model_name: Mapped[str_20] = mapped_column(nullable=False)
    model_provider: Mapped[str_20] = mapped_column(nullable=False)


class Message(Base):
    __tablename__ = "messages"

    message_id: Mapped[intpk]
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.project_id"), nullable=False
    )
    parent_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("messages.message_id")
    )

    # LTREE path (например: '1.5.23')
    path: Mapped[str] = mapped_column(LtreeType)

    # Контекстный якорь
    context_anchor: Mapped[Optional[str]] = mapped_column(Text)
    context_text_snippet: Mapped[Optional[str]] = mapped_column(Text)

    author_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.user_id"))
    author_type: Mapped[str_20] = mapped_column(nullable=False)  # 'user' | 'ai'

    # AI метаданные
    model_name: Mapped[Optional[str_100]]
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

    project = relationship("Project", back_populates="messages")
    author = relationship("User", back_populates="messages")
    parent: Mapped[Optional["Message"]] = relationship(
        "Message",
        remote_side="Message.message_id",
        back_populates="children",
    )
    children: Mapped[list["Message"]] = relationship(
        "Message",
        back_populates="parent",
    )
