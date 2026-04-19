from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SupplierBase(BaseModel):
    name: str
    company_name: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    inscricao_estadual: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    phone2: Optional[str] = None
    contact_name: Optional[str] = None
    specialty: Optional[str] = None
    billing_type: Optional[str] = None
    average_deadline_days: Optional[int] = None
    address_street: Optional[str] = None
    address_number: Optional[str] = None
    address_complement: Optional[str] = None
    address_neighborhood: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_zip: Optional[str] = None
    region: Optional[str] = None
    bank_name: Optional[str] = None
    bank_agency: Optional[str] = None
    bank_account: Optional[str] = None
    bank_account_type: Optional[str] = None
    pix_key: Optional[str] = None
    pix_key_type: Optional[str] = None
    bank_holder_name: Optional[str] = None
    bank_holder_cpf_cnpj: Optional[str] = None
    notes: Optional[str] = None
    rating: Optional[int] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    inscricao_estadual: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    phone2: Optional[str] = None
    contact_name: Optional[str] = None
    specialty: Optional[str] = None
    billing_type: Optional[str] = None
    average_deadline_days: Optional[int] = None
    address_street: Optional[str] = None
    address_number: Optional[str] = None
    address_complement: Optional[str] = None
    address_neighborhood: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_zip: Optional[str] = None
    region: Optional[str] = None
    bank_name: Optional[str] = None
    bank_agency: Optional[str] = None
    bank_account: Optional[str] = None
    bank_account_type: Optional[str] = None
    pix_key: Optional[str] = None
    pix_key_type: Optional[str] = None
    bank_holder_name: Optional[str] = None
    bank_holder_cpf_cnpj: Optional[str] = None
    notes: Optional[str] = None
    rating: Optional[int] = None


class SupplierResponse(SupplierBase):
    id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
