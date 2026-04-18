from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from typing import Optional
from decimal import Decimal

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import (
    User, Proposal,
    ServiceCatalog, MaterialCatalog, CompositionCatalog, CompositionItem,
    ProposalHeader, ProposalMaterialItem, ProposalServiceItem,
    ProposalAdditiveItem, ProposalRoom, ProposalCommercialTerms,
)
from app.schemas.budget import (
    ServiceCatalogCreate, ServiceCatalogUpdate, ServiceCatalogResponse,
    MaterialCatalogCreate, MaterialCatalogUpdate, MaterialCatalogResponse,
    CompositionCatalogCreate, CompositionCatalogUpdate, CompositionCatalogResponse,
    CompositionItemCreate, CompositionItemResponse,
    ProposalHeaderCreate, ProposalHeaderUpdate, ProposalHeaderResponse,
    ProposalMaterialItemCreate, ProposalMaterialItemUpdate, ProposalMaterialItemResponse,
    ProposalServiceItemCreate, ProposalServiceItemUpdate, ProposalServiceItemResponse,
    ProposalAdditiveItemCreate, ProposalAdditiveItemUpdate, ProposalAdditiveItemResponse,
    ProposalRoomCreate, ProposalRoomUpdate, ProposalRoomResponse,
    ProposalCommercialTermsCreate, ProposalCommercialTermsUpdate, ProposalCommercialTermsResponse,
    BudgetSummaryResponse,
)
from app.schemas.base import PaginatedResponse, MessageResponse

router = APIRouter(tags=["Orcamento / Budget"])


# ==================== HELPER: calc item totals ====================

def _calc_material_totals(item: ProposalMaterialItem):
    item.total_cost = (item.quantity or Decimal("0")) * (item.unit_cost or Decimal("0"))
    item.total_price = (item.quantity or Decimal("0")) * (item.unit_price or Decimal("0"))


def _calc_service_totals(item: ProposalServiceItem):
    item.total_cost = (item.quantity or Decimal("0")) * (item.unit_cost or Decimal("0"))
    item.total_price = (item.quantity or Decimal("0")) * (item.unit_price or Decimal("0"))


def _calc_additive_totals(item: ProposalAdditiveItem):
    item.total_cost = (item.quantity or Decimal("0")) * (item.unit_cost or Decimal("0"))
    item.total_price = (item.quantity or Decimal("0")) * (item.unit_price or Decimal("0"))


def _calc_room_dimensions(room: ProposalRoom):
    w = room.width or Decimal("0")
    l = room.length or Decimal("0")
    h = room.height or Decimal("0")
    room.perimeter = 2 * (w + l) if w and l else None
    room.area = w * l if w and l else None
    room.wall_area = room.perimeter * h if room.perimeter and h else None


# ==================== SERVICE CATALOG ====================

service_catalog_router = APIRouter(prefix="/catalog/services", tags=["Catalogo de Servicos"])


@service_catalog_router.get("", response_model=PaginatedResponse[ServiceCatalogResponse])
async def list_services(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    stage: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(ServiceCatalog).where(ServiceCatalog.is_deleted.is_(False))
    count_query = select(func.count()).select_from(ServiceCatalog).where(ServiceCatalog.is_deleted.is_(False))

    if search:
        sf = ServiceCatalog.description.ilike(f"%{search}%") | ServiceCatalog.code.ilike(f"%{search}%")
        query = query.where(sf)
        count_query = count_query.where(sf)
    if stage:
        query = query.where(ServiceCatalog.stage == stage)
        count_query = count_query.where(ServiceCatalog.stage == stage)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size).order_by(ServiceCatalog.stage, ServiceCatalog.sub_stage))
    items = result.scalars().all()
    return PaginatedResponse(
        items=[ServiceCatalogResponse.model_validate(i) for i in items],
        total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size if page_size > 0 else 0,
    )


