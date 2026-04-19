from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, Client, ClientContact, ClientBankData
from app.schemas.clients import (
    ClientCreate, ClientUpdate, ClientResponse,
    ClientContactCreate, ClientContactResponse,
)
from app.schemas.base import PaginatedResponse, MessageResponse
from pydantic import BaseModel


class ClientBankDataCreate(BaseModel):
    bank_name: Optional[str] = None
    bank_agency: Optional[str] = None
    bank_account: Optional[str] = None
    bank_account_type: Optional[str] = None
    pix_key: Optional[str] = None
    pix_key_type: Optional[str] = None
    holder_name: Optional[str] = None
    holder_cpf_cnpj: Optional[str] = None
    is_primary: bool = False
    notes: Optional[str] = None

router = APIRouter(prefix="/clients", tags=["Clientes"])


@router.get("", response_model=PaginatedResponse[ClientResponse])
async def list_clients(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    person_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Client).where(Client.is_deleted.is_(False)).options(selectinload(Client.contacts))
    count_query = select(func.count()).select_from(Client).where(Client.is_deleted.is_(False))

    if search:
        search_filter = Client.name.ilike(f"%{search}%") | Client.cpf_cnpj.ilike(f"%{search}%") | Client.email.ilike(f"%{search}%")
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)
    if person_type:
        query = query.where(Client.person_type == person_type)
        count_query = count_query.where(Client.person_type == person_type)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size).order_by(Client.name))
    clients = result.scalars().all()

    return PaginatedResponse(
        items=[ClientResponse.model_validate(c) for c in clients],
        total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size if page_size > 0 else 0,
    )


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.cpf_cnpj:
        existing = await db.execute(select(Client).where(Client.cpf_cnpj == data.cpf_cnpj, Client.is_deleted.is_(False)))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="CPF/CNPJ já cadastrado")

    client_data = data.model_dump(exclude={"contacts"})
    client = Client(**client_data, created_by=current_user.id)
    db.add(client)
    await db.flush()

    for contact_data in (data.contacts or []):
        contact = ClientContact(**contact_data.model_dump(), client_id=client.id)
        db.add(contact)

    await db.flush()
    await db.refresh(client)
    result = await db.execute(select(Client).where(Client.id == client.id).options(selectinload(Client.contacts)))
    client = result.scalar_one()
    return ClientResponse.model_validate(client)


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(client_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.is_deleted.is_(False)).options(selectinload(Client.contacts))
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return ClientResponse.model_validate(client)


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: str, data: ClientUpdate,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Client).where(Client.id == client_id, Client.is_deleted.is_(False)))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    await db.flush()
    result = await db.execute(select(Client).where(Client.id == client_id).options(selectinload(Client.contacts)))
    client = result.scalar_one()
    return ClientResponse.model_validate(client)


@router.delete("/{client_id}", response_model=MessageResponse)
async def delete_client(client_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import datetime, timezone
    result = await db.execute(select(Client).where(Client.id == client_id, Client.is_deleted.is_(False)))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    client.is_deleted = True
    client.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return MessageResponse(message="Cliente removido com sucesso")


# ==================== CONTACTS ====================

@router.post("/{client_id}/contacts", response_model=ClientContactResponse, status_code=status.HTTP_201_CREATED)
async def add_contact(
    client_id: str, data: ClientContactCreate,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Client).where(Client.id == client_id, Client.is_deleted.is_(False)))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    contact = ClientContact(**data.model_dump(), client_id=client_id)
    db.add(contact)
    await db.flush()
    await db.refresh(contact)
    return ClientContactResponse.model_validate(contact)


@router.delete("/{client_id}/contacts/{contact_id}", response_model=MessageResponse)
async def remove_contact(
    client_id: str, contact_id: str,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ClientContact).where(ClientContact.id == contact_id, ClientContact.client_id == client_id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contato não encontrado")
    await db.delete(contact)
    await db.flush()
    return MessageResponse(message="Contato removido com sucesso")


# ==================== BANK DATA ====================

@router.get("/{client_id}/bank-data")
async def list_bank_data(client_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Client).where(Client.id == client_id, Client.is_deleted.is_(False)))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    result = await db.execute(select(ClientBankData).where(ClientBankData.client_id == client_id))
    items = result.scalars().all()
    return [{"id": b.id, "client_id": b.client_id, "bank_name": b.bank_name,
             "bank_agency": b.bank_agency, "bank_account": b.bank_account,
             "bank_account_type": b.bank_account_type, "pix_key": b.pix_key,
             "pix_key_type": b.pix_key_type, "holder_name": b.holder_name,
             "holder_cpf_cnpj": b.holder_cpf_cnpj, "is_primary": b.is_primary,
             "notes": b.notes} for b in items]


@router.post("/{client_id}/bank-data", status_code=status.HTTP_201_CREATED)
async def add_bank_data(client_id: str, data: ClientBankDataCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Client).where(Client.id == client_id, Client.is_deleted.is_(False)))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    bank = ClientBankData(client_id=client_id, **data.model_dump(exclude_unset=True))
    db.add(bank)
    await db.flush()
    await db.refresh(bank)
    return {"id": bank.id, "message": "Dados bancários adicionados"}


@router.delete("/{client_id}/bank-data/{bank_id}", response_model=MessageResponse)
async def delete_bank_data(client_id: str, bank_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ClientBankData).where(ClientBankData.id == bank_id, ClientBankData.client_id == client_id))
    bank = result.scalar_one_or_none()
    if not bank:
        raise HTTPException(status_code=404, detail="Dados bancários não encontrados")
    await db.delete(bank)
    await db.flush()
    return MessageResponse(message="Dados bancários removidos")
