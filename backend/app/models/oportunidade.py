from datetime import datetime, timezone, date

from sqlalchemy import String, Boolean, Text, DateTime, Date, Float, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Oportunidade(Base):
    __tablename__ = "oportunidades"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nome_obra: Mapped[str] = mapped_column(String(500))
    resumo: Mapped[str | None] = mapped_column(Text, nullable=True)
    cidade: Mapped[str | None] = mapped_column(String(200), nullable=True)
    uf: Mapped[str | None] = mapped_column(String(2), nullable=True)
    endereco: Mapped[str | None] = mapped_column(String(500), nullable=True)
    construtora: Mapped[str | None] = mapped_column(String(300), nullable=True)
    incorporadora: Mapped[str | None] = mapped_column(String(300), nullable=True)
    contratante: Mapped[str | None] = mapped_column(String(300), nullable=True)
    orgao_publico: Mapped[str | None] = mapped_column(String(300), nullable=True)
    tipo_obra: Mapped[str | None] = mapped_column(String(50), nullable=True)
    fase_provavel: Mapped[str | None] = mapped_column(String(30), nullable=True)
    origem_informacao: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fonte: Mapped[str | None] = mapped_column(String(200), nullable=True)
    link_fonte: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    numero_controle_pncp: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    data_publicacao: Mapped[date | None] = mapped_column(Date, nullable=True)
    data_encontrada: Mapped[date] = mapped_column(Date, default=lambda: datetime.now(timezone.utc).date())
    valor_estimado: Mapped[float | None] = mapped_column(Float, nullable=True)
    prazo_previsto: Mapped[str | None] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="novo")
    prioridade: Mapped[str] = mapped_column(String(10), default="media")
    score: Mapped[int] = mapped_column(Integer, default=0)
    score_justificativa: Mapped[str | None] = mapped_column(Text, nullable=True)
    servicos_sugeridos: Mapped[str | None] = mapped_column(Text, nullable=True)
    proxima_acao: Mapped[str | None] = mapped_column(Text, nullable=True)
    responsavel_interno: Mapped[str | None] = mapped_column(String(200), nullable=True)
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    texto_original: Mapped[str | None] = mapped_column(Text, nullable=True)

    construtora_id: Mapped[int | None] = mapped_column(ForeignKey("construtoras.id"), nullable=True)
    fonte_busca_id: Mapped[int | None] = mapped_column(ForeignKey("fontes_busca.id"), nullable=True)

    construtora_rel = relationship("Construtora", foreign_keys=[construtora_id], lazy="selectin")
    fonte_busca_rel = relationship("FonteBusca", foreign_keys=[fonte_busca_id], lazy="selectin")
    historico = relationship("HistoricoComercial", back_populates="oportunidade", lazy="selectin", order_by="HistoricoComercial.created_at.desc()")

    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class HistoricoComercial(Base):
    __tablename__ = "historico_comercial"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    oportunidade_id: Mapped[int] = mapped_column(ForeignKey("oportunidades.id"))
    tipo: Mapped[str] = mapped_column(String(50))  # contato, proposta, follow_up, observacao, status_change
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    pessoa_contatada: Mapped[str | None] = mapped_column(String(200), nullable=True)
    telefone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    resposta: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_proximo_followup: Mapped[date | None] = mapped_column(Date, nullable=True)
    valor_proposta: Mapped[float | None] = mapped_column(Float, nullable=True)
    usuario: Mapped[str | None] = mapped_column(String(200), nullable=True)

    oportunidade = relationship("Oportunidade", back_populates="historico")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
