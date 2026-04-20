from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from typing import Optional
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, ContractTemplate, Client, Proposal, Contract
from app.schemas.base import PaginatedResponse, MessageResponse

from pydantic import BaseModel


class ContractTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    content: str
    category: Optional[str] = None
    is_active: bool = True


class ContractTemplateCreate(ContractTemplateBase):
    pass


class ContractTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


class ContractTemplateResponse(ContractTemplateBase):
    id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class GenerateContractRequest(BaseModel):
    template_id: str
    proposal_id: Optional[str] = None
    client_id: str
    custom_data: Optional[dict] = None


router = APIRouter(prefix="/contract-templates", tags=["Modelos de Contrato"])


@router.get("", response_model=PaginatedResponse[ContractTemplateResponse])
async def list_templates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(ContractTemplate).where(ContractTemplate.is_deleted.is_(False))
    count_query = select(func.count()).select_from(ContractTemplate).where(ContractTemplate.is_deleted.is_(False))

    if search:
        sf = ContractTemplate.name.ilike(f"%{search}%")
        query = query.where(sf)
        count_query = count_query.where(sf)
    if category:
        query = query.where(ContractTemplate.category == category)
        count_query = count_query.where(ContractTemplate.category == category)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size).order_by(ContractTemplate.name))
    templates = result.scalars().all()

    return PaginatedResponse(
        items=[ContractTemplateResponse.model_validate(t) for t in templates],
        total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size if page_size > 0 else 0,
    )


@router.post("", response_model=ContractTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(data: ContractTemplateCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    template = ContractTemplate(**data.model_dump(), created_by=current_user.id)
    db.add(template)
    await db.flush()
    await db.refresh(template)
    return ContractTemplateResponse.model_validate(template)


@router.get("/{template_id}", response_model=ContractTemplateResponse)
async def get_template(template_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ContractTemplate).where(ContractTemplate.id == template_id, ContractTemplate.is_deleted.is_(False)))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")
    return ContractTemplateResponse.model_validate(template)


@router.put("/{template_id}", response_model=ContractTemplateResponse)
async def update_template(template_id: str, data: ContractTemplateUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ContractTemplate).where(ContractTemplate.id == template_id, ContractTemplate.is_deleted.is_(False)))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(template, field, value)
    await db.flush()
    await db.refresh(template)
    return ContractTemplateResponse.model_validate(template)


@router.delete("/{template_id}", response_model=MessageResponse)
async def delete_template(template_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ContractTemplate).where(ContractTemplate.id == template_id, ContractTemplate.is_deleted.is_(False)))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")
    template.is_deleted = True
    template.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return MessageResponse(message="Modelo removido com sucesso")


@router.post("/generate", response_model=MessageResponse)
async def generate_contract_from_template(
    data: GenerateContractRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a contract from a template by replacing placeholders with actual data."""
    result = await db.execute(select(ContractTemplate).where(ContractTemplate.id == data.template_id, ContractTemplate.is_deleted.is_(False)))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")

    result = await db.execute(select(Client).where(Client.id == data.client_id, Client.is_deleted.is_(False)))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    proposal = None
    if data.proposal_id:
        result = await db.execute(select(Proposal).where(Proposal.id == data.proposal_id, Proposal.is_deleted.is_(False)))
        proposal = result.scalar_one_or_none()

    # Build replacement data
    replacements = {
        "cliente_nome": client.name or "",
        "cliente_cpf_cnpj": client.cpf_cnpj or "",
        "cliente_email": client.email or "",
        "cliente_phone": client.phone or "",
        "cliente_endereco": f"{client.address_street or ''}, {client.address_number or ''} {client.address_complement or ''} - {client.address_neighborhood or ''}, {client.address_city or ''}/{client.address_state or ''} CEP: {client.address_zip or ''}",
    }
    if proposal:
        replacements.update({
            "valor_total": f"R$ {float(proposal.total_price or 0):,.2f}".replace(",", "X").replace(".", ",").replace("X", "."),
            "escopo": proposal.description or proposal.title or "",
            "proposta_titulo": proposal.title or "",
        })
    if data.custom_data:
        replacements.update(data.custom_data)

    # Replace placeholders in template content
    content = template.content
    for key, value in replacements.items():
        content = content.replace("{{" + key + "}}", str(value))

    # Extract values from ORM objects before retry loop to avoid MissingGreenlet after rollback
    client_name = client.name or ""
    client_id = client.id
    proposal_id = data.proposal_id
    proposal_total = float(proposal.total_price or 0) if proposal else 0
    scope = content[:500] if content else None
    user_id = current_user.id

    # Create contract with retry for code uniqueness using savepoints
    max_retries = 3
    contract = None
    for attempt in range(max_retries):
        count = (await db.execute(select(func.count()).select_from(Contract))).scalar() or 0
        code = f"CTR-{count + 1 + attempt:04d}"
        contract = Contract(
            code=code,
            title=f"Contrato - {client_name}",
            client_id=client_id,
            proposal_id=proposal_id,
            description=content,
            scope_summary=scope,
            total_value=proposal_total,
            status="rascunho",
            created_by=user_id,
        )
        nested = await db.begin_nested()
        db.add(contract)
        try:
            await nested.commit()
            break
        except IntegrityError:
            await nested.rollback()
            if attempt == max_retries - 1:
                raise HTTPException(status_code=409, detail="Não foi possível gerar código único para o contrato")
            continue

    return MessageResponse(message=f"Contrato gerado com sucesso. ID: {contract.id}")
