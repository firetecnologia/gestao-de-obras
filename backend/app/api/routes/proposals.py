from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from decimal import Decimal

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, Proposal, ProposalItem, ProposalVersion, Contract
from app.schemas.proposals import (
    ProposalCreate, ProposalUpdate, ProposalResponse,
    ProposalItemCreate, ProposalItemUpdate, ProposalItemResponse,
)
from app.schemas.base import PaginatedResponse, MessageResponse

router = APIRouter(prefix="/proposals", tags=["Orçamentos / Propostas"])


@router.get("", response_model=PaginatedResponse[ProposalResponse])
async def list_proposals(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    client_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Proposal).where(not Proposal.is_deleted).options(
        selectinload(Proposal.items), selectinload(Proposal.versions)
    )
    count_query = select(func.count()).select_from(Proposal).where(not Proposal.is_deleted)

    if search:
        sf = Proposal.title.ilike(f"%{search}%") | Proposal.code.ilike(f"%{search}%")
        query = query.where(sf)
        count_query = count_query.where(sf)
    if status_filter:
        query = query.where(Proposal.status == status_filter)
        count_query = count_query.where(Proposal.status == status_filter)
    if client_id:
        query = query.where(Proposal.client_id == client_id)
        count_query = count_query.where(Proposal.client_id == client_id)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size).order_by(Proposal.created_at.desc()))
    proposals = result.scalars().all()

    return PaginatedResponse(
        items=[ProposalResponse.model_validate(p) for p in proposals],
        total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size if page_size > 0 else 0,
    )


def _calc_item_totals(item: ProposalItem):
    item.total_cost = item.quantity * item.unit_cost
    if item.markup_percent and item.markup_percent > 0:
        item.unit_price = item.unit_cost * (1 + item.markup_percent / 100)
    item.total_price = item.quantity * item.unit_price


def _calc_proposal_totals(proposal: Proposal):
    total_cost = Decimal("0")
    total_price = Decimal("0")
    for item in proposal.items:
        if not item.is_excluded:
            total_cost += item.total_cost or Decimal("0")
            if not item.is_optional:
                total_price += item.total_price or Decimal("0")
    proposal.total_cost = total_cost
    proposal.total_price = total_price - (proposal.discount or Decimal("0"))


