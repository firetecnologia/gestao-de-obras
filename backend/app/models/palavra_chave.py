from datetime import datetime, timezone

from sqlalchemy import String, Boolean, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PalavraChave(Base):
    __tablename__ = "palavras_chave"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    palavra: Mapped[str] = mapped_column(String(200))
    categoria: Mapped[str | None] = mapped_column(String(100), nullable=True)
    peso: Mapped[int] = mapped_column(Integer, default=10)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
