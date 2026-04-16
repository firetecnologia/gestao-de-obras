from pydantic import BaseModel
from typing import List, Generic, TypeVar

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    pages: int


class MessageResponse(BaseModel):
    message: str


class IDResponse(BaseModel):
    id: str
    message: str = "Criado com sucesso"
