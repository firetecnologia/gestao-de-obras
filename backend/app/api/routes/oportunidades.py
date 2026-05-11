from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.oportunidade import Oportunidade, HistoricoComercial
from app.models.user import User
from app.schemas.oportunidade import (
    OportunidadeCreate,
    OportunidadeUpdate,
    OportunidadeResponse,
    HistoricoComercialCreate,
    HistoricoComercialResponse,
)
from app.api.deps import get_current_user
from app.services.scoring import calcular_score
from app.services.service_suggestion import sugerir_servicos

router = APIRouter(prefix="/oportunidades", tags=["Oportunidades"])


@router.get("", response_model=list[OportunidadeResponse])
async def list_oportunidades(
    cidade: str | None = None,
    uf: str | None = None,
    prioridade: str | None = None,
    status: str | None = None,
    tipo_obra: str | None = None,
    fase_provavel: str | None = None,
    fonte: str | None = None,
    data_inicio: date | None = None,
    data_fim: date | None = None,
    busca: str | None = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(Oportunidade).where(Oportunidade.ativo == True)
    if cidade:
        query = query.where(Oportunidade.cidade.ilike(f"%{cidade}%"))
    if uf:
        query = query.where(Oportunidade.uf == uf)
    if prioridade:
        query = query.where(Oportunidade.prioridade == prioridade)
    if status:
        query = query.where(Oportunidade.status == status)
    if tipo_obra:
        query = query.where(Oportunidade.tipo_obra == tipo_obra)
    if fase_provavel:
        query = query.where(Oportunidade.fase_provavel == fase_provavel)
    if fonte:
        query = query.where(Oportunidade.fonte.ilike(f"%{fonte}%"))
    if data_inicio:
        query = query.where(Oportunidade.data_encontrada >= data_inicio)
    if data_fim:
        query = query.where(Oportunidade.data_encontrada <= data_fim)
    if busca:
        query = query.where(
            or_(
                Oportunidade.nome_obra.ilike(f"%{busca}%"),
                Oportunidade.resumo.ilike(f"%{busca}%"),
                Oportunidade.contratante.ilike(f"%{busca}%"),
                Oportunidade.orgao_publico.ilike(f"%{busca}%"),
            )
        )
    query = query.order_by(Oportunidade.score.desc(), Oportunidade.data_encontrada.desc())
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/count")
async def count_oportunidades(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    total = await db.scalar(select(func.count(Oportunidade.id)).where(Oportunidade.ativo == True))
    novas = await db.scalar(
        select(func.count(Oportunidade.id)).where(Oportunidade.ativo == True, Oportunidade.status == "novo")
    )
    alta = await db.scalar(
        select(func.count(Oportunidade.id)).where(Oportunidade.ativo == True, Oportunidade.prioridade == "alta")
    )
    return {"total": total or 0, "novas": novas or 0, "alta_prioridade": alta or 0}


@router.get("/{oportunidade_id}", response_model=OportunidadeResponse)
async def get_oportunidade(
    oportunidade_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
):
    result = await db.execute(select(Oportunidade).where(Oportunidade.id == oportunidade_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Oportunidade não encontrada")
    return item


@router.post("", response_model=OportunidadeResponse, status_code=201)
async def create_oportunidade(
    data: OportunidadeCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
):
    item_data = data.model_dump()
    item = Oportunidade(**item_data)

    score_result = await calcular_score(item, db)
    item.score = score_result["score"]
    item.prioridade = score_result["prioridade"]
    item.score_justificativa = score_result["justificativa"]

    servicos = sugerir_servicos(item.nome_obra or "", item.resumo or "", item.texto_original or "")
    if servicos:
        item.servicos_sugeridos = "; ".join(servicos)

    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/{oportunidade_id}", response_model=OportunidadeResponse)
async def update_oportunidade(
    oportunidade_id: int,
    data: OportunidadeUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Oportunidade).where(Oportunidade.id == oportunidade_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Oportunidade não encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    score_result = await calcular_score(item, db)
    item.score = score_result["score"]
    item.prioridade = score_result["prioridade"]
    item.score_justificativa = score_result["justificativa"]

    servicos = sugerir_servicos(item.nome_obra or "", item.resumo or "", item.texto_original or "")
    if servicos:
        item.servicos_sugeridos = "; ".join(servicos)

    await db.commit()
    await db.refresh(item)
    return item


@router.patch("/{oportunidade_id}/status")
async def update_status(
    oportunidade_id: int,
    status: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Oportunidade).where(Oportunidade.id == oportunidade_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Oportunidade não encontrada")
    old_status = item.status
    item.status = status

    historico = HistoricoComercial(
        oportunidade_id=oportunidade_id,
        tipo="status_change",
        descricao=f"Status alterado de '{old_status}' para '{status}'",
        usuario=current_user.nome,
    )
    db.add(historico)
    await db.commit()
    return {"detail": "Status atualizado"}


@router.delete("/{oportunidade_id}")
async def delete_oportunidade(
    oportunidade_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)
):
    result = await db.execute(select(Oportunidade).where(Oportunidade.id == oportunidade_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Oportunidade não encontrada")
    item.ativo = False
    item.status = "descartado"
    await db.commit()
    return {"detail": "Oportunidade descartada"}


@router.post("/{oportunidade_id}/historico", response_model=HistoricoComercialResponse, status_code=201)
async def add_historico(
    oportunidade_id: int,
    data: HistoricoComercialCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Oportunidade).where(Oportunidade.id == oportunidade_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Oportunidade não encontrada")
    historico = HistoricoComercial(**data.model_dump())
    historico.oportunidade_id = oportunidade_id
    db.add(historico)
    await db.commit()
    await db.refresh(historico)
    return historico
