from datetime import datetime, timezone

from sqlalchemy import String, Boolean, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FonteBusca(Base):
    __tablename__ = "fontes_busca"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(300))
    tipo: Mapped[str] = mapped_column(String(50))  # pncp, diario_oficial, prefeitura, portal_transparencia, construtora, incorporadora, noticia, manual
    url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    cidade: Mapped[str | None] = mapped_column(String(200), nullable=True)
    uf: Mapped[str | None] = mapped_column(String(2), nullable=True)
    frequencia: Mapped[str] = mapped_column(String(20), default="manual")  # diaria, semanal, quinzenal, manual
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
