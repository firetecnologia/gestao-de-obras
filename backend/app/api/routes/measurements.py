from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from datetime import datetime, timezone, date
from decimal import Decimal

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import (
    User, Measurement, MeasurementAttachment, Project, WorkPhase, FinancialEntry
)
from app.schemas.base import PaginatedResponse, MessageResponse
from pydantic import BaseModel


class MeasurementCreate(BaseModel):
    project_id: str
    phase_id: Optional[str] = None
    date: date
    percent_complete: Optional[float] = None
    measured_value: Optional[float] = None
    notes: Optional[str] = None
    responsible_name: Optional[str] = None


class MeasurementUpdate(BaseModel):
    percent_complete: Optional[float] = None
    measured_value: Optional[float] = None
    notes: Optional[str] = None
    date: Optional[date] = None


class MeasurementResponse(BaseModel):
    id: str
    project_id: str
    phase_id: Optional[str] = None
    measurement_number: int
    date: date
    percent_complete: Optional[float] = None
    measured_value: Optional[float] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    phase_name: Optional[str] = None

    class Config:
        from_attributes = True


router = APIRouter(prefix="/measurements", tags=["Medições"])


@router.get("", response_model=PaginatedResponse[MeasurementResponse])
async def list_measurements(
    project_id: Optional[str] = None,
    phase_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Measurement).where(Measurement.is_deleted.is_(False))
    count_query = select(func.count()).select_from(Measurement).where(Measurement.is_deleted.is_(False))

    if project_id:
        query = query.where(Measurement.project_id == project_id)
        count_query = count_query.where(Measurement.project_id == project_id)
    if phase_id:
        query = query.where(Measurement.phase_id == phase_id)
        count_query = count_query.where(Measurement.phase_id == phase_id)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size).order_by(Measurement.date.desc()))
    measurements = result.scalars().all()

    items = []
    for m in measurements:
        phase_name = None
        if m.phase_id:
            phase_result = await db.execute(select(WorkPhase.name).where(WorkPhase.id == m.phase_id))
            phase_name = phase_result.scalar_one_or_none()
        items.append(MeasurementResponse(
            id=m.id, project_id=m.project_id, phase_id=m.phase_id,
            measurement_number=m.measurement_number, date=m.date,
            percent_complete=float(m.percent_complete) if m.percent_complete is not None else None,
            measured_value=float(m.measured_value) if m.measured_value is not None else None,
            notes=m.notes, created_at=m.created_at, phase_name=phase_name,
        ))

    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size if page_size > 0 else 0,
    )


@router.post("", response_model=MeasurementResponse, status_code=status.HTTP_201_CREATED)
async def create_measurement(
    data: MeasurementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify project exists
    project_result = await db.execute(select(Project).where(Project.id == data.project_id, Project.is_deleted.is_(False)))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Obra não encontrada")

    # Get next measurement number (use MAX to avoid reuse after deletion)
    max_number = (await db.execute(
        select(func.coalesce(func.max(Measurement.measurement_number), 0))
        .where(Measurement.project_id == data.project_id)
    )).scalar() or 0
    next_number = max_number + 1

    measurement = Measurement(
        project_id=data.project_id,
        phase_id=data.phase_id,
        measurement_number=next_number,
        date=data.date,
        percent_complete=data.percent_complete,
        measured_value=data.measured_value,
        notes=data.notes,
        created_by=current_user.id,
    )
    db.add(measurement)
    await db.flush()

    # AUTOMATION: Update phase progress if phase_id provided
    if data.phase_id and data.percent_complete is not None:
        phase_result = await db.execute(select(WorkPhase).where(WorkPhase.id == data.phase_id))
        phase = phase_result.scalar_one_or_none()
        if phase:
            phase.progress_percent = int(data.percent_complete)
            if data.percent_complete >= 100:
                phase.status = "concluida"
                phase.actual_end = data.date
            elif data.percent_complete > 0:
                phase.status = "em_andamento"
                if not phase.actual_start:
                    phase.actual_start = data.date
            else:
                phase.status = "nao_iniciada"
            await db.flush()

    # AUTOMATION: Create financial reflection for next payment
    if data.measured_value and float(data.measured_value) > 0:
        financial_entry = FinancialEntry(
            project_id=data.project_id,
            type="receita",
            category="medicao",
            description=f"Medição #{next_number} - {project.name}",
            planned_amount=Decimal(str(data.measured_value)),
            status="pendente",
            created_by=current_user.id,
        )
        db.add(financial_entry)
        await db.flush()

    await db.refresh(measurement)
    return MeasurementResponse(
        id=measurement.id, project_id=measurement.project_id,
        phase_id=measurement.phase_id, measurement_number=measurement.measurement_number,
        date=measurement.date,
        percent_complete=float(measurement.percent_complete) if measurement.percent_complete is not None else None,
        measured_value=float(measurement.measured_value) if measurement.measured_value is not None else None,
        notes=measurement.notes, created_at=measurement.created_at,
    )


@router.put("/{measurement_id}", response_model=MeasurementResponse)
async def update_measurement(
    measurement_id: str,
    data: MeasurementUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Measurement).where(Measurement.id == measurement_id, Measurement.is_deleted.is_(False)))
    measurement = result.scalar_one_or_none()
    if not measurement:
        raise HTTPException(status_code=404, detail="Medição não encontrada")
    updated_fields = data.model_dump(exclude_unset=True)
    for field, value in updated_fields.items():
        setattr(measurement, field, value)
    await db.flush()

    # AUTOMATION: Sync phase progress when percent_complete is updated
    if "percent_complete" in updated_fields and measurement.phase_id:
        pct = measurement.percent_complete
        if pct is not None:
            phase_result = await db.execute(select(WorkPhase).where(WorkPhase.id == measurement.phase_id))
            phase = phase_result.scalar_one_or_none()
            if phase:
                phase.progress_percent = int(pct)
                if pct >= 100:
                    phase.status = "concluida"
                    phase.actual_end = measurement.date
                elif pct > 0:
                    phase.status = "em_andamento"
                    if not phase.actual_start:
                        phase.actual_start = measurement.date
                else:
                    phase.status = "nao_iniciada"
                await db.flush()

    await db.refresh(measurement)
    return MeasurementResponse(
        id=measurement.id, project_id=measurement.project_id,
        phase_id=measurement.phase_id, measurement_number=measurement.measurement_number,
        date=measurement.date,
        percent_complete=float(measurement.percent_complete) if measurement.percent_complete is not None else None,
        measured_value=float(measurement.measured_value) if measurement.measured_value is not None else None,
        notes=measurement.notes, created_at=measurement.created_at,
    )


@router.delete("/{measurement_id}", response_model=MessageResponse)
async def delete_measurement(
    measurement_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Measurement).where(Measurement.id == measurement_id, Measurement.is_deleted.is_(False)))
    measurement = result.scalar_one_or_none()
    if not measurement:
        raise HTTPException(status_code=404, detail="Medição não encontrada")
    measurement.is_deleted = True
    measurement.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return MessageResponse(message="Medição removida com sucesso")
