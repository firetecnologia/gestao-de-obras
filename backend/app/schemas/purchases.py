from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal


class PurchaseRequestItemBase(BaseModel):
    description: str
    quantity: Decimal = Decimal("1")
    unit: Optional[str] = None
    estimated_cost: Optional[Decimal] = None
    notes: Optional[str] = None


class PurchaseRequestItemCreate(PurchaseRequestItemBase):
    pass


class PurchaseRequestItemResponse(PurchaseRequestItemBase):
    id: str
    request_id: str

    class Config:
        from_attributes = True


class PurchaseRequestBase(BaseModel):
    project_id: str
    phase_id: Optional[str] = None
    description: Optional[str] = None
    needed_by: Optional[date] = None
    notes: Optional[str] = None


class PurchaseRequestCreate(PurchaseRequestBase):
    items: Optional[List[PurchaseRequestItemCreate]] = []


class PurchaseRequestUpdate(BaseModel):
    description: Optional[str] = None
    status: Optional[str] = None
    needed_by: Optional[date] = None
    notes: Optional[str] = None


class PurchaseRequestResponse(BaseModel):
    id: str
    code: Optional[str] = None
    project_id: str
    project_name: Optional[str] = None
    phase_id: Optional[str] = None
    status: str
    description: Optional[str] = None
    needed_by: Optional[date] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    items: Optional[List[PurchaseRequestItemResponse]] = []

    class Config:
        from_attributes = True


class QuotationBase(BaseModel):
    purchase_request_id: str
    supplier_id: str
    total_value: Optional[Decimal] = None
    delivery_days: Optional[int] = None
    payment_conditions: Optional[str] = None
    notes: Optional[str] = None


class QuotationCreate(QuotationBase):
    pass


class QuotationResponse(QuotationBase):
    id: str
    is_selected: bool = False
    supplier_name: Optional[str] = None
    quoted_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PurchaseOrderItemBase(BaseModel):
    description: str
    quantity: Decimal = Decimal("1")
    unit: Optional[str] = None
    unit_price: Decimal = Decimal("0")


class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass


class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    id: str
    order_id: str
    total_price: Decimal = Decimal("0")

    class Config:
        from_attributes = True


class PurchaseOrderBase(BaseModel):
    purchase_request_id: Optional[str] = None
    supplier_id: str
    project_id: Optional[str] = None
    delivery_date: Optional[date] = None
    notes: Optional[str] = None


class PurchaseOrderCreate(PurchaseOrderBase):
    items: Optional[List[PurchaseOrderItemCreate]] = []


class PurchaseOrderUpdate(BaseModel):
    status: Optional[str] = None
    delivery_date: Optional[date] = None
    received_at: Optional[datetime] = None
    invoice_number: Optional[str] = None
    notes: Optional[str] = None


class PurchaseOrderResponse(BaseModel):
    id: str
    code: Optional[str] = None
    purchase_request_id: Optional[str] = None
    supplier_id: str
    supplier_name: Optional[str] = None
    project_id: Optional[str] = None
    status: str
    total_value: Decimal = Decimal("0")
    delivery_date: Optional[date] = None
    received_at: Optional[datetime] = None
    invoice_number: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    items: Optional[List[PurchaseOrderItemResponse]] = []

    class Config:
        from_attributes = True
