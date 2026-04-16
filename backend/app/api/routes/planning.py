from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, WorkPhase, WorkTask, TaskDependency, Project
from app.schemas.planning import (
    WorkPhaseCreate, WorkPhaseUpdate, WorkPhaseResponse,
    WorkTaskCreate, WorkTaskUpdate, WorkTaskResponse,
    TaskDependencyResponse,
)
from app.schemas.base import MessageResponse

router = APIRouter(prefix="/planning", tags=["Planejamento / Cronograma"])


# ==================== PHASES ====================

@router.get("/projects/{project_id}/phases", response_model=list[WorkPhaseResponse])
async def list_phases(project_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(WorkPhase).where(WorkPhase.project_id == project_id, WorkPhase.is_deleted.is_(False))
        .options(selectinload(WorkPhase.tasks).selectinload(WorkTask.dependencies))
        .order_by(WorkPhase.sort_order)
    )
    phases = result.scalars().all()
    items = []
    for ph in phases:
        tasks = []
        for t in (ph.tasks or []):
            if t.is_deleted:
                continue
            deps = [TaskDependencyResponse(id=d.id, task_id=d.task_id, depends_on_id=d.depends_on_id, dependency_type=d.dependency_type) for d in (t.dependencies or [])]
            tasks.append(WorkTaskResponse(
                id=t.id, phase_id=t.phase_id, name=t.name, description=t.description,
                responsible_id=t.responsible_id, planned_start=t.planned_start,
                planned_end=t.planned_end, actual_start=t.actual_start, actual_end=t.actual_end,
                progress_percent=t.progress_percent, status=t.status,
                sort_order=t.sort_order, notes=t.notes, dependencies=deps,
            ))
        items.append(WorkPhaseResponse(
            id=ph.id, project_id=ph.project_id, name=ph.name, description=ph.description,
            sort_order=ph.sort_order, planned_start=ph.planned_start, planned_end=ph.planned_end,
            actual_start=ph.actual_start, actual_end=ph.actual_end,
            progress_percent=ph.progress_percent, status=ph.status,
            tasks=tasks, created_at=ph.created_at,
        ))
    return items


@router.post("/phases", response_model=WorkPhaseResponse, status_code=status.HTTP_201_CREATED)
async def create_phase(data: WorkPhaseCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Project).where(Project.id == data.project_id, Project.is_deleted.is_(False)))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Obra não encontrada")
    phase = WorkPhase(**data.model_dump())
    db.add(phase)
    await db.flush()
    await db.refresh(phase)
    return WorkPhaseResponse(
        id=phase.id, project_id=phase.project_id, name=phase.name,
        description=phase.description, sort_order=phase.sort_order,
        planned_start=phase.planned_start, planned_end=phase.planned_end,
        progress_percent=phase.progress_percent, status=phase.status,
        tasks=[], created_at=phase.created_at,
    )


