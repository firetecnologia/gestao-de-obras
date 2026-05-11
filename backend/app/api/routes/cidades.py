from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.cidade import Cidade
from app.models.user import User
from app.schemas.cidade import CidadeCreate, CidadeUpdate, CidadeResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/cidades", tags=["Cidades"])


@router.get("", response_model=list[CidadeResponse])
async def list_cidades(
    uf: str | None = None,
    prioridade: str | None = None,
    ativo: bool | None = True,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(Cidade)
    if uf:
        query = query.where(Cidade.uf == uf)
    if prioridade:
        query = query.where(Cidade.prioridade == prioridade)
    if ativo is not None:
        query = query.where(Cidade.ativo == ativo)
    query = query.order_by(Cidade.uf, Cidade.nome)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{cidade_id}", response_model=CidadeResponse)
async def get_cidade(cidade_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Cidade).where(Cidade.id == cidade_id))
    cidade = result.scalar_one_or_none()
    if not cidade:
        raise HTTPException(status_code=404, detail="Cidade não encontrada")
    return cidade


@router.post("", response_model=CidadeResponse, status_code=201)
async def create_cidade(data: CidadeCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    cidade = Cidade(**data.model_dump())
    db.add(cidade)
    await db.commit()
    await db.refresh(cidade)
    return cidade


@router.put("/{cidade_id}", response_model=CidadeResponse)
async def update_cidade(
    cidade_id: int, data: CidadeUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
):
    result = await db.execute(select(Cidade).where(Cidade.id == cidade_id))
    cidade = result.scalar_one_or_none()
    if not cidade:
        raise HTTPException(status_code=404, detail="Cidade não encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cidade, field, value)
    await db.commit()
    await db.refresh(cidade)
    return cidade


@router.delete("/{cidade_id}")
async def delete_cidade(cidade_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Cidade).where(Cidade.id == cidade_id))
    cidade = result.scalar_one_or_none()
    if not cidade:
        raise HTTPException(status_code=404, detail="Cidade não encontrada")
    cidade.ativo = False
    await db.commit()
    return {"detail": "Cidade desativada"}
