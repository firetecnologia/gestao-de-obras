from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date, datetime, timezone, timedelta

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import (
    User, Project, Lead, Contract, ContractInstallment,
    FinancialEntry, PurchaseRequest, WorkTask, WorkDiary, WorkPhase
)

router = APIRouter(prefix="/dashboard", tags=["Dashboards"])


@router.get("/executive")
async def executive_dashboard(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()
    month_start = today.replace(day=1)

    # Active projects
    active = (await db.execute(
        select(func.count()).select_from(Project)
        .where(not Project.is_deleted, Project.status.in_(["em_andamento", "planejamento"]))
    )).scalar() or 0

    # Delayed projects
    delayed = (await db.execute(
        select(func.count()).select_from(Project)
        .where(not Project.is_deleted, Project.status == "em_andamento",
               Project.planned_end < today, Project.actual_end.is_(None))
    )).scalar() or 0

    # Revenue planned
    revenue_planned = (await db.execute(
        select(func.coalesce(func.sum(FinancialEntry.planned_amount), 0))
        .where(not FinancialEntry.is_deleted, FinancialEntry.type == "receita")
    )).scalar() or 0

    # Revenue received
    revenue_received = (await db.execute(
        select(func.coalesce(func.sum(FinancialEntry.actual_amount), 0))
        .where(not FinancialEntry.is_deleted, FinancialEntry.type == "receita", FinancialEntry.status == "pago")
    )).scalar() or 0

    # Total costs
    total_costs = (await db.execute(
        select(func.coalesce(func.sum(FinancialEntry.actual_amount), 0))
        .where(not FinancialEntry.is_deleted, FinancialEntry.type == "despesa")
    )).scalar() or 0

    # Overdue installments
    overdue_result = await db.execute(
        select(func.count(), func.coalesce(func.sum(ContractInstallment.amount), 0))
        .where(ContractInstallment.status.in_(["pendente", "atrasada"]),
               ContractInstallment.due_date < today)
    )
    overdue_row = overdue_result.one()

    # Pipeline leads count
    pipeline = (await db.execute(
        select(func.count()).select_from(Lead)
        .where(not Lead.is_deleted, Lead.status.notin_(["fechado_ganho", "fechado_perdido"]))
    )).scalar() or 0

    # Contracts this month
    contracts_month = (await db.execute(
        select(func.count()).select_from(Contract)
        .where(not Contract.is_deleted, Contract.created_at >= datetime(month_start.year, month_start.month, month_start.day, tzinfo=timezone.utc))
    )).scalar() or 0

    return {
        "active_projects": active,
        "delayed_projects": delayed,
        "revenue_planned": float(revenue_planned),
        "revenue_received": float(revenue_received),
        "total_costs": float(total_costs),
        "profit": float(revenue_received) - float(total_costs),
        "overdue_installments": overdue_row[0],
        "overdue_amount": float(overdue_row[1]),
        "pipeline_leads": pipeline,
        "contracts_this_month": contracts_month,
    }


@router.get("/operational")
async def operational_dashboard(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()

    # Delayed tasks
    delayed_tasks = (await db.execute(
        select(func.count()).select_from(WorkTask)
        .where(not WorkTask.is_deleted, WorkTask.status.in_(["nao_iniciada", "em_andamento"]),
               WorkTask.planned_end < today)
    )).scalar() or 0

    # Pending purchases
    pending_purchases = (await db.execute(
        select(func.count()).select_from(PurchaseRequest)
        .where(not PurchaseRequest.is_deleted, PurchaseRequest.status.in_(["rascunho", "aguardando_aprovacao", "aprovada"]))
    )).scalar() or 0

    # Recent diaries (last 7 days)
    week_ago = today - timedelta(days=7)
    recent_diaries = (await db.execute(
        select(func.count()).select_from(WorkDiary)
        .where(not WorkDiary.is_deleted, WorkDiary.date >= week_ago)
    )).scalar() or 0

    # Projects by status
    project_status = await db.execute(
        select(Project.status, func.count())
        .where(not Project.is_deleted)
        .group_by(Project.status)
    )
    project_status_dict = {row[0]: row[1] for row in project_status.all()}

    # Lead pipeline
    lead_pipeline = await db.execute(
        select(Lead.status, func.count())
        .where(not Lead.is_deleted)
        .group_by(Lead.status)
    )
    lead_pipeline_dict = {row[0]: row[1] for row in lead_pipeline.all()}

    # Phases with delays
    delayed_phases_result = await db.execute(
        select(WorkPhase.name, WorkPhase.planned_end, WorkPhase.project_id)
        .where(not WorkPhase.is_deleted, WorkPhase.status.in_(["nao_iniciada", "em_andamento"]),
               WorkPhase.planned_end < today)
        .limit(10)
    )
    delayed_phases = [{"name": r[0], "planned_end": str(r[1]), "project_id": r[2]} for r in delayed_phases_result.all()]

    return {
        "delayed_tasks": delayed_tasks,
        "pending_purchases": pending_purchases,
        "recent_diaries": recent_diaries,
        "projects_by_status": project_status_dict,
        "lead_pipeline": lead_pipeline_dict,
        "delayed_phases": delayed_phases,
    }
