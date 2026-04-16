from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, Supplier
from app.schemas.suppliers import SupplierCreate, SupplierUpdate, SupplierResponse
from app.schemas.base import PaginatedResponse, MessageResponse

router = APIRouter(prefix="/suppliers", tags=["Fornecedores"])


@router.get("", response_model=PaginatedResponse[SupplierResponse])
async def list_suppliers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    specialty: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Supplier).where(not Supplier.is_deleted)
    count_query = select(func.count()).select_from(Supplier).where(not Supplier.is_deleted)

    if search:
        sf = Supplier.name.ilike(f"%{search}%") | Supplier.cpf_cnpj.ilike(f"%{search}%")
        query = query.where(sf)
        count_query = count_query.where(sf)
    if specialty:
        query = query.where(Supplier.specialty.ilike(f"%{specialty}%"))
        count_query = count_query.where(Supplier.specialty.ilike(f"%{specialty}%"))

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size).order_by(Supplier.name))
    suppliers = result.scalars().all()

    return PaginatedResponse(
        items=[SupplierResponse.model_validate(s) for s in suppliers],
        total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size if page_size > 0 else 0,
    )


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier(data: SupplierCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    supplier = Supplier(**data.model_dump(), created_by=current_user.id)
    db.add(supplier)
    await db.flush()
    await db.refresh(supplier)
    return SupplierResponse.model_validate(supplier)


@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(supplier_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id, not Supplier.is_deleted))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    return SupplierResponse.model_validate(supplier)


@router.put("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(supplier_id: str, data: SupplierUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id, not Supplier.is_deleted))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)
    await db.flush()
    await db.refresh(supplier)
    return SupplierResponse.model_validate(supplier)


@router.delete("/{supplier_id}", response_model=MessageResponse)
async def delete_supplier(supplier_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import datetime, timezone
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id, not Supplier.is_deleted))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    supplier.is_deleted = True
    supplier.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return MessageResponse(message="Fornecedor removido com sucesso")
