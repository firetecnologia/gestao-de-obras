from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime, timezone, date

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, PurchaseReceipt, PurchaseReceiptItem, PurchaseOrder
from app.schemas.base import PaginatedResponse, MessageResponse
from pydantic import BaseModel


class ReceiptItemCreate(BaseModel):
    order_item_id: Optional[str] = None
    description: str
    quantity_expected: float
    quantity_received: float
    status: str = "ok"
    notes: Optional[str] = None


class ReceiptCreate(BaseModel):
    order_id: str
    received_date: date
    status: str = "completo"
    notes: Optional[str] = None
    items: List[ReceiptItemCreate] = []


class ReceiptItemResponse(BaseModel):
    id: str
    receipt_id: str
    order_item_id: Optional[str] = None
    description: str
    quantity_expected: float
    quantity_received: float
    status: str
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class ReceiptResponse(BaseModel):
    id: str
    order_id: str
    received_date: date
    status: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    items: List[ReceiptItemResponse] = []

    class Config:
        from_attributes = True


router = APIRouter(prefix="/purchases/receipts", tags=["Recebimentos de Compras"])


@router.get("", response_model=PaginatedResponse[ReceiptResponse])
async def list_receipts(
    order_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(PurchaseReceipt).options(selectinload(PurchaseReceipt.items))
    count_query = select(func.count()).select_from(PurchaseReceipt)

    if order_id:
        query = query.where(PurchaseReceipt.order_id == order_id)
        count_query = count_query.where(PurchaseReceipt.order_id == order_id)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size).order_by(PurchaseReceipt.received_date.desc()))
    receipts = result.scalars().all()

    items_list = []
    for r in receipts:
        receipt_items = [ReceiptItemResponse(
            id=ri.id, receipt_id=ri.receipt_id, order_item_id=ri.order_item_id,
            description=ri.description,
            quantity_expected=float(ri.quantity_expected),
            quantity_received=float(ri.quantity_received),
            status=ri.status, notes=ri.notes,
        ) for ri in (r.items or [])]
        items_list.append(ReceiptResponse(
            id=r.id, order_id=r.order_id, received_date=r.received_date,
            status=r.status, notes=r.notes, created_at=r.created_at,
            items=receipt_items,
        ))

    return PaginatedResponse(
        items=items_list, total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size if page_size > 0 else 0,
    )


@router.post("", response_model=ReceiptResponse, status_code=status.HTTP_201_CREATED)
async def create_receipt(
    data: ReceiptCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify order exists
    order_result = await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == data.order_id))
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido de compra não encontrado")

    receipt = PurchaseReceipt(
        order_id=data.order_id,
        received_date=data.received_date,
        received_by=current_user.id,
        status=data.status,
        notes=data.notes,
    )
    db.add(receipt)
    await db.flush()

    # Add items
    receipt_items = []
    has_divergence = False
    for item_data in data.items:
        ri = PurchaseReceiptItem(
            receipt_id=receipt.id,
            order_item_id=item_data.order_item_id,
            description=item_data.description,
            quantity_expected=item_data.quantity_expected,
            quantity_received=item_data.quantity_received,
            status=item_data.status,
            notes=item_data.notes,
        )
        if item_data.quantity_received < item_data.quantity_expected:
            ri.status = "parcial"
            has_divergence = True
        elif item_data.quantity_received == 0:
            ri.status = "nao_recebido"
            has_divergence = True
        db.add(ri)
        receipt_items.append(ri)
    await db.flush()

    # AUTOMATION: Update order status based on receipt
    if has_divergence:
        order.status = "entregue_parcial"
        receipt.status = "parcial"
    else:
        order.status = "entregue"
        receipt.status = "completo"
    await db.flush()

    await db.refresh(receipt)
    return ReceiptResponse(
        id=receipt.id, order_id=receipt.order_id, received_date=receipt.received_date,
        status=receipt.status, notes=receipt.notes, created_at=receipt.created_at,
        items=[ReceiptItemResponse(
            id=ri.id, receipt_id=ri.receipt_id, order_item_id=ri.order_item_id,
            description=ri.description,
            quantity_expected=float(ri.quantity_expected),
            quantity_received=float(ri.quantity_received),
            status=ri.status, notes=ri.notes,
        ) for ri in receipt_items],
    )
