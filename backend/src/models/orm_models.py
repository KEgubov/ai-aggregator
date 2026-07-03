from typing import Annotated

from sqlalchemy import String, CheckConstraint, ForeignKey
from sqlalchemy.orm import DeclarativeBase, mapped_column, Mapped

intpk = Annotated[int, mapped_column(primary_key=True, autoincrement=True)]

str_3 = Annotated[str, 3]
str_5 = Annotated[str, 5]
str_12 = Annotated[str, 12]
str_20 = Annotated[str, 20]
str_16 = Annotated[str, 16]
str_45 = Annotated[str, 45]
str_50 = Annotated[str, 50]
str_100 = Annotated[str, 100]

class Base(DeclarativeBase):
    type_annotation_map = {
        str_3: String(3),
        str_5: String(5),
        str_12: String(12),
        str_16: String(16),
        str_20: String(20),
        str_45: String(45),
        str_50: String(50),
        str_100: String(100),
    }

    def __repr__(self):
        cols = []
        for col in self.__table__.columns.keys():
            cols.append(f"{col}={getattr(self, col)!r}")
        return f"<{self.__class__.__name__}, {', '.join(cols)}>"

class User(Base):
    __tablename__ = "users"

    user_id: Mapped[intpk]
    first_name: Mapped[str_20]
    last_name: Mapped[str_20]
    balance: Mapped[int] = mapped_column(default=0)

    __table_args__ = (
        CheckConstraint("balance >= 0", name="balance_check"),
    )

class Chats(Base):
    __tablename__ = "chats"

    chat_id: Mapped[intpk]
    

class Models(Base):
    __tablename__ = "models"

    model_id: Mapped[intpk]
    model_name: Mapped[str_20]

class TargetsModel(Base):
    __tablename__ = "targets"

    target_id: Mapped[intpk]
    model_id: Mapped[int] = mapped_column(ForeignKey("models.model_id"))


