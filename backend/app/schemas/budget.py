from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from decimal import Decimal


# ==================== SERVICE CATALOG ====================

class ServiceCatalogBase(BaseModel):
    code: Optional[str] = None
    stage: Optional[str] = None
    sub_stage: Optional[str] = None
    description: str
    unit: Optional[str] = None
    default_cost: Optional[Decimal] = None
    default_price: Optional[Decimal] = None
    price_origin: Optional[str] = None
    sinapi_ref: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class ServiceCatalogCreate(ServiceCatalogBase):
    pass


class ServiceCatalogUpdate(BaseModel):
    code: Optional[str] = None
    stage: Optional[str] = None
    sub_stage: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    default_cost: Optional[Decimal] = None
    default_price: Optional[Decimal] = None
    price_origin: Optional[str] = None
    sinapi_ref: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class ServiceCatalogResponse(ServiceCatalogBase):
    id: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


# ==================== MATERIAL CATALOG ====================

class MaterialCatalogBase(BaseModel):
    code: Optional[str] = None
    name: str
    category: Optional[str] = None
    unit: Optional[str] = None
    default_cost: Optional[Decimal] = None
    default_price: Optional[Decimal] = None
    preferred_supplier_id: Optional[str] = None
    cost_center: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class MaterialCatalogCreate(MaterialCatalogBase):
    pass


class MaterialCatalogUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    default_cost: Optional[Decimal] = None
    default_price: Optional[Decimal] = None
    preferred_supplier_id: Optional[str] = None
    cost_center: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class MaterialCatalogResponse(MaterialCatalogBase):
    id: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


# ==================== COMPOSITION CATALOG ====================

class CompositionItemBase(BaseModel):
    item_type: str = "material"
    description: str
    unit: Optional[str] = None
    coefficient: Decimal = Decimal("1")
    unit_cost: Decimal = Decimal("0")
    unit_price: Decimal = Decimal("0")
    service_catalog_id: Optional[str] = None
    material_catalog_id: Optional[str] = None


class CompositionItemCreate(CompositionItemBase):
    pass


class CompositionItemResponse(CompositionItemBase):
    id: str
    composition_id: str
    total_cost: Decimal = Decimal("0")
    total_price: Decimal = Decimal("0")

    class Config:
        from_attributes = True


class CompositionCatalogBase(BaseModel):
    name: str
    category: Optional[str] = None
    unit: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class CompositionCatalogCreate(CompositionCatalogBase):
    items: Optional[List[CompositionItemCreate]] = []


class CompositionCatalogUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class CompositionCatalogResponse(CompositionCatalogBase):
    id: str
    total_cost: Decimal = Decimal("0")
    total_price: Decimal = Decimal("0")
    items: Optional[List[CompositionItemResponse]] = []
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


# ==================== PROPOSAL HEADER ====================

class ProposalHeaderBase(BaseModel):
    address: Optional[str] = None
    responsible: Optional[str] = None
    architect: Optional[str] = None
    payment_method: Optional[str] = None
    deadline: Optional[str] = None
    observations: Optional[str] = None


class ProposalHeaderCreate(ProposalHeaderBase):
    pass


class ProposalHeaderUpdate(ProposalHeaderBase):
    pass


class ProposalHeaderResponse(ProposalHeaderBase):
    id: str
    proposal_id: str

    class Config:
        from_attributes = True


# ==================== PROPOSAL MATERIAL ITEMS ====================

class ProposalMaterialItemBase(BaseModel):
    material_catalog_id: Optional[str] = None
    description: str
    unit: Optional[str] = None
    quantity: Decimal = Decimal("1")
    unit_cost: Decimal = Decimal("0")
    suggested_price: Decimal = Decimal("0")
    unit_price: Decimal = Decimal("0")
    category: Optional[str] = None
    supplier_name: Optional[str] = None
    cost_center: Optional[str] = None
    room: Optional[str] = None
    stage: Optional[str] = None
    sort_order: int = 0
    notes: Optional[str] = None


class ProposalMaterialItemCreate(ProposalMaterialItemBase):
    pass


class ProposalMaterialItemUpdate(BaseModel):
    material_catalog_id: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit_cost: Optional[Decimal] = None
    suggested_price: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    category: Optional[str] = None
    supplier_name: Optional[str] = None
    cost_center: Optional[str] = None
    room: Optional[str] = None
    stage: Optional[str] = None
    sort_order: Optional[int] = None
    notes: Optional[str] = None


class ProposalMaterialItemResponse(ProposalMaterialItemBase):
    id: str
    proposal_id: str
    total_cost: Decimal = Decimal("0")
    total_price: Decimal = Decimal("0")

    class Config:
        from_attributes = True


# ==================== PROPOSAL SERVICE ITEMS ====================

