from datetime import datetime, timezone

from sqlalchemy import String, Boolean, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Construtora(Base):
    __tablename__ = "construtoras"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(300))
    cnpj: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cidade: Mapped[str | None] = mapped_column(String(200), nullable=True)
    uf: Mapped[str | None] = mapped_column(String(2), nullable=True)
    site: Mapped[str | None] = mapped_column(String(500), nullable=True)
    instagram: Mapped[str | None] = mapped_column(String(200), nullable=True)
    telefone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    responsavel: Mapped[str | None] = mapped_column(String(200), nullable=True)
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    relacionamento: Mapped[str] = mapped_column(String(20), default="desconhecido")
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
