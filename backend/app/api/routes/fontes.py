from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.fonte_busca import FonteBusca
from app.models.user import User
from app.schemas.fonte_busca import FonteBuscaCreate, FonteBuscaUpdate, FonteBuscaResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/fontes", tags=["Fontes de Busca"])


@router.get("", response_model=list[FonteBuscaResponse])
async def list_fontes(
    tipo: str | None = None,
    uf: str | None = None,
    ativo: bool | None = True,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(FonteBusca)
    if tipo:
        query = query.where(FonteBusca.tipo == tipo)
    if uf:
        query = query.where(FonteBusca.uf == uf)
    if ativo is not None:
        query = query.where(FonteBusca.ativo == ativo)
    query = query.order_by(FonteBusca.nome)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{fonte_id}", response_model=FonteBuscaResponse)
async def get_fonte(fonte_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(FonteBusca).where(FonteBusca.id == fonte_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Fonte não encontrada")
    return item


@router.post("", response_model=FonteBuscaResponse, status_code=201)
async def create_fonte(
    data: FonteBuscaCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
):
    item = FonteBusca(**data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/{fonte_id}", response_model=FonteBuscaResponse)
async def update_fonte(
    fonte_id: int, data: FonteBuscaUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
):
    result = await db.execute(select(FonteBusca).where(FonteBusca.id == fonte_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Fonte não encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{fonte_id}")
async def delete_fonte(fonte_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(FonteBusca).where(FonteBusca.id == fonte_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Fonte não encontrada")
    item.ativo = False
    await db.commit()
    return {"detail": "Fonte desativada"}
