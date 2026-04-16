from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    email: str
    name: str
    phone: Optional[str] = None
    role_id: Optional[str] = None
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    role_id: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    role_id: Optional[str] = None
    role_name: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None


class RoleCreate(RoleBase):
    permission_ids: Optional[List[str]] = []


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[str]] = None


class RoleResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    is_system: bool = False
    permissions: Optional[List[str]] = []

    class Config:
        from_attributes = True


class PermissionResponse(BaseModel):
    id: str
    module: str
    action: str
    description: Optional[str] = None

    class Config:
        from_attributes = True
