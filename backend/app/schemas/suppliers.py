from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SupplierBase(BaseModel):
    name: str
    company_name: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    region: Optional[str] = None
    notes: Optional[str] = None
    rating: Optional[int] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    region: Optional[str] = None
    notes: Optional[str] = None
    rating: Optional[int] = None


class SupplierResponse(SupplierBase):
    id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
