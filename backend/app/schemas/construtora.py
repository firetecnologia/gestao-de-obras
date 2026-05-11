from datetime import datetime

from pydantic import BaseModel


class ConstrutoraCreate(BaseModel):
    nome: str
    cnpj: str | None = None
    cidade: str | None = None
    uf: str | None = None
    site: str | None = None
    instagram: str | None = None
    telefone: str | None = None
    email: str | None = None
    responsavel: str | None = None
    observacoes: str | None = None
    relacionamento: str = "desconhecido"
    ativo: bool = True


class ConstrutoraUpdate(BaseModel):
    nome: str | None = None
    cnpj: str | None = None
    cidade: str | None = None
    uf: str | None = None
    site: str | None = None
    instagram: str | None = None
    telefone: str | None = None
    email: str | None = None
    responsavel: str | None = None
    observacoes: str | None = None
    relacionamento: str | None = None
    ativo: bool | None = None


class ConstrutoraResponse(BaseModel):
    id: int
    nome: str
    cnpj: str | None
    cidade: str | None
    uf: str | None
    site: str | None
    instagram: str | None
    telefone: str | None
    email: str | None
    responsavel: str | None
    observacoes: str | None
    relacionamento: str
    ativo: bool
    created_at: datetime

    model_config = {"from_attributes": True}
