from datetime import datetime

from pydantic import BaseModel


class CidadeCreate(BaseModel):
    nome: str
    uf: str
    codigo_ibge: str | None = None
    regiao: str | None = None
    prioridade: str = "media"
    ativo: bool = True


class CidadeUpdate(BaseModel):
    nome: str | None = None
    uf: str | None = None
    codigo_ibge: str | None = None
    regiao: str | None = None
    prioridade: str | None = None
    ativo: bool | None = None


class CidadeResponse(BaseModel):
    id: int
    nome: str
    uf: str
    codigo_ibge: str | None
    regiao: str | None
    prioridade: str
    ativo: bool
    created_at: datetime

    model_config = {"from_attributes": True}
