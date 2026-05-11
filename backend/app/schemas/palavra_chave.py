from datetime import datetime

from pydantic import BaseModel


class PalavraChaveCreate(BaseModel):
    palavra: str
    categoria: str | None = None
    peso: int = 10
    ativo: bool = True


class PalavraChaveUpdate(BaseModel):
    palavra: str | None = None
    categoria: str | None = None
    peso: int | None = None
    ativo: bool | None = None


class PalavraChaveResponse(BaseModel):
    id: int
    palavra: str
    categoria: str | None
    peso: int
    ativo: bool
    created_at: datetime

    model_config = {"from_attributes": True}
