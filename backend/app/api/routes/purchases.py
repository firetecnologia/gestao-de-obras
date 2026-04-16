from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from decimal import Decimal

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import (
    User, PurchaseRequest, PurchaseRequestItem, Quotation,
    PurchaseOrder, PurchaseOrderItem, Supplier, FinancialEntry
)
from app.schemas.purchases import (
    PurchaseRequestCreate, PurchaseRequestUpdate, PurchaseRequestResponse,
    QuotationCreate, QuotationResponse,
    PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderResponse,
)
from app.schemas.base import PaginatedResponse, MessageResponse

router = APIRouter(prefix="/purchases", tags=["Compras"])


# ==================== PURCHASE REQUESTS ====================

@router.get("/requests", response_model=PaginatedResponse[PurchaseRequestResponse])
async def list_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    project_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(PurchaseRequest).where(PurchaseRequest.is_deleted.is_(False)).options(selectinload(PurchaseRequest.items))
    count_query = select(func.count()).select_from(PurchaseRequest).where(PurchaseRequest.is_deleted.is_(False))

    if project_id:
        query = query.where(PurchaseRequest.project_id == project_id)
        count_query = count_query.where(PurchaseRequest.project_id == project_id)
    if status_filter:
        query = query.where(PurchaseRequest.status == status_filter)
        count_query = count_query.where(PurchaseRequest.status == status_filter)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size).order_by(PurchaseRequest.created_at.desc()))
    requests = result.scalars().all()

    return PaginatedResponse(
        items=[PurchaseRequestResponse(
            id=r.id, code=r.code, project_id=r.project_id, phase_id=r.phase_id,
            status=r.status, description=r.description, needed_by=r.needed_by,
            notes=r.notes, created_at=r.created_at,
            items=[PurchaseRequestResponse.model_validate(r).items for _ in []][0] if False else
            [{"id": i.id, "request_id": i.request_id, "description": i.description,
              "quantity": i.quantity, "unit": i.unit, "estimated_cost": i.estimated_cost, "notes": i.notes}
             for i in r.items],
        ) for r in requests],
        total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size if page_size > 0 else 0,
    )


