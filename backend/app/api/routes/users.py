from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from app.core.database import get_db
from app.core.security import get_password_hash
from app.core.deps import get_current_user
from app.models.models import User, Role, Permission
from app.schemas.users import (
    UserCreate, UserUpdate, UserResponse,
    RoleCreate, RoleUpdate, RoleResponse,
    PermissionResponse,
)
from app.schemas.base import PaginatedResponse, MessageResponse

router = APIRouter(prefix="/users", tags=["Usuários"])


@router.get("", response_model=PaginatedResponse[UserResponse])
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(User).where(not User.is_deleted)
    count_query = select(func.count()).select_from(User).where(not User.is_deleted)

    if search:
        query = query.where(User.name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%"))
        count_query = count_query.where(User.name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%"))

    total = (await db.execute(count_query)).scalar() or 0
    query = query.offset((page - 1) * page_size).limit(page_size).order_by(User.name)
    result = await db.execute(query)
    users = result.scalars().all()

    return PaginatedResponse(
        items=[UserResponse(
            id=u.id, email=u.email, name=u.name, phone=u.phone,
            role_id=u.role_id, is_active=u.is_active, created_at=u.created_at,
            last_login=u.last_login,
        ) for u in users],
        total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size if page_size > 0 else 0,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")

    user = User(
        email=data.email,
        password_hash=get_password_hash(data.password),
        name=data.name,
        phone=data.phone,
        role_id=data.role_id,
        is_active=data.is_active,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return UserResponse(
        id=user.id, email=user.email, name=user.name, phone=user.phone,
        role_id=user.role_id, is_active=user.is_active, created_at=user.created_at,
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(User).where(User.id == user_id, not User.is_deleted))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return UserResponse(
        id=user.id, email=user.email, name=user.name, phone=user.phone,
        role_id=user.role_id, is_active=user.is_active, created_at=user.created_at,
        last_login=user.last_login,
    )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str, data: UserUpdate,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(User).where(User.id == user_id, not User.is_deleted))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    update_data = data.model_dump(exclude_unset=True)
    if "password" in update_data:
        user.password_hash = get_password_hash(update_data.pop("password"))
    for field, value in update_data.items():
        setattr(user, field, value)
    await db.flush()
    await db.refresh(user)
    return UserResponse(
        id=user.id, email=user.email, name=user.name, phone=user.phone,
        role_id=user.role_id, is_active=user.is_active, created_at=user.created_at,
    )


@router.delete("/{user_id}", response_model=MessageResponse)
async def delete_user(user_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import datetime, timezone
    result = await db.execute(select(User).where(User.id == user_id, not User.is_deleted))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    user.is_deleted = True
    user.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return MessageResponse(message="Usuário removido com sucesso")


# ==================== ROLES ====================

roles_router = APIRouter(prefix="/roles", tags=["Perfis"])


@roles_router.get("", response_model=list[RoleResponse])
async def list_roles(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Role).order_by(Role.name))
    roles = result.scalars().all()
    items = []
    for r in roles:
        perms = []
        if r.permissions:
            perms = [f"{p.module}.{p.action}" for p in r.permissions]
        items.append(RoleResponse(id=r.id, name=r.name, description=r.description, is_system=r.is_system, permissions=perms))
    return items


@roles_router.post("", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(data: RoleCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    role = Role(name=data.name, description=data.description)
    if data.permission_ids:
        result = await db.execute(select(Permission).where(Permission.id.in_(data.permission_ids)))
        role.permissions = list(result.scalars().all())
    db.add(role)
    await db.flush()
    await db.refresh(role)
    return RoleResponse(id=role.id, name=role.name, description=role.description)


@roles_router.put("/{role_id}", response_model=RoleResponse)
async def update_role(role_id: str, data: RoleUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")
    if data.name is not None:
        role.name = data.name
    if data.description is not None:
        role.description = data.description
    if data.permission_ids is not None:
        result = await db.execute(select(Permission).where(Permission.id.in_(data.permission_ids)))
        role.permissions = list(result.scalars().all())
    await db.flush()
    return RoleResponse(id=role.id, name=role.name, description=role.description)


@roles_router.delete("/{role_id}", response_model=MessageResponse)
async def delete_role(role_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Perfil não encontrado")
    if role.is_system:
        raise HTTPException(status_code=400, detail="Perfil de sistema não pode ser removido")
    await db.delete(role)
    await db.flush()
    return MessageResponse(message="Perfil removido com sucesso")


# ==================== PERMISSIONS ====================

permissions_router = APIRouter(prefix="/permissions", tags=["Permissões"])


@permissions_router.get("", response_model=list[PermissionResponse])
async def list_permissions(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Permission).order_by(Permission.module, Permission.action))
    return [PermissionResponse(id=p.id, module=p.module, action=p.action, description=p.description) for p in result.scalars().all()]
