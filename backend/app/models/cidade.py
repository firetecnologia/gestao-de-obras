from datetime import datetime, timezone

from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Cidade(Base):
    __tablename__ = "cidades"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(200))
    uf: Mapped[str] = mapped_column(String(2))
    codigo_ibge: Mapped[str | None] = mapped_column(String(20), nullable=True)
    regiao: Mapped[str | None] = mapped_column(String(100), nullable=True)
    prioridade: Mapped[str] = mapped_column(String(10), default="media")  # alta, media, baixa
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