@router.post("/requests", response_model=PurchaseRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_request(data: PurchaseRequestCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = (await db.execute(select(func.count()).select_from(PurchaseRequest))).scalar() or 0
    code = f"SC-{count + 1:04d}"

    req_data = data.model_dump(exclude={"items"})
    req = PurchaseRequest(**req_data, code=code, created_by=current_user.id)
    db.add(req)
    await db.flush()

    for item_data in (data.items or []):
        item = PurchaseRequestItem(**item_data.model_dump(), request_id=req.id)
        db.add(item)
    await db.flush()

    result = await db.execute(select(PurchaseRequest).where(PurchaseRequest.id == req.id).options(selectinload(PurchaseRequest.items)))
    req = result.scalar_one()
    return PurchaseRequestResponse.model_validate(req)


@router.put("/requests/{request_id}", response_model=PurchaseRequestResponse)
async def update_request(request_id: str, data: PurchaseRequestUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(PurchaseRequest).where(PurchaseRequest.id == request_id, PurchaseRequest.is_deleted.is_(False)))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(req, field, value)
    await db.flush()
    result = await db.execute(select(PurchaseRequest).where(PurchaseRequest.id == request_id).options(selectinload(PurchaseRequest.items)))
    req = result.scalar_one()
    return PurchaseRequestResponse.model_validate(req)


@router.delete("/requests/{request_id}", response_model=MessageResponse)
async def delete_request(request_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import datetime, timezone
    result = await db.execute(select(PurchaseRequest).where(PurchaseRequest.id == request_id, PurchaseRequest.is_deleted.is_(False)))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    req.is_deleted = True
    req.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return MessageResponse(message="Solicitação removida com sucesso")


# ==================== QUOTATIONS ====================

@router.post("/quotations", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
async def create_quotation(data: QuotationCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import datetime, timezone
    quotation = Quotation(**data.model_dump(), quoted_at=datetime.now(timezone.utc))
    db.add(quotation)
    await db.flush()
    await db.refresh(quotation)

    supplier_result = await db.execute(select(Supplier).where(Supplier.id == quotation.supplier_id))
    supplier = supplier_result.scalar_one_or_none()

    return QuotationResponse(
        id=quotation.id, purchase_request_id=quotation.purchase_request_id,
        supplier_id=quotation.supplier_id, supplier_name=supplier.name if supplier else None,
        total_value=quotation.total_value, delivery_days=quotation.delivery_days,
        payment_conditions=quotation.payment_conditions, is_selected=quotation.is_selected,
        notes=quotation.notes, quoted_at=quotation.quoted_at, created_at=quotation.created_at,
    )


@router.get("/requests/{request_id}/quotations", response_model=list[QuotationResponse])
async def list_quotations(request_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Quotation).where(Quotation.purchase_request_id == request_id)
        .order_by(Quotation.total_value)
    )
    quotations = result.scalars().all()
    items = []
    for q in quotations:
        supplier_result = await db.execute(select(Supplier).where(Supplier.id == q.supplier_id))
        supplier = supplier_result.scalar_one_or_none()
        items.append(QuotationResponse(
            id=q.id, purchase_request_id=q.purchase_request_id,
            supplier_id=q.supplier_id, supplier_name=supplier.name if supplier else None,
            total_value=q.total_value, delivery_days=q.delivery_days,
            payment_conditions=q.payment_conditions, is_selected=q.is_selected,
            notes=q.notes, quoted_at=q.quoted_at, created_at=q.created_at,
        ))
    return items


# ==================== PURCHASE ORDERS ====================

@router.post("/orders", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(data: PurchaseOrderCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = (await db.execute(select(func.count()).select_from(PurchaseOrder))).scalar() or 0
    code = f"PC-{count + 1:04d}"

    order_data = data.model_dump(exclude={"items"})
    total = Decimal("0")
    order = PurchaseOrder(**order_data, code=code, created_by=current_user.id)
    db.add(order)
    await db.flush()

    for item_data in (data.items or []):
        item = PurchaseOrderItem(**item_data.model_dump(), order_id=order.id)
        item.total_price = item.quantity * item.unit_price
        total += item.total_price
        db.add(item)

    order.total_value = total
    await db.flush()

    # Create financial entry for the purchase
    if data.project_id:
        entry = FinancialEntry(
            project_id=data.project_id,
            type="despesa",
            category="compra_material",
            description=f"Pedido de compra {code}",
            planned_amount=total,
            status="pendente",
            purchase_order_id=order.id,
            supplier_id=data.supplier_id,
            created_by=current_user.id,
        )
        db.add(entry)
        await db.flush()

    result = await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == order.id).options(selectinload(PurchaseOrder.items)))
    order = result.scalar_one()
    return PurchaseOrderResponse.model_validate(order)


@router.get("/orders", response_model=PaginatedResponse[PurchaseOrderResponse])
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    project_id: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(PurchaseOrder).where(PurchaseOrder.is_deleted.is_(False)).options(selectinload(PurchaseOrder.items))
    count_query = select(func.count()).select_from(PurchaseOrder).where(PurchaseOrder.is_deleted.is_(False))

    if project_id:
        query = query.where(PurchaseOrder.project_id == project_id)
        count_query = count_query.where(PurchaseOrder.project_id == project_id)
    if status_filter:
        query = query.where(PurchaseOrder.status == status_filter)
        count_query = count_query.where(PurchaseOrder.status == status_filter)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size).order_by(PurchaseOrder.created_at.desc()))
    orders = result.scalars().all()

    return PaginatedResponse(
        items=[PurchaseOrderResponse.model_validate(o) for o in orders],
        total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size if page_size > 0 else 0,
    )


@router.put("/orders/{order_id}", response_model=PurchaseOrderResponse)
async def update_order(order_id: str, data: PurchaseOrderUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == order_id, PurchaseOrder.is_deleted.is_(False)))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(order, field, value)
    await db.flush()
    result = await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == order_id).options(selectinload(PurchaseOrder.items)))
    order = result.scalar_one()
    return PurchaseOrderResponse.model_validate(order)
