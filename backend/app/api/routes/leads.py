from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, Lead, LeadInteraction, Client
from app.schemas.leads import (
    LeadCreate, LeadUpdate, LeadResponse, LeadConvertRequest,
    LeadInteractionCreate, LeadInteractionResponse,
)
from app.schemas.base import PaginatedResponse, MessageResponse

router = APIRouter(prefix="/leads", tags=["CRM / Leads"])


@router.get("", response_model=PaginatedResponse[LeadResponse])
async def list_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    responsible_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Lead).where(Lead.is_deleted.is_(False)).options(
        selectinload(Lead.responsible), selectinload(Lead.interactions)
    )
    count_query = select(func.count()).select_from(Lead).where(Lead.is_deleted.is_(False))

    if search:
        sf = Lead.name.ilike(f"%{search}%") | Lead.email.ilike(f"%{search}%") | Lead.phone.ilike(f"%{search}%")
        query = query.where(sf)
        count_query = count_query.where(sf)
    if status_filter:
        query = query.where(Lead.status == status_filter)
        count_query = count_query.where(Lead.status == status_filter)
    if responsible_id:
        query = query.where(Lead.responsible_id == responsible_id)
        count_query = count_query.where(Lead.responsible_id == responsible_id)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size).order_by(Lead.created_at.desc()))
    leads = result.scalars().all()

    items = []
    for lead_item in leads:
        interactions = []
        for i in (lead_item.interactions or []):
            interactions.append(LeadInteractionResponse(
                id=i.id, lead_id=i.lead_id, type=i.type,
                description=i.description, date=i.date,
                user_id=i.user_id, created_at=i.created_at,
            ))
        items.append(LeadResponse(
            id=lead_item.id, name=lead_item.name, email=lead_item.email, phone=lead_item.phone,
            company=lead_item.company, source=lead_item.source, status=lead_item.status,
            responsible_id=lead_item.responsible_id,
            responsible_name=lead_item.responsible.name if lead_item.responsible else None,
            notes=lead_item.notes, next_followup=lead_item.next_followup,
            client_id=lead_item.client_id, lost_reason=lead_item.lost_reason,
            converted_at=lead_item.converted_at, created_at=lead_item.created_at,
            interactions=interactions,
        ))

    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size if page_size > 0 else 0,
    )


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(data: LeadCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead = Lead(**data.model_dump())
    if not lead.responsible_id:
        lead.responsible_id = current_user.id
    db.add(lead)
    await db.flush()
    await db.refresh(lead)
    return LeadResponse(
        id=lead.id, name=lead.name, email=lead.email, phone=lead.phone,
        company=lead.company, source=lead.source, status=lead.status,
        responsible_id=lead.responsible_id, notes=lead.notes,
        next_followup=lead.next_followup, created_at=lead.created_at,
    )


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.is_deleted.is_(False))
        .options(selectinload(Lead.responsible), selectinload(Lead.interactions))
    )
    lead_item = result.scalar_one_or_none()
    if not lead_item:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    interactions = [LeadInteractionResponse(
        id=i.id, lead_id=i.lead_id, type=i.type,
        description=i.description, date=i.date,
        user_id=i.user_id, created_at=i.created_at,
    ) for i in (lead_item.interactions or [])]
    return LeadResponse(
        id=lead_item.id, name=lead_item.name, email=lead_item.email, phone=lead_item.phone,
        company=lead_item.company, source=lead_item.source, status=lead_item.status,
        responsible_id=lead_item.responsible_id,
        responsible_name=lead_item.responsible.name if lead_item.responsible else None,
        notes=lead_item.notes, next_followup=lead_item.next_followup,
        client_id=lead_item.client_id, lost_reason=lead_item.lost_reason,
        converted_at=lead_item.converted_at, created_at=lead_item.created_at,
        interactions=interactions,
    )


@router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(lead_id: str, data: LeadUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Lead).where(Lead.id == lead_id, Lead.is_deleted.is_(False)))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)
    await db.flush()
    await db.refresh(lead)
    return LeadResponse(
        id=lead.id, name=lead.name, email=lead.email, phone=lead.phone,
        company=lead.company, source=lead.source, status=lead.status,
        responsible_id=lead.responsible_id, notes=lead.notes,
        next_followup=lead.next_followup, created_at=lead.created_at,
    )


@router.delete("/{lead_id}", response_model=MessageResponse)
async def delete_lead(lead_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Lead).where(Lead.id == lead_id, Lead.is_deleted.is_(False)))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    lead.is_deleted = True
    lead.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return MessageResponse(message="Lead removido com sucesso")


@router.post("/{lead_id}/interactions", response_model=LeadInteractionResponse, status_code=status.HTTP_201_CREATED)
async def add_interaction(lead_id: str, data: LeadInteractionCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Lead).where(Lead.id == lead_id, Lead.is_deleted.is_(False)))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    interaction_data = data.model_dump()
    if not interaction_data.get("date"):
        interaction_data["date"] = datetime.now(timezone.utc)
    interaction = LeadInteraction(**interaction_data, lead_id=lead_id, user_id=current_user.id)
    db.add(interaction)
    await db.flush()
    await db.refresh(interaction)
    return LeadInteractionResponse(
        id=interaction.id, lead_id=interaction.lead_id, type=interaction.type,
        description=interaction.description, date=interaction.date,
        user_id=interaction.user_id, created_at=interaction.created_at,
    )


@router.post("/{lead_id}/convert", response_model=MessageResponse)
async def convert_lead(lead_id: str, data: LeadConvertRequest = None, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if data is None:
        data = LeadConvertRequest()
    result = await db.execute(select(Lead).where(Lead.id == lead_id, Lead.is_deleted.is_(False)))
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado")
    if lead.status == "fechado_ganho":
        raise HTTPException(status_code=400, detail="Lead já convertido")

    # Create client from lead (inherit address)
    client = Client(
        name=lead.name,
        email=lead.email,
        phone=lead.phone,
        company_name=lead.company,
        person_type="fisica",
        address_street=lead.address_street,
        address_number=lead.address_number,
        address_complement=lead.address_complement,
        address_neighborhood=lead.address_neighborhood,
        address_city=lead.address_city,
        address_state=lead.address_state,
        address_zip=lead.address_zip,
        created_by=current_user.id,
    )
    db.add(client)
    await db.flush()

    lead.status = "fechado_ganho"
    lead.client_id = client.id
    lead.converted_at = datetime.now(timezone.utc)
    await db.flush()

    return MessageResponse(message=f"Lead convertido em cliente com sucesso. ID do cliente: {client.id}")
