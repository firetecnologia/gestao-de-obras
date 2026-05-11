from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.construtora import Construtora
from app.models.user import User
from app.schemas.construtora import ConstrutoraCreate, ConstrutoraUpdate, ConstrutoraResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/construtoras", tags=["Construtoras"])


@router.get("", response_model=list[ConstrutoraResponse])
async def list_construtoras(
    uf: str | None = None,
    relacionamento: str | None = None,
    ativo: bool | None = True,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(Construtora)
    if uf:
        query = query.where(Construtora.uf == uf)
    if relacionamento:
        query = query.where(Construtora.relacionamento == relacionamento)
    if ativo is not None:
        query = query.where(Construtora.ativo == ativo)
    query = query.order_by(Construtora.nome)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{construtora_id}", response_model=ConstrutoraResponse)
async def get_construtora(
    construtora_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
):
    result = await db.execute(select(Construtora).where(Construtora.id == construtora_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Construtora não encontrada")
    return item


@router.post("", response_model=ConstrutoraResponse, status_code=201)
async def create_construtora(
    data: ConstrutoraCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
):
    item = Construtora(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/{construtora_id}", response_model=ConstrutoraResponse)
async def update_construtora(
    construtora_id: int,
    data: ConstrutoraUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Construtora).where(Construtora.id == construtora_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Construtora não encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{construtora_id}")
async def delete_construtora(
    construtora_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
):
    result = await db.execute(select(Construtora).where(Construtora.id == construtora_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Construtora não encontrada")
    item.ativo = False
    await db.commit()
    return {"detail": "Construtora desativada"}
