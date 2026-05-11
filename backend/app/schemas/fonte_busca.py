from datetime import datetime

from pydantic import BaseModel


class FonteBuscaCreate(BaseModel):
    nome: str
    tipo: str
    url: str | None = None
    cidade: str | None = None
    uf: str | None = None
    frequencia: str = "manual"
    observacoes: str | None = None
    ativo: bool = True


class FonteBuscaUpdate(BaseModel):
    nome: str | None = None
    tipo: str | None = None
    url: str | None = None
    cidade: str | None = None
    uf: str | None = None
    frequencia: str | None = None
    observacoes: str | None = None
    ativo: bool | None = None


class FonteBuscaResponse(BaseModel):
    id: int
    nome: str
    tipo: str
    url: str | None
    cidade: str | None
    uf: str | None
    frequencia: str
    observacoes: str | None
    ativo: bool
    created_at: datetime

    model_config = {"from_attributes": True}
