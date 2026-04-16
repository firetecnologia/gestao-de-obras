from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, Contract, ContractInstallment, Project, FinancialEntry
from app.schemas.contracts import (
    ContractCreate, ContractUpdate, ContractResponse,
    ContractInstallmentCreate, ContractInstallmentUpdate, ContractInstallmentResponse,
)
from app.schemas.base import PaginatedResponse, MessageResponse

router = APIRouter(prefix="/contracts", tags=["Contratos"])


@router.get("", response_model=PaginatedResponse[ContractResponse])
async def list_contracts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    client_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Contract).where(Contract.is_deleted.is_(False)).options(
        selectinload(Contract.installments), selectinload(Contract.client)
    )
    count_query = select(func.count()).select_from(Contract).where(Contract.is_deleted.is_(False))

    if search:
        sf = Contract.title.ilike(f"%{search}%") | Contract.code.ilike(f"%{search}%")
        query = query.where(sf)
        count_query = count_query.where(sf)
    if status_filter:
        query = query.where(Contract.status == status_filter)
        count_query = count_query.where(Contract.status == status_filter)
    if client_id:
        query = query.where(Contract.client_id == client_id)
        count_query = count_query.where(Contract.client_id == client_id)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size).order_by(Contract.created_at.desc()))
    contracts = result.scalars().all()

    items = []
    for c in contracts:
        items.append(ContractResponse(
            id=c.id, code=c.code, proposal_id=c.proposal_id, client_id=c.client_id,
            client_name=c.client.name if c.client else None,
            title=c.title, description=c.description, scope_summary=c.scope_summary,
            status=c.status, total_value=c.total_value,
            payment_conditions=c.payment_conditions, signed_at=c.signed_at,
            start_date=c.start_date, end_date=c.end_date,
            notes=c.notes, created_at=c.created_at,
            installments=[ContractInstallmentResponse.model_validate(i) for i in c.installments],
        ))

    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size if page_size > 0 else 0,
    )


@router.post("", response_model=ContractResponse, status_code=status.HTTP_201_CREATED)
async def create_contract(data: ContractCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = (await db.execute(select(func.count()).select_from(Contract))).scalar() or 0
    code = f"CTR-{count + 1:04d}"

    contract_data = data.model_dump(exclude={"installments"})
    contract = Contract(**contract_data, code=code, created_by=current_user.id)
    db.add(contract)
    await db.flush()

    for inst_data in (data.installments or []):
        inst = ContractInstallment(**inst_data.model_dump(), contract_id=contract.id)
        db.add(inst)
        # Create accounts receivable entry
        entry = FinancialEntry(
            type="receita",
            category="parcela_contrato",
            description=f"Parcela {inst_data.installment_number} - {contract.title}",
            planned_amount=inst_data.amount,
            due_date=inst_data.due_date,
            status="pendente",
            contract_installment_id=inst.id,
            created_by=current_user.id,
        )
        db.add(entry)

    await db.flush()
    result = await db.execute(
        select(Contract).where(Contract.id == contract.id)
        .options(selectinload(Contract.installments), selectinload(Contract.client))
    )
    contract = result.scalar_one()
    return ContractResponse(
        id=contract.id, code=contract.code, client_id=contract.client_id,
        client_name=contract.client.name if contract.client else None,
        title=contract.title, status=contract.status, total_value=contract.total_value,
        created_at=contract.created_at,
        installments=[ContractInstallmentResponse.model_validate(i) for i in contract.installments],
    )


@router.get("/{contract_id}", response_model=ContractResponse)
async def get_contract(contract_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Contract).where(Contract.id == contract_id, Contract.is_deleted.is_(False))
        .options(selectinload(Contract.installments), selectinload(Contract.client))
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    return ContractResponse(
        id=c.id, code=c.code, proposal_id=c.proposal_id, client_id=c.client_id,
        client_name=c.client.name if c.client else None,
        title=c.title, description=c.description, scope_summary=c.scope_summary,
        status=c.status, total_value=c.total_value,
        payment_conditions=c.payment_conditions, signed_at=c.signed_at,
        start_date=c.start_date, end_date=c.end_date,
        notes=c.notes, created_at=c.created_at,
        installments=[ContractInstallmentResponse.model_validate(i) for i in c.installments],
    )


@router.put("/{contract_id}", response_model=ContractResponse)
async def update_contract(contract_id: str, data: ContractUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Contract).where(Contract.id == contract_id, Contract.is_deleted.is_(False)))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(contract, field, value)
    await db.flush()
    result = await db.execute(
        select(Contract).where(Contract.id == contract_id)
        .options(selectinload(Contract.installments), selectinload(Contract.client))
    )
    c = result.scalar_one()
    return ContractResponse(
        id=c.id, code=c.code, client_id=c.client_id,
        client_name=c.client.name if c.client else None,
        title=c.title, status=c.status, total_value=c.total_value,
        created_at=c.created_at,
        installments=[ContractInstallmentResponse.model_validate(i) for i in c.installments],
    )


