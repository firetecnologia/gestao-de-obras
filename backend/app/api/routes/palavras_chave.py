from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.palavra_chave import PalavraChave
from app.models.user import User
from app.schemas.palavra_chave import PalavraChaveCreate, PalavraChaveUpdate, PalavraChaveResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/palavras-chave", tags=["Palavras-Chave"])


@router.get("", response_model=list[PalavraChaveResponse])
async def list_palavras(
    categoria: str | None = None,
    ativo: bool | None = True,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(PalavraChave)
    if categoria:
        query = query.where(PalavraChave.categoria == categoria)
    if ativo is not None:
        query = query.where(PalavraChave.ativo == ativo)
    query = query.order_by(PalavraChave.categoria, PalavraChave.palavra)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{palavra_id}", response_model=PalavraChaveResponse)
async def get_palavra(palavra_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(PalavraChave).where(PalavraChave.id == palavra_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Palavra-chave não encontrada")
    return item


@router.post("", response_model=PalavraChaveResponse, status_code=201)
async def create_palavra(
    data: PalavraChaveCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
):
    item = PalavraChave(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/{palavra_id}", response_model=PalavraChaveResponse)
async def update_palavra(
    palavra_id: int, data: PalavraChaveUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
):
    result = await db.execute(select(PalavraChave).where(PalavraChave.id == palavra_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Palavra-chave não encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{palavra_id}")
async def delete_palavra(palavra_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(PalavraChave).where(PalavraChave.id == palavra_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Palavra-chave não encontrada")
    item.ativo = False
    await db.commit()
    return {"detail": "Palavra-chave desativada"}
