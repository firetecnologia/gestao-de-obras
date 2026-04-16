from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


class ContractInstallmentBase(BaseModel):
    installment_number: int
    description: Optional[str] = None
    due_date: date
    amount: Decimal
    status: str = "pendente"
    notes: Optional[str] = None


class ContractInstallmentCreate(ContractInstallmentBase):
    pass


class ContractInstallmentUpdate(BaseModel):
    description: Optional[str] = None
    due_date: Optional[date] = None
    amount: Optional[Decimal] = None
    status: Optional[str] = None
    paid_at: Optional[datetime] = None
    paid_amount: Optional[Decimal] = None
    notes: Optional[str] = None


class ContractInstallmentResponse(ContractInstallmentBase):
    id: str
    contract_id: str
    paid_at: Optional[datetime] = None
    paid_amount: Optional[Decimal] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ContractBase(BaseModel):
    proposal_id: Optional[str] = None
    client_id: str
    title: str
    description: Optional[str] = None
    scope_summary: Optional[str] = None
    status: str = "rascunho"
    total_value: Decimal = Decimal("0")
    payment_conditions: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None


class ContractCreate(ContractBase):
    installments: Optional[List[ContractInstallmentCreate]] = []


class ContractUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scope_summary: Optional[str] = None
    status: Optional[str] = None
    total_value: Optional[Decimal] = None
    payment_conditions: Optional[str] = None
    signed_at: Optional[datetime] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None


class ContractResponse(BaseModel):
    id: str
    code: Optional[str] = None
    proposal_id: Optional[str] = None
    client_id: str
    client_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    scope_summary: Optional[str] = None
    status: str
    total_value: Decimal
    payment_conditions: Optional[str] = None
    signed_at: Optional[datetime] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    installments: Optional[List[ContractInstallmentResponse]] = []

    class Config:
        from_attributes = True