@router.delete("/{contract_id}", response_model=MessageResponse)
async def delete_contract(contract_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Contract).where(Contract.id == contract_id, Contract.is_deleted.is_(False)))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    contract.is_deleted = True
    contract.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return MessageResponse(message="Contrato removido com sucesso")


# ==================== INSTALLMENTS ====================

@router.post("/{contract_id}/installments", response_model=ContractInstallmentResponse, status_code=status.HTTP_201_CREATED)
async def add_installment(contract_id: str, data: ContractInstallmentCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Contract).where(Contract.id == contract_id, Contract.is_deleted.is_(False)))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    inst = ContractInstallment(**data.model_dump(), contract_id=contract_id)
    db.add(inst)
    await db.flush()
    await db.refresh(inst)
    return ContractInstallmentResponse.model_validate(inst)


@router.put("/{contract_id}/installments/{installment_id}", response_model=ContractInstallmentResponse)
async def update_installment(contract_id: str, installment_id: str, data: ContractInstallmentUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ContractInstallment).where(ContractInstallment.id == installment_id, ContractInstallment.contract_id == contract_id))
    inst = result.scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Parcela não encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(inst, field, value)
    await db.flush()
    await db.refresh(inst)
    return ContractInstallmentResponse.model_validate(inst)


# ==================== GENERATE INSTALLMENTS (BATCH) ====================

@router.post("/{contract_id}/generate-installments", response_model=MessageResponse)
async def generate_installments(contract_id: str, num_installments: int = Query(3, ge=1, le=60), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import date, timedelta
    from decimal import Decimal, ROUND_HALF_UP
    result = await db.execute(select(Contract).where(Contract.id == contract_id, Contract.is_deleted.is_(False)))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")

    # Find project linked to this contract
    project_result = await db.execute(
        select(Project).where(Project.contract_id == contract.id, Project.is_deleted.is_(False))
    )
    project = project_result.scalar_one_or_none()
    project_id = project.id if project else None

    parcela_valor = (contract.total_value / num_installments).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    today = date.today()
    for i in range(num_installments):
        inst = ContractInstallment(
            contract_id=contract.id,
            installment_number=i + 1,
            description=f"Parcela {i + 1}/{num_installments}",
            due_date=today + timedelta(days=30 * i),
            amount=parcela_valor,
            status="pendente",
        )
        db.add(inst)
        await db.flush()
        entry = FinancialEntry(
            project_id=project_id,
            type="receita",
            category="parcela_contrato",
            description=f"Parcela {i + 1}/{num_installments} - {contract.title}",
            planned_amount=parcela_valor,
            due_date=today + timedelta(days=30 * i),
            status="pendente",
            contract_installment_id=inst.id,
            created_by=current_user.id,
        )
        db.add(entry)

    await db.flush()
    return MessageResponse(message=f"{num_installments} parcelas geradas com sucesso")


# ==================== GENERATE PROJECT FROM CONTRACT ====================

@router.post("/{contract_id}/generate-project", response_model=MessageResponse)
async def generate_project(contract_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Contract).where(Contract.id == contract_id, Contract.is_deleted.is_(False)))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contrato não encontrado")
    if contract.status not in ("ativo", "rascunho"):
        raise HTTPException(status_code=400, detail="Contrato precisa estar ativo")

    count = (await db.execute(select(func.count()).select_from(Project))).scalar() or 0
    code = f"OBR-{count + 1:04d}"

    project = Project(
        name=contract.title,
        code=code,
        client_id=contract.client_id,
        contract_id=contract.id,
        type="reforma_residencial",
        status="planejamento",
        estimated_value=contract.total_value,
        planned_start=contract.start_date,
        planned_end=contract.end_date,
    )
    db.add(project)
    await db.flush()
    return MessageResponse(message=f"Obra {code} criada com sucesso. ID: {project.id}")
