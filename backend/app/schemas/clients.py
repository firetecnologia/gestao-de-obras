from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ClientContactBase(BaseModel):
    name: str
    role: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    is_primary: bool = False
    notes: Optional[str] = None


class ClientContactCreate(ClientContactBase):
    pass


class ClientContactResponse(ClientContactBase):
    id: str
    client_id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ClientBase(BaseModel):
    person_type: str = "fisica"
    name: str
    company_name: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    phone2: Optional[str] = None
    address_street: Optional[str] = None
    address_number: Optional[str] = None
    address_complement: Optional[str] = None
    address_neighborhood: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_zip: Optional[str] = None
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    contacts: Optional[List[ClientContactCreate]] = []


class ClientUpdate(BaseModel):
    person_type: Optional[str] = None
    name: Optional[str] = None
    company_name: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    phone2: Optional[str] = None
    address_street: Optional[str] = None
    address_number: Optional[str] = None
    address_complement: Optional[str] = None
    address_neighborhood: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_zip: Optional[str] = None
    notes: Optional[str] = None


class ClientResponse(ClientBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    contacts: Optional[List[ClientContactResponse]] = []

    class Config:
        from_attributes = True
