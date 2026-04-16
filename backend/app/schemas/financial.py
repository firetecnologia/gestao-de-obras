from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from decimal import Decimal


class FinancialEntryBase(BaseModel):
    project_id: Optional[str] = None
    type: str  # receita/despesa
    category: Optional[str] = None
    cost_center: Optional[str] = None
    description: str
    planned_amount: Optional[Decimal] = None
    actual_amount: Optional[Decimal] = None
    due_date: Optional[date] = None
    status: str = "pendente"
    supplier_id: Optional[str] = None
    contract_installment_id: Optional[str] = None
    purchase_order_id: Optional[str] = None
    notes: Optional[str] = None


class FinancialEntryCreate(FinancialEntryBase):
    pass


class FinancialEntryUpdate(BaseModel):
    project_id: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None
    cost_center: Optional[str] = None
    description: Optional[str] = None
    planned_amount: Optional[Decimal] = None
    actual_amount: Optional[Decimal] = None
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    status: Optional[str] = None
    supplier_id: Optional[str] = None
    proof_document: Optional[str] = None
    notes: Optional[str] = None


class FinancialEntryResponse(BaseModel):
    id: str
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    type: str
    category: Optional[str] = None
    cost_center: Optional[str] = None
    description: str
    planned_amount: Optional[Decimal] = None
    actual_amount: Optional[Decimal] = None
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    status: str
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BillingRecordBase(BaseModel):
    installment_id: str
    action_date: datetime
    action_type: str
    description: Optional[str] = None
    status: str = "pendente"
    next_action_date: Optional[date] = None


class BillingRecordCreate(BillingRecordBase):
    pass


class BillingRecordResponse(BillingRecordBase):
    id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DocumentBase(BaseModel):
    project_id: Optional[str] = None
    client_id: Optional[str] = None
    contract_id: Optional[str] = None
    category: str = "outro"
    title: str
    notes: Optional[str] = None


class DocumentResponse(BaseModel):
    id: str
    project_id: Optional[str] = None
    client_id: Optional[str] = None
    contract_id: Optional[str] = None
    category: str
    title: str
    file_path: str
    file_name: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    version: int = 1
    notes: Optional[str] = None
    uploaded_by: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ClosingChecklistBase(BaseModel):
    project_id: str
    items: Optional[str] = None
    notes: Optional[str] = None


class ClosingChecklistUpdate(BaseModel):
    items: Optional[str] = None
    delivery_term_signed: Optional[bool] = None
    final_docs_delivered: Optional[bool] = None
    final_report_generated: Optional[bool] = None
    notes: Optional[str] = None


class ClosingChecklistResponse(BaseModel):
    id: str
    project_id: str
    items: Optional[str] = None
    delivery_term_signed: bool = False
    final_docs_delivered: bool = False
    final_report_generated: bool = False
    closed_at: Optional[datetime] = None
    closed_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    active_projects: int = 0
    delayed_projects: int = 0
    total_revenue_planned: Decimal = Decimal("0")
    total_revenue_received: Decimal = Decimal("0")
    total_costs: Decimal = Decimal("0")
    overdue_installments: int = 0
    overdue_amount: Decimal = Decimal("0")
    pipeline_leads: int = 0
    contracts_this_month: int = 0
    pending_purchases: int = 0
    pending_tasks: int = 0
    recent_diaries: int = 0