@router.put("/phases/{phase_id}", response_model=WorkPhaseResponse)
async def update_phase(phase_id: str, data: WorkPhaseUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(WorkPhase).where(WorkPhase.id == phase_id, WorkPhase.is_deleted.is_(False)))
    phase = result.scalar_one_or_none()
    if not phase:
        raise HTTPException(status_code=404, detail="Fase não encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(phase, field, value)
    await db.flush()
    await db.refresh(phase)
    return WorkPhaseResponse(
        id=phase.id, project_id=phase.project_id, name=phase.name,
        description=phase.description, sort_order=phase.sort_order,
        planned_start=phase.planned_start, planned_end=phase.planned_end,
        actual_start=phase.actual_start, actual_end=phase.actual_end,
        progress_percent=phase.progress_percent, status=phase.status,
        tasks=[], created_at=phase.created_at,
    )


@router.delete("/phases/{phase_id}", response_model=MessageResponse)
async def delete_phase(phase_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import datetime, timezone
    result = await db.execute(select(WorkPhase).where(WorkPhase.id == phase_id, WorkPhase.is_deleted.is_(False)))
    phase = result.scalar_one_or_none()
    if not phase:
        raise HTTPException(status_code=404, detail="Fase não encontrada")
    phase.is_deleted = True
    phase.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return MessageResponse(message="Fase removida com sucesso")


# ==================== TASKS ====================

@router.post("/phases/{phase_id}/tasks", response_model=WorkTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(phase_id: str, data: WorkTaskCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(WorkPhase).where(WorkPhase.id == phase_id, WorkPhase.is_deleted.is_(False)))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Fase não encontrada")

    task_data = data.model_dump(exclude={"dependencies"})
    task = WorkTask(**task_data, phase_id=phase_id)
    db.add(task)
    await db.flush()

    for dep_data in (data.dependencies or []):
        dep = TaskDependency(task_id=task.id, depends_on_id=dep_data.depends_on_id, dependency_type=dep_data.dependency_type)
        db.add(dep)
    await db.flush()
    await db.refresh(task)
    return WorkTaskResponse(
        id=task.id, phase_id=task.phase_id, name=task.name, description=task.description,
        responsible_id=task.responsible_id, planned_start=task.planned_start,
        planned_end=task.planned_end, progress_percent=task.progress_percent,
        status=task.status, sort_order=task.sort_order, notes=task.notes,
    )


@router.put("/tasks/{task_id}", response_model=WorkTaskResponse)
async def update_task(task_id: str, data: WorkTaskUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(WorkTask).where(WorkTask.id == task_id, WorkTask.is_deleted.is_(False)))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    await db.flush()
    await db.refresh(task)
    return WorkTaskResponse(
        id=task.id, phase_id=task.phase_id, name=task.name, description=task.description,
        responsible_id=task.responsible_id, planned_start=task.planned_start,
        planned_end=task.planned_end, actual_start=task.actual_start, actual_end=task.actual_end,
        progress_percent=task.progress_percent, status=task.status,
        sort_order=task.sort_order, notes=task.notes,
    )


@router.delete("/tasks/{task_id}", response_model=MessageResponse)
async def delete_task(task_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import datetime, timezone
    result = await db.execute(select(WorkTask).where(WorkTask.id == task_id, WorkTask.is_deleted.is_(False)))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    task.is_deleted = True
    task.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return MessageResponse(message="Tarefa removida com sucesso")


# ==================== GANTT DATA ====================

@router.get("/projects/{project_id}/gantt")
async def get_gantt_data(project_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(WorkPhase).where(WorkPhase.project_id == project_id, WorkPhase.is_deleted.is_(False))
        .options(selectinload(WorkPhase.tasks).selectinload(WorkTask.dependencies))
        .order_by(WorkPhase.sort_order)
    )
    phases = result.scalars().all()
    gantt_items = []
    for ph in phases:
        gantt_items.append({
            "id": ph.id, "type": "phase", "name": ph.name,
            "planned_start": str(ph.planned_start) if ph.planned_start else None,
            "planned_end": str(ph.planned_end) if ph.planned_end else None,
            "actual_start": str(ph.actual_start) if ph.actual_start else None,
            "actual_end": str(ph.actual_end) if ph.actual_end else None,
            "progress": ph.progress_percent, "status": ph.status,
        })
        for t in sorted((t for t in (ph.tasks or []) if not t.is_deleted), key=lambda x: x.sort_order):
            deps = [d.depends_on_id for d in (t.dependencies or [])]
            gantt_items.append({
                "id": t.id, "type": "task", "name": t.name, "phase_id": ph.id,
                "planned_start": str(t.planned_start) if t.planned_start else None,
                "planned_end": str(t.planned_end) if t.planned_end else None,
                "actual_start": str(t.actual_start) if t.actual_start else None,
                "actual_end": str(t.actual_end) if t.actual_end else None,
                "progress": t.progress_percent, "status": t.status,
                "dependencies": deps,
            })
    return gantt_items