@service_catalog_router.get("/{item_id}", response_model=ServiceCatalogResponse)
async def get_service(item_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ServiceCatalog).where(ServiceCatalog.id == item_id, ServiceCatalog.is_deleted.is_(False)))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Servico nao encontrado")
    return ServiceCatalogResponse.model_validate(item)


@service_catalog_router.post("", response_model=ServiceCatalogResponse, status_code=status.HTTP_201_CREATED)
async def create_service(data: ServiceCatalogCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = ServiceCatalog(**data.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return ServiceCatalogResponse.model_validate(item)


@service_catalog_router.put("/{item_id}", response_model=ServiceCatalogResponse)
async def update_service(item_id: str, data: ServiceCatalogUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ServiceCatalog).where(ServiceCatalog.id == item_id, ServiceCatalog.is_deleted.is_(False)))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Servico nao encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.flush()
    await db.refresh(item)
    return ServiceCatalogResponse.model_validate(item)


@service_catalog_router.delete("/{item_id}", response_model=MessageResponse)
async def delete_service(item_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import datetime, timezone
    result = await db.execute(select(ServiceCatalog).where(ServiceCatalog.id == item_id, ServiceCatalog.is_deleted.is_(False)))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Servico nao encontrado")
    item.is_deleted = True
    item.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return MessageResponse(message="Servico removido com sucesso")


# ==================== MATERIAL CATALOG ====================

material_catalog_router = APIRouter(prefix="/catalog/materials", tags=["Catalogo de Materiais"])


@material_catalog_router.get("", response_model=PaginatedResponse[MaterialCatalogResponse])
async def list_materials(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(MaterialCatalog).where(MaterialCatalog.is_deleted.is_(False))
    count_query = select(func.count()).select_from(MaterialCatalog).where(MaterialCatalog.is_deleted.is_(False))

    if search:
        sf = MaterialCatalog.name.ilike(f"%{search}%") | MaterialCatalog.code.ilike(f"%{search}%")
        query = query.where(sf)
        count_query = count_query.where(sf)
    if category:
        query = query.where(MaterialCatalog.category == category)
        count_query = count_query.where(MaterialCatalog.category == category)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size).order_by(MaterialCatalog.name))
    items = result.scalars().all()
    return PaginatedResponse(
        items=[MaterialCatalogResponse.model_validate(i) for i in items],
        total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size if page_size > 0 else 0,
    )


@material_catalog_router.get("/{item_id}", response_model=MaterialCatalogResponse)
async def get_material(item_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(MaterialCatalog).where(MaterialCatalog.id == item_id, MaterialCatalog.is_deleted.is_(False)))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Material nao encontrado")
    return MaterialCatalogResponse.model_validate(item)


@material_catalog_router.post("", response_model=MaterialCatalogResponse, status_code=status.HTTP_201_CREATED)
async def create_material(data: MaterialCatalogCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = MaterialCatalog(**data.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return MaterialCatalogResponse.model_validate(item)


@material_catalog_router.put("/{item_id}", response_model=MaterialCatalogResponse)
async def update_material(item_id: str, data: MaterialCatalogUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(MaterialCatalog).where(MaterialCatalog.id == item_id, MaterialCatalog.is_deleted.is_(False)))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Material nao encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.flush()
    await db.refresh(item)
    return MaterialCatalogResponse.model_validate(item)


@material_catalog_router.delete("/{item_id}", response_model=MessageResponse)
async def delete_material(item_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import datetime, timezone
    result = await db.execute(select(MaterialCatalog).where(MaterialCatalog.id == item_id, MaterialCatalog.is_deleted.is_(False)))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Material nao encontrado")
    item.is_deleted = True
    item.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return MessageResponse(message="Material removido com sucesso")


# ==================== COMPOSITION CATALOG ====================

composition_catalog_router = APIRouter(prefix="/catalog/compositions", tags=["Catalogo de Composicoes"])


@composition_catalog_router.get("", response_model=PaginatedResponse[CompositionCatalogResponse])
async def list_compositions(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(CompositionCatalog).where(CompositionCatalog.is_deleted.is_(False)).options(selectinload(CompositionCatalog.items))
    count_query = select(func.count()).select_from(CompositionCatalog).where(CompositionCatalog.is_deleted.is_(False))

    if search:
        sf = CompositionCatalog.name.ilike(f"%{search}%")
        query = query.where(sf)
        count_query = count_query.where(sf)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size).order_by(CompositionCatalog.name))
    items = result.scalars().all()
    return PaginatedResponse(
        items=[CompositionCatalogResponse.model_validate(i) for i in items],
        total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size if page_size > 0 else 0,
    )


@composition_catalog_router.post("", response_model=CompositionCatalogResponse, status_code=status.HTTP_201_CREATED)
async def create_composition(data: CompositionCatalogCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    comp_data = data.model_dump(exclude={"items"})
    comp = CompositionCatalog(**comp_data)
    db.add(comp)
    await db.flush()

    for item_data in (data.items or []):
        ci = CompositionItem(**item_data.model_dump(), composition_id=comp.id)
        ci.total_cost = ci.coefficient * ci.unit_cost
        ci.total_price = ci.coefficient * ci.unit_price
        db.add(ci)

    await db.flush()
    result = await db.execute(select(CompositionCatalog).where(CompositionCatalog.id == comp.id).options(selectinload(CompositionCatalog.items)))
    comp = result.scalar_one()
    # Recalc totals
    comp.total_cost = sum((i.total_cost or Decimal("0")) for i in comp.items)
    comp.total_price = sum((i.total_price or Decimal("0")) for i in comp.items)
    await db.flush()
    await db.refresh(comp)
    return CompositionCatalogResponse.model_validate(comp)


@composition_catalog_router.delete("/{comp_id}", response_model=MessageResponse)
async def delete_composition(comp_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import datetime, timezone
    result = await db.execute(select(CompositionCatalog).where(CompositionCatalog.id == comp_id, CompositionCatalog.is_deleted.is_(False)))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Composicao nao encontrada")
    item.is_deleted = True
    item.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return MessageResponse(message="Composicao removida com sucesso")


# ==================== PROPOSAL BUDGET ENDPOINTS ====================

budget_router = APIRouter(prefix="/proposals/{proposal_id}/budget", tags=["Orcamento da Proposta"])


async def _get_proposal(proposal_id: str, db: AsyncSession) -> Proposal:
    result = await db.execute(select(Proposal).where(Proposal.id == proposal_id, Proposal.is_deleted.is_(False)))
    proposal = result.scalar_one_or_none()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposta nao encontrada")
    return proposal


# ---------- HEADER ----------

@budget_router.get("/header", response_model=ProposalHeaderResponse)
async def get_header(proposal_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_proposal(proposal_id, db)
    result = await db.execute(select(ProposalHeader).where(ProposalHeader.proposal_id == proposal_id))
    header = result.scalar_one_or_none()
    if not header:
        try:
            header = ProposalHeader(proposal_id=proposal_id)
            db.add(header)
            await db.flush()
            await db.refresh(header)
        except IntegrityError:
            await db.rollback()
            result = await db.execute(select(ProposalHeader).where(ProposalHeader.proposal_id == proposal_id))
            header = result.scalar_one()
    return ProposalHeaderResponse.model_validate(header)


@budget_router.put("/header", response_model=ProposalHeaderResponse)
async def upsert_header(proposal_id: str, data: ProposalHeaderUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_proposal(proposal_id, db)
    result = await db.execute(select(ProposalHeader).where(ProposalHeader.proposal_id == proposal_id))
    header = result.scalar_one_or_none()
    if not header:
        header = ProposalHeader(proposal_id=proposal_id, **data.model_dump(exclude_unset=True))
        db.add(header)
    else:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(header, field, value)
    await db.flush()
    await db.refresh(header)
    return ProposalHeaderResponse.model_validate(header)


# ---------- MATERIALS ----------

@budget_router.get("/materials", response_model=list[ProposalMaterialItemResponse])
async def list_materials_for_proposal(proposal_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_proposal(proposal_id, db)
    result = await db.execute(
        select(ProposalMaterialItem).where(ProposalMaterialItem.proposal_id == proposal_id)
        .order_by(ProposalMaterialItem.sort_order, ProposalMaterialItem.created_at)
    )
    return [ProposalMaterialItemResponse.model_validate(i) for i in result.scalars().all()]


@budget_router.post("/materials", response_model=ProposalMaterialItemResponse, status_code=status.HTTP_201_CREATED)
async def add_material(proposal_id: str, data: ProposalMaterialItemCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_proposal(proposal_id, db)
    item = ProposalMaterialItem(**data.model_dump(), proposal_id=proposal_id)
    _calc_material_totals(item)
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return ProposalMaterialItemResponse.model_validate(item)


@budget_router.put("/materials/{item_id}", response_model=ProposalMaterialItemResponse)
async def update_material_item(proposal_id: str, item_id: str, data: ProposalMaterialItemUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ProposalMaterialItem).where(ProposalMaterialItem.id == item_id, ProposalMaterialItem.proposal_id == proposal_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item nao encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    _calc_material_totals(item)
    await db.flush()
    await db.refresh(item)
    return ProposalMaterialItemResponse.model_validate(item)


@budget_router.delete("/materials/{item_id}", response_model=MessageResponse)
async def delete_material_item(proposal_id: str, item_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ProposalMaterialItem).where(ProposalMaterialItem.id == item_id, ProposalMaterialItem.proposal_id == proposal_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item nao encontrado")
    await db.delete(item)
    await db.flush()
    return MessageResponse(message="Material removido")


# ---------- SERVICES ----------

@budget_router.get("/services", response_model=list[ProposalServiceItemResponse])
async def list_services_for_proposal(proposal_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_proposal(proposal_id, db)
    result = await db.execute(
        select(ProposalServiceItem).where(ProposalServiceItem.proposal_id == proposal_id)
        .order_by(ProposalServiceItem.sort_order, ProposalServiceItem.created_at)
    )
    return [ProposalServiceItemResponse.model_validate(i) for i in result.scalars().all()]


@budget_router.post("/services", response_model=ProposalServiceItemResponse, status_code=status.HTTP_201_CREATED)
async def add_service_item(proposal_id: str, data: ProposalServiceItemCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_proposal(proposal_id, db)
    item = ProposalServiceItem(**data.model_dump(), proposal_id=proposal_id)
    _calc_service_totals(item)
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return ProposalServiceItemResponse.model_validate(item)


@budget_router.put("/services/{item_id}", response_model=ProposalServiceItemResponse)
async def update_service_item(proposal_id: str, item_id: str, data: ProposalServiceItemUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ProposalServiceItem).where(ProposalServiceItem.id == item_id, ProposalServiceItem.proposal_id == proposal_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item nao encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    _calc_service_totals(item)
    await db.flush()
    await db.refresh(item)
    return ProposalServiceItemResponse.model_validate(item)


@budget_router.delete("/services/{item_id}", response_model=MessageResponse)
async def delete_service_item(proposal_id: str, item_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ProposalServiceItem).where(ProposalServiceItem.id == item_id, ProposalServiceItem.proposal_id == proposal_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item nao encontrado")
    await db.delete(item)
    await db.flush()
    return MessageResponse(message="Servico removido")


# ---------- ADDITIVES ----------

@budget_router.get("/additives", response_model=list[ProposalAdditiveItemResponse])
async def list_additives(proposal_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_proposal(proposal_id, db)
    result = await db.execute(
        select(ProposalAdditiveItem).where(ProposalAdditiveItem.proposal_id == proposal_id)
        .order_by(ProposalAdditiveItem.sort_order, ProposalAdditiveItem.created_at)
    )
    return [ProposalAdditiveItemResponse.model_validate(i) for i in result.scalars().all()]


@budget_router.post("/additives", response_model=ProposalAdditiveItemResponse, status_code=status.HTTP_201_CREATED)
async def add_additive(proposal_id: str, data: ProposalAdditiveItemCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_proposal(proposal_id, db)
    item = ProposalAdditiveItem(**data.model_dump(), proposal_id=proposal_id)
    _calc_additive_totals(item)
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return ProposalAdditiveItemResponse.model_validate(item)


@budget_router.put("/additives/{item_id}", response_model=ProposalAdditiveItemResponse)
async def update_additive(proposal_id: str, item_id: str, data: ProposalAdditiveItemUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ProposalAdditiveItem).where(ProposalAdditiveItem.id == item_id, ProposalAdditiveItem.proposal_id == proposal_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item nao encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    _calc_additive_totals(item)
    await db.flush()
    await db.refresh(item)
    return ProposalAdditiveItemResponse.model_validate(item)


@budget_router.delete("/additives/{item_id}", response_model=MessageResponse)
async def delete_additive(proposal_id: str, item_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ProposalAdditiveItem).where(ProposalAdditiveItem.id == item_id, ProposalAdditiveItem.proposal_id == proposal_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item nao encontrado")
    await db.delete(item)
    await db.flush()
    return MessageResponse(message="Aditivo removido")


# ---------- ROOMS ----------

@budget_router.get("/rooms", response_model=list[ProposalRoomResponse])
async def list_rooms(proposal_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_proposal(proposal_id, db)
    result = await db.execute(
        select(ProposalRoom).where(ProposalRoom.proposal_id == proposal_id)
        .order_by(ProposalRoom.sort_order, ProposalRoom.created_at)
    )
    return [ProposalRoomResponse.model_validate(i) for i in result.scalars().all()]


@budget_router.post("/rooms", response_model=ProposalRoomResponse, status_code=status.HTTP_201_CREATED)
async def add_room(proposal_id: str, data: ProposalRoomCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_proposal(proposal_id, db)
    room = ProposalRoom(**data.model_dump(), proposal_id=proposal_id)
    _calc_room_dimensions(room)
    db.add(room)
    await db.flush()
    await db.refresh(room)
    return ProposalRoomResponse.model_validate(room)


@budget_router.put("/rooms/{room_id}", response_model=ProposalRoomResponse)
async def update_room(proposal_id: str, room_id: str, data: ProposalRoomUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ProposalRoom).where(ProposalRoom.id == room_id, ProposalRoom.proposal_id == proposal_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Ambiente nao encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(room, field, value)
    _calc_room_dimensions(room)
    await db.flush()
    await db.refresh(room)
    return ProposalRoomResponse.model_validate(room)


@budget_router.delete("/rooms/{room_id}", response_model=MessageResponse)
async def delete_room(proposal_id: str, room_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ProposalRoom).where(ProposalRoom.id == room_id, ProposalRoom.proposal_id == proposal_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Ambiente nao encontrado")
    await db.delete(room)
    await db.flush()
    return MessageResponse(message="Ambiente removido")


# ---------- COMMERCIAL TERMS ----------

@budget_router.get("/commercial-terms", response_model=ProposalCommercialTermsResponse)
async def get_commercial_terms(proposal_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_proposal(proposal_id, db)
    result = await db.execute(select(ProposalCommercialTerms).where(ProposalCommercialTerms.proposal_id == proposal_id))
    terms = result.scalar_one_or_none()
    if not terms:
        try:
            terms = ProposalCommercialTerms(proposal_id=proposal_id)
            db.add(terms)
            await db.flush()
            await db.refresh(terms)
        except IntegrityError:
            await db.rollback()
            result = await db.execute(select(ProposalCommercialTerms).where(ProposalCommercialTerms.proposal_id == proposal_id))
            terms = result.scalar_one()
    return ProposalCommercialTermsResponse.model_validate(terms)


@budget_router.put("/commercial-terms", response_model=ProposalCommercialTermsResponse)
async def upsert_commercial_terms(proposal_id: str, data: ProposalCommercialTermsUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_proposal(proposal_id, db)
    result = await db.execute(select(ProposalCommercialTerms).where(ProposalCommercialTerms.proposal_id == proposal_id))
    terms = result.scalar_one_or_none()
    if not terms:
        terms = ProposalCommercialTerms(proposal_id=proposal_id, **data.model_dump(exclude_unset=True))
        db.add(terms)
    else:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(terms, field, value)
    await db.flush()
    await db.refresh(terms)
    return ProposalCommercialTermsResponse.model_validate(terms)


# ---------- BUDGET SUMMARY ----------

@budget_router.get("/summary", response_model=BudgetSummaryResponse)
async def get_budget_summary(proposal_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_proposal(proposal_id, db)

    # Materials
    mat_result = await db.execute(select(ProposalMaterialItem).where(ProposalMaterialItem.proposal_id == proposal_id))
    materials = mat_result.scalars().all()
    total_mat_cost = sum((i.total_cost or Decimal("0")) for i in materials)
    total_mat_price = sum((i.total_price or Decimal("0")) for i in materials)

    # Services
    svc_result = await db.execute(select(ProposalServiceItem).where(ProposalServiceItem.proposal_id == proposal_id))
    services = svc_result.scalars().all()
    total_svc_cost = sum((i.total_cost or Decimal("0")) for i in services)
    total_svc_price = sum((i.total_price or Decimal("0")) for i in services)

    # Additives (only approved ones count toward final value)
    add_result = await db.execute(select(ProposalAdditiveItem).where(ProposalAdditiveItem.proposal_id == proposal_id))
    additives = add_result.scalars().all()
    approved_additives = [a for a in additives if a.status == "aprovado"]
    total_add_cost = sum((i.total_cost or Decimal("0")) for i in approved_additives)
    total_add_price = sum((i.total_price or Decimal("0")) for i in approved_additives)

    # Commercial terms
    terms_result = await db.execute(select(ProposalCommercialTerms).where(ProposalCommercialTerms.proposal_id == proposal_id))
    terms = terms_result.scalar_one_or_none()

    total_direct_cost = total_mat_cost + total_svc_cost + total_add_cost
    total_sale_price = total_mat_price + total_svc_price + total_add_price

    tax_pct = Decimal(str(terms.tax_percent or 0)) if terms else Decimal("0")
    discount_pct = Decimal(str(terms.discount_percent or 0)) if terms else Decimal("0")
    discount_val = Decimal(str(terms.discount_value or 0)) if terms else Decimal("0")
    down_pct = Decimal(str(terms.down_payment_percent or 0)) if terms else Decimal("0")
    down_val = Decimal(str(terms.down_payment_value or 0)) if terms else Decimal("0")

    tax_value = total_sale_price * tax_pct / Decimal("100")
    if discount_pct > 0:
        discount_value = total_sale_price * discount_pct / Decimal("100")
    else:
        discount_value = discount_val

    final_value = total_sale_price + tax_value - discount_value

    if down_pct > 0:
        down_payment = final_value * down_pct / Decimal("100")
    else:
        down_payment = down_val

    balance_due = final_value - down_payment
    net_profit = final_value - total_direct_cost - tax_value
    margin_percent = (net_profit / final_value * Decimal("100")) if final_value > 0 else Decimal("0")

    return BudgetSummaryResponse(
        total_materials_cost=total_mat_cost,
        total_materials_price=total_mat_price,
        total_services_cost=total_svc_cost,
        total_services_price=total_svc_price,
        total_additives_cost=total_add_cost,
        total_additives_price=total_add_price,
        total_direct_cost=total_direct_cost,
        total_sale_price=total_sale_price,
        tax_value=tax_value,
        discount_value=discount_value,
        final_value=final_value,
        down_payment=down_payment,
        balance_due=balance_due,
        net_profit=net_profit,
        margin_percent=margin_percent,
    )
