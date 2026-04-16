from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, Project, Client
from app.schemas.projects import ProjectCreate, ProjectUpdate, ProjectResponse
from app.schemas.base import PaginatedResponse, MessageResponse

router = APIRouter(prefix="/projects", tags=["Obras"])


@router.get("", response_model=PaginatedResponse[ProjectResponse])
async def list_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    type_filter: Optional[str] = Query(None, alias="type"),
    client_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Project).where(Project.is_deleted.is_(False)).options(
        selectinload(Project.client), selectinload(Project.responsible)
    )
    count_query = select(func.count()).select_from(Project).where(Project.is_deleted.is_(False))

    if search:
        sf = Project.name.ilike(f"%{search}%") | Project.code.ilike(f"%{search}%")
        query = query.where(sf)
        count_query = count_query.where(sf)
    if status_filter:
        query = query.where(Project.status == status_filter)
        count_query = count_query.where(Project.status == status_filter)
    if type_filter:
        query = query.where(Project.type == type_filter)
        count_query = count_query.where(Project.type == type_filter)
    if client_id:
        query = query.where(Project.client_id == client_id)
        count_query = count_query.where(Project.client_id == client_id)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size).order_by(Project.created_at.desc()))
    projects = result.scalars().all()

    items = []
    for p in projects:
        items.append(ProjectResponse(
            id=p.id, name=p.name, code=p.code, client_id=p.client_id,
            client_name=p.client.name if p.client else None,
            type=p.type, status=p.status, description=p.description,
            address_street=p.address_street, address_number=p.address_number,
            address_city=p.address_city, address_state=p.address_state,
            area_m2=p.area_m2, planned_start=p.planned_start, planned_end=p.planned_end,
            actual_start=p.actual_start, actual_end=p.actual_end,
            responsible_id=p.responsible_id,
            responsible_name=p.responsible.name if p.responsible else None,
            contract_id=p.contract_id, estimated_value=p.estimated_value,
            notes=p.notes, created_at=p.created_at,
        ))

    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size if page_size > 0 else 0,
    )


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Verify client exists
    client_result = await db.execute(select(Client).where(Client.id == data.client_id, Client.is_deleted.is_(False)))
    client = client_result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=400, detail="Cliente não encontrado")

    # Generate code
    count = (await db.execute(select(func.count()).select_from(Project))).scalar() or 0
    code = f"OBR-{count + 1:04d}"

    project = Project(**data.model_dump(), code=code)
    db.add(project)
    await db.flush()
    await db.refresh(project)
    return ProjectResponse(
        id=project.id, name=project.name, code=project.code, client_id=project.client_id,
        client_name=client.name, type=project.type, status=project.status,
        description=project.description, planned_start=project.planned_start,
        planned_end=project.planned_end, estimated_value=project.estimated_value,
        created_at=project.created_at,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.is_deleted.is_(False))
        .options(selectinload(Project.client), selectinload(Project.responsible))
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Obra não encontrada")
    return ProjectResponse(
        id=p.id, name=p.name, code=p.code, client_id=p.client_id,
        client_name=p.client.name if p.client else None,
        type=p.type, status=p.status, description=p.description,
        address_street=p.address_street, address_number=p.address_number,
        address_city=p.address_city, address_state=p.address_state,
        area_m2=p.area_m2, planned_start=p.planned_start, planned_end=p.planned_end,
        actual_start=p.actual_start, actual_end=p.actual_end,
        responsible_id=p.responsible_id,
        responsible_name=p.responsible.name if p.responsible else None,
        contract_id=p.contract_id, estimated_value=p.estimated_value,
        notes=p.notes, created_at=p.created_at,
    )


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, data: ProjectUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Project).where(Project.id == project_id, Project.is_deleted.is_(False)))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Obra não encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    await db.flush()
    result = await db.execute(
        select(Project).where(Project.id == project_id)
        .options(selectinload(Project.client), selectinload(Project.responsible))
    )
    p = result.scalar_one()
    return ProjectResponse(
        id=p.id, name=p.name, code=p.code, client_id=p.client_id,
        client_name=p.client.name if p.client else None,
        type=p.type, status=p.status, description=p.description,
        planned_start=p.planned_start, planned_end=p.planned_end,
        estimated_value=p.estimated_value, created_at=p.created_at,
    )


@router.delete("/{project_id}", response_model=MessageResponse)
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import datetime, timezone
    result = await db.execute(select(Project).where(Project.id == project_id, Project.is_deleted.is_(False)))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Obra não encontrada")
    project.is_deleted = True
    project.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return MessageResponse(message="Obra removida com sucesso")
