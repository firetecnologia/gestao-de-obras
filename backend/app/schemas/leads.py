from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class LeadInteractionBase(BaseModel):
    type: str
    description: Optional[str] = None
    date: Optional[datetime] = None


class LeadInteractionCreate(LeadInteractionBase):
    pass


class LeadInteractionResponse(LeadInteractionBase):
    id: str
    lead_id: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LeadBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    source: Optional[str] = None
    status: str = "novo"
    responsible_id: Optional[str] = None
    notes: Optional[str] = None
    next_followup: Optional[datetime] = None
    # Address fields
    address_street: Optional[str] = None
    address_number: Optional[str] = None
    address_complement: Optional[str] = None
    address_neighborhood: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_zip: Optional[str] = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    responsible_id: Optional[str] = None
    notes: Optional[str] = None
    lost_reason: Optional[str] = None
    next_followup: Optional[datetime] = None
    address_street: Optional[str] = None
    address_number: Optional[str] = None
    address_complement: Optional[str] = None
    address_neighborhood: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_zip: Optional[str] = None


class LeadConvertRequest(BaseModel):
    create_proposal: bool = False
    proposal_title: Optional[str] = None


class LeadResponse(LeadBase):
    id: str
    client_id: Optional[str] = None
    lost_reason: Optional[str] = None
    converted_at: Optional[datetime] = None
    responsible_name: Optional[str] = None
    created_at: Optional[datetime] = None
    interactions: Optional[List[LeadInteractionResponse]] = []

    class Config:
        from_attributes = True
