from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


class ProposalItemBase(BaseModel):
    category: Optional[str] = None
    subcategory: Optional[str] = None
    description: str
    item_type: str = "servico"
    unit: Optional[str] = None
    quantity: Decimal = Decimal("1")
    unit_cost: Decimal = Decimal("0")
    markup_percent: Optional[Decimal] = None
    unit_price: Decimal = Decimal("0")
    is_optional: bool = False
    is_excluded: bool = False
    sort_order: int = 0
    notes: Optional[str] = None


class ProposalItemCreate(ProposalItemBase):
    pass


class ProposalItemUpdate(BaseModel):
    category: Optional[str] = None
    subcategory: Optional[str] = None
    description: Optional[str] = None
    item_type: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit_cost: Optional[Decimal] = None
    markup_percent: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    is_optional: Optional[bool] = None
    is_excluded: Optional[bool] = None
    sort_order: Optional[int] = None
    notes: Optional[str] = None


class ProposalItemResponse(ProposalItemBase):
    id: str
    proposal_id: str
    total_cost: Decimal = Decimal("0")
    total_price: Decimal = Decimal("0")

    class Config:
        from_attributes = True


class ProposalBase(BaseModel):
    lead_id: Optional[str] = None
    client_id: Optional[str] = None
    project_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    status: str = "rascunho"
    markup_percent: Optional[Decimal] = None
    discount: Decimal = Decimal("0")
    valid_until: Optional[date] = None
    notes: Optional[str] = None


class ProposalCreate(ProposalBase):
    items: Optional[List[ProposalItemCreate]] = []


class ProposalUpdate(BaseModel):
    lead_id: Optional[str] = None
    client_id: Optional[str] = None
    project_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    markup_percent: Optional[Decimal] = None
    discount: Optional[Decimal] = None
    valid_until: Optional[date] = None
    notes: Optional[str] = None


class ProposalVersionResponse(BaseModel):
    id: str
    proposal_id: str
    version_number: int
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProposalResponse(BaseModel):
    id: str
    code: Optional[str] = None
    lead_id: Optional[str] = None
    client_id: Optional[str] = None
    project_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    status: str
    total_cost: Decimal = Decimal("0")
    total_price: Decimal = Decimal("0")
    markup_percent: Optional[Decimal] = None
    discount: Decimal = Decimal("0")
    valid_until: Optional[date] = None
    notes: Optional[str] = None
    approved_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    items: Optional[List[ProposalItemResponse]] = []
    versions: Optional[List[ProposalVersionResponse]] = []

    class Config:
        from_attributes = True
