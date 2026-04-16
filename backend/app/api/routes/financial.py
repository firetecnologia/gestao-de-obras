from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import date, datetime, timezone

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import (
    User, FinancialEntry, BillingRecord, ContractInstallment,
    Contract
)
from app.schemas.financial import (
    FinancialEntryCreate, FinancialEntryUpdate, FinancialEntryResponse,
    BillingRecordCreate, BillingRecordResponse,
)
from app.schemas.base import PaginatedResponse, MessageResponse

router = APIRouter(prefix="/financial", tags=["Financeiro"])


# ==================== FINANCIAL ENTRIES ====================

@router.get("/entries", response_model=PaginatedResponse[FinancialEntryResponse])
async def list_entries(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    project_id: Optional[str] = None,
    entry_type: Optional[str] = Query(None, alias="type"),
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(FinancialEntry).where(not FinancialEntry.is_deleted)
    count_query = select(func.count()).select_from(FinancialEntry).where(not FinancialEntry.is_deleted)

    if project_id:
        query = query.where(FinancialEntry.project_id == project_id)
        count_query = count_query.where(FinancialEntry.project_id == project_id)
    if entry_type:
        query = query.where(FinancialEntry.type == entry_type)
        count_query = count_query.where(FinancialEntry.type == entry_type)
    if status_filter:
        query = query.where(FinancialEntry.status == status_filter)
        count_query = count_query.where(FinancialEntry.status == status_filter)
    if category:
        query = query.where(FinancialEntry.category == category)
        count_query = count_query.where(FinancialEntry.category == category)
    if date_from:
        query = query.where(FinancialEntry.due_date >= date_from)
        count_query = count_query.where(FinancialEntry.due_date >= date_from)
    if date_to:
        query = query.where(FinancialEntry.due_date <= date_to)
        count_query = count_query.where(FinancialEntry.due_date <= date_to)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size).order_by(FinancialEntry.due_date.desc()))
    entries = result.scalars().all()

    items = []
    for e in entries:
        items.append(FinancialEntryResponse(
            id=e.id, project_id=e.project_id, type=e.type,
            category=e.category, cost_center=e.cost_center,
            description=e.description, planned_amount=e.planned_amount,
            actual_amount=e.actual_amount, due_date=e.due_date,
            paid_date=e.paid_date, status=e.status,
            supplier_id=e.supplier_id, notes=e.notes,
            created_at=e.created_at,
        ))

    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size if page_size > 0 else 0,
    )


@router.post("/entries", response_model=FinancialEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_entry(data: FinancialEntryCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    entry = FinancialEntry(**data.model_dump(), created_by=current_user.id)
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return FinancialEntryResponse(
        id=entry.id, project_id=entry.project_id, type=entry.type,
        category=entry.category, cost_center=entry.cost_center,
        description=entry.description, planned_amount=entry.planned_amount,
        actual_amount=entry.actual_amount, due_date=entry.due_date,
        paid_date=entry.paid_date, status=entry.status,
        notes=entry.notes, created_at=entry.created_at,
    )


@router.put("/entries/{entry_id}", response_model=FinancialEntryResponse)
async def update_entry(entry_id: str, data: FinancialEntryUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(FinancialEntry).where(FinancialEntry.id == entry_id, not FinancialEntry.is_deleted))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    await db.flush()
    await db.refresh(entry)
    return FinancialEntryResponse(
        id=entry.id, project_id=entry.project_id, type=entry.type,
        category=entry.category, description=entry.description,
        planned_amount=entry.planned_amount, actual_amount=entry.actual_amount,
        due_date=entry.due_date, paid_date=entry.paid_date, status=entry.status,
        notes=entry.notes, created_at=entry.created_at,
    )


@router.delete("/entries/{entry_id}", response_model=MessageResponse)
async def delete_entry(entry_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(FinancialEntry).where(FinancialEntry.id == entry_id, not FinancialEntry.is_deleted))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado")
    entry.is_deleted = True
    entry.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return MessageResponse(message="Lançamento removido com sucesso")


# ==================== SUMMARY ====================

@router.get("/summary")
async def financial_summary(
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base_filter = not FinancialEntry.is_deleted

    # Revenue
    rev_query = select(
        func.coalesce(func.sum(FinancialEntry.planned_amount), 0),
        func.coalesce(func.sum(FinancialEntry.actual_amount), 0),
    ).where(base_filter, FinancialEntry.type == "receita")

    # Expenses
    exp_query = select(
        func.coalesce(func.sum(FinancialEntry.planned_amount), 0),
        func.coalesce(func.sum(FinancialEntry.actual_amount), 0),
    ).where(base_filter, FinancialEntry.type == "despesa")

    # Overdue
    overdue_query = select(func.count(), func.coalesce(func.sum(FinancialEntry.planned_amount), 0)).where(
        base_filter, FinancialEntry.status == "pendente",
        FinancialEntry.due_date < date.today()
    )

    if project_id:
        rev_query = rev_query.where(FinancialEntry.project_id == project_id)
        exp_query = exp_query.where(FinancialEntry.project_id == project_id)
        overdue_query = overdue_query.where(FinancialEntry.project_id == project_id)

    rev = (await db.execute(rev_query)).one()
    exp = (await db.execute(exp_query)).one()
    overdue = (await db.execute(overdue_query)).one()

    return {
        "revenue_planned": float(rev[0]),
        "revenue_received": float(rev[1]),
        "expenses_planned": float(exp[0]),
        "expenses_paid": float(exp[1]),
        "overdue_count": overdue[0],
        "overdue_amount": float(overdue[1]),
        "balance_planned": float(rev[0]) - float(exp[0]),
        "balance_actual": float(rev[1]) - float(exp[1]),
    }


# ==================== BILLING / COLLECTION ====================

@router.post("/billing", response_model=BillingRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_billing(data: BillingRecordCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ContractInstallment).where(ContractInstallment.id == data.installment_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Parcela não encontrada")
    record = BillingRecord(**data.model_dump(), created_by=current_user.id)
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return BillingRecordResponse.model_validate(record)


@router.get("/billing/{installment_id}", response_model=list[BillingRecordResponse])
async def list_billing(installment_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(BillingRecord).where(BillingRecord.installment_id == installment_id)
        .order_by(BillingRecord.action_date.desc())
    )
    return [BillingRecordResponse.model_validate(r) for r in result.scalars().all()]


@router.get("/overdue-installments")
async def overdue_installments(
    client_id: Optional[str] = None,
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(ContractInstallment).where(
        ContractInstallment.status.in_(["pendente", "atrasada"]),
        ContractInstallment.due_date < date.today(),
    ).options(selectinload(ContractInstallment.contract).selectinload(Contract.client))

    result = await db.execute(query.order_by(ContractInstallment.due_date))
    installments = result.scalars().all()

    items = []
    for i in installments:
        if client_id and i.contract and i.contract.client_id != client_id:
            continue
        items.append({
            "id": i.id,
            "contract_id": i.contract_id,
            "contract_code": i.contract.code if i.contract else None,
            "client_name": i.contract.client.name if i.contract and i.contract.client else None,
            "client_id": i.contract.client_id if i.contract else None,
            "installment_number": i.installment_number,
            "due_date": str(i.due_date),
            "amount": float(i.amount),
            "days_overdue": (date.today() - i.due_date).days,
        })
    return items
