from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from decimal import Decimal


class ProjectBase(BaseModel):
    name: str
    client_id: str
    type: str = "reforma_residencial"
    status: str = "rascunho"
    description: Optional[str] = None
    address_street: Optional[str] = None
    address_number: Optional[str] = None
    address_complement: Optional[str] = None
    address_neighborhood: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_zip: Optional[str] = None
    area_m2: Optional[Decimal] = None
    planned_start: Optional[date] = None
    planned_end: Optional[date] = None
    responsible_id: Optional[str] = None
    estimated_value: Optional[Decimal] = None
    notes: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    client_id: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    address_street: Optional[str] = None
    address_number: Optional[str] = None
    address_complement: Optional[str] = None
    address_neighborhood: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_zip: Optional[str] = None
    area_m2: Optional[Decimal] = None
    planned_start: Optional[date] = None
    planned_end: Optional[date] = None
    actual_start: Optional[date] = None
    actual_end: Optional[date] = None
    responsible_id: Optional[str] = None
    contract_id: Optional[str] = None
    estimated_value: Optional[Decimal] = None
    notes: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    code: Optional[str] = None
    client_id: str
    client_name: Optional[str] = None
    type: str
    status: str
    description: Optional[str] = None
    address_street: Optional[str] = None
    address_number: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    area_m2: Optional[Decimal] = None
    planned_start: Optional[date] = None
    planned_end: Optional[date] = None
    actual_start: Optional[date] = None
    actual_end: Optional[date] = None
    responsible_id: Optional[str] = None
    responsible_name: Optional[str] = None
    contract_id: Optional[str] = None
    estimated_value: Optional[Decimal] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
