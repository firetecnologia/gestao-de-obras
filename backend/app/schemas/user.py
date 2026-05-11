from datetime import datetime

from pydantic import BaseModel


class UserCreate(BaseModel):
    nome: str
    email: str
    senha: str
    perfil: str = "comercial"


class UserUpdate(BaseModel):
    nome: str | None = None
    email: str | None = None
    perfil: str | None = None
    ativo: bool | None = None


class UserResponse(BaseModel):
    id: int
    nome: str
    email: str
    perfil: str
    ativo: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: str
    senha: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