@router.post("", response_model=ProposalResponse, status_code=status.HTTP_201_CREATED)
async def create_proposal(data: ProposalCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = (await db.execute(select(func.count()).select_from(Proposal))).scalar() or 0
    code = f"PROP-{count + 1:04d}"

    proposal_data = data.model_dump(exclude={"items"})
    proposal = Proposal(**proposal_data, code=code, created_by=current_user.id)
    db.add(proposal)
    await db.flush()

    for item_data in (data.items or []):
        item = ProposalItem(**item_data.model_dump(), proposal_id=proposal.id)
        _calc_item_totals(item)
        db.add(item)

    await db.flush()
    result = await db.execute(
        select(Proposal).where(Proposal.id == proposal.id)
        .options(selectinload(Proposal.items), selectinload(Proposal.versions))
    )
    proposal = result.scalar_one()
    _calc_proposal_totals(proposal)
    await db.flush()
    await db.refresh(proposal)
    return ProposalResponse.model_validate(proposal)


@router.get("/{proposal_id}", response_model=ProposalResponse)
async def get_proposal(proposal_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Proposal).where(Proposal.id == proposal_id, not Proposal.is_deleted)
        .options(selectinload(Proposal.items), selectinload(Proposal.versions))
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    return ProposalResponse.model_validate(proposal)


@router.put("/{proposal_id}", response_model=ProposalResponse)
async def update_proposal(proposal_id: str, data: ProposalUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Proposal).where(Proposal.id == proposal_id, not Proposal.is_deleted)
        .options(selectinload(Proposal.items), selectinload(Proposal.versions))
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(proposal, field, value)
    _calc_proposal_totals(proposal)
    await db.flush()
    await db.refresh(proposal)
    return ProposalResponse.model_validate(proposal)


@router.delete("/{proposal_id}", response_model=MessageResponse)
async def delete_proposal(proposal_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import datetime, timezone
    result = await db.execute(select(Proposal).where(Proposal.id == proposal_id, not Proposal.is_deleted))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    proposal.is_deleted = True
    proposal.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return MessageResponse(message="Proposta removida com sucesso")


# ==================== ITEMS ====================

@router.post("/{proposal_id}/items", response_model=ProposalItemResponse, status_code=status.HTTP_201_CREATED)
async def add_item(proposal_id: str, data: ProposalItemCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Proposal).where(Proposal.id == proposal_id, not Proposal.is_deleted).options(selectinload(Proposal.items)))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    item = ProposalItem(**data.model_dump(), proposal_id=proposal_id)
    _calc_item_totals(item)
    db.add(item)
    await db.flush()
    _calc_proposal_totals(proposal)
    await db.flush()
    await db.refresh(item)
    return ProposalItemResponse.model_validate(item)


@router.put("/{proposal_id}/items/{item_id}", response_model=ProposalItemResponse)
async def update_item(proposal_id: str, item_id: str, data: ProposalItemUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ProposalItem).where(ProposalItem.id == item_id, ProposalItem.proposal_id == proposal_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    _calc_item_totals(item)
    await db.flush()

    # Recalculate proposal totals
    result = await db.execute(select(Proposal).where(Proposal.id == proposal_id).options(selectinload(Proposal.items)))
    proposal = result.scalar_one()
    _calc_proposal_totals(proposal)
    await db.flush()
    await db.refresh(item)
    return ProposalItemResponse.model_validate(item)


@router.delete("/{proposal_id}/items/{item_id}", response_model=MessageResponse)
async def delete_item(proposal_id: str, item_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ProposalItem).where(ProposalItem.id == item_id, ProposalItem.proposal_id == proposal_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    await db.delete(item)
    await db.flush()

    result = await db.execute(select(Proposal).where(Proposal.id == proposal_id).options(selectinload(Proposal.items)))
    proposal = result.scalar_one()
    _calc_proposal_totals(proposal)
    await db.flush()
    return MessageResponse(message="Item removido com sucesso")


# ==================== VERSION SNAPSHOT ====================

@router.post("/{proposal_id}/versions", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_version(proposal_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    import json
    result = await db.execute(
        select(Proposal).where(Proposal.id == proposal_id, not Proposal.is_deleted)
        .options(selectinload(Proposal.items), selectinload(Proposal.versions))
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")

    version_number = len(proposal.versions) + 1
    snapshot = {
        "title": proposal.title,
        "total_cost": str(proposal.total_cost),
        "total_price": str(proposal.total_price),
        "items": [{"description": i.description, "quantity": str(i.quantity), "unit_price": str(i.unit_price), "total_price": str(i.total_price)} for i in proposal.items],
    }
    version = ProposalVersion(
        proposal_id=proposal_id,
        version_number=version_number,
        data_snapshot=json.dumps(snapshot),
        created_by=current_user.id,
    )
    db.add(version)
    await db.flush()
    return MessageResponse(message=f"Versão {version_number} criada com sucesso")


# ==================== APPROVE & GENERATE CONTRACT ====================

@router.post("/{proposal_id}/approve", response_model=MessageResponse)
async def approve_proposal(proposal_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import datetime, timezone
    result = await db.execute(
        select(Proposal).where(Proposal.id == proposal_id, not Proposal.is_deleted)
        .options(selectinload(Proposal.items))
    )
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")

    proposal.status = "aprovada"
    proposal.approved_at = datetime.now(timezone.utc)
    proposal.approved_by = current_user.id
    await db.flush()
    return MessageResponse(message="Proposta aprovada com sucesso")


@router.post("/{proposal_id}/generate-contract", response_model=MessageResponse)
async def generate_contract(proposal_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Proposal).where(Proposal.id == proposal_id, not Proposal.is_deleted))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta não encontrada")
    if proposal.status != "aprovada":
        raise HTTPException(status_code=400, detail="Proposta precisa estar aprovada para gerar contrato")

    count = (await db.execute(select(func.count()).select_from(Contract))).scalar() or 0
    code = f"CTR-{count + 1:04d}"

    contract = Contract(
        code=code,
        proposal_id=proposal.id,
        client_id=proposal.client_id,
        title=f"Contrato - {proposal.title}",
        scope_summary=proposal.description,
        total_value=proposal.total_price or Decimal("0"),
        created_by=current_user.id,
    )
    db.add(contract)
    await db.flush()
    return MessageResponse(message=f"Contrato {code} gerado com sucesso. ID: {contract.id}")