class ProposalServiceItemBase(BaseModel):
    service_catalog_id: Optional[str] = None
    description: str
    unit: Optional[str] = None
    quantity: Decimal = Decimal("1")
    unit_cost: Decimal = Decimal("0")
    suggested_price: Decimal = Decimal("0")
    unit_price: Decimal = Decimal("0")
    stage: Optional[str] = None
    sub_stage: Optional[str] = None
    provider_name: Optional[str] = None
    service_type: Optional[str] = None
    sort_order: int = 0
    notes: Optional[str] = None


class ProposalServiceItemCreate(ProposalServiceItemBase):
    pass


class ProposalServiceItemUpdate(BaseModel):
    service_catalog_id: Optional[str] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit_cost: Optional[Decimal] = None
    suggested_price: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    stage: Optional[str] = None
    sub_stage: Optional[str] = None
    provider_name: Optional[str] = None
    service_type: Optional[str] = None
    sort_order: Optional[int] = None
    notes: Optional[str] = None


class ProposalServiceItemResponse(ProposalServiceItemBase):
    id: str
    proposal_id: str
    total_cost: Decimal = Decimal("0")
    total_price: Decimal = Decimal("0")

    class Config:
        from_attributes = True


# ==================== PROPOSAL ADDITIVE ITEMS ====================

class ProposalAdditiveItemBase(BaseModel):
    description: str
    unit: Optional[str] = None
    quantity: Decimal = Decimal("1")
    unit_cost: Decimal = Decimal("0")
    suggested_price: Decimal = Decimal("0")
    unit_price: Decimal = Decimal("0")
    status: str = "pendente"
    responsible: Optional[str] = None
    date: Optional[date] = None
    sort_order: int = 0
    notes: Optional[str] = None


class ProposalAdditiveItemCreate(ProposalAdditiveItemBase):
    pass


class ProposalAdditiveItemUpdate(BaseModel):
    description: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit_cost: Optional[Decimal] = None
    suggested_price: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    status: Optional[str] = None
    responsible: Optional[str] = None
    date: Optional[date] = None
    sort_order: Optional[int] = None
    notes: Optional[str] = None


class ProposalAdditiveItemResponse(ProposalAdditiveItemBase):
    id: str
    proposal_id: str
    total_cost: Decimal = Decimal("0")
    total_price: Decimal = Decimal("0")

    class Config:
        from_attributes = True


# ==================== PROPOSAL ROOMS ====================

class ProposalRoomBase(BaseModel):
    name: str
    width: Optional[Decimal] = None
    length: Optional[Decimal] = None
    height: Optional[Decimal] = None
    notes: Optional[str] = None
    sort_order: int = 0


class ProposalRoomCreate(ProposalRoomBase):
    pass


class ProposalRoomUpdate(BaseModel):
    name: Optional[str] = None
    width: Optional[Decimal] = None
    length: Optional[Decimal] = None
    height: Optional[Decimal] = None
    notes: Optional[str] = None
    sort_order: Optional[int] = None


class ProposalRoomResponse(ProposalRoomBase):
    id: str
    proposal_id: str
    perimeter: Optional[Decimal] = None
    area: Optional[Decimal] = None
    wall_area: Optional[Decimal] = None

    class Config:
        from_attributes = True


# ==================== PROPOSAL COMMERCIAL TERMS ====================

class ProposalCommercialTermsBase(BaseModel):
    payment_method: Optional[str] = None
    deadline: Optional[str] = None
    down_payment_percent: Optional[Decimal] = None
    down_payment_value: Optional[Decimal] = None
    num_installments: Optional[int] = None
    validity_days: Optional[int] = None
    scope_included: Optional[str] = None
    scope_excluded: Optional[str] = None
    commercial_notes: Optional[str] = None
    tax_percent: Optional[Decimal] = None
    discount_percent: Optional[Decimal] = None
    discount_value: Optional[Decimal] = None
    min_margin_percent: Optional[Decimal] = None


class ProposalCommercialTermsCreate(ProposalCommercialTermsBase):
    pass


class ProposalCommercialTermsUpdate(ProposalCommercialTermsBase):
    pass


class ProposalCommercialTermsResponse(ProposalCommercialTermsBase):
    id: str
    proposal_id: str

    class Config:
        from_attributes = True


# ==================== BUDGET SUMMARY ====================

class BudgetSummaryResponse(BaseModel):
    total_materials_cost: Decimal = Decimal("0")
    total_materials_price: Decimal = Decimal("0")
    total_services_cost: Decimal = Decimal("0")
    total_services_price: Decimal = Decimal("0")
    total_additives_cost: Decimal = Decimal("0")
    total_additives_price: Decimal = Decimal("0")
    total_direct_cost: Decimal = Decimal("0")
    total_sale_price: Decimal = Decimal("0")
    tax_value: Decimal = Decimal("0")
    discount_value: Decimal = Decimal("0")
    final_value: Decimal = Decimal("0")
    down_payment: Decimal = Decimal("0")
    balance_due: Decimal = Decimal("0")
    net_profit: Decimal = Decimal("0")
    margin_percent: Decimal = Decimal("0")
