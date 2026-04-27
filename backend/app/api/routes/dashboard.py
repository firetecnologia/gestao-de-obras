from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date, datetime, timezone, timedelta

from app.core.database import get_db
from app.core.deps import get_current_user
from typing import Optional
from app.models.models import (
    User, Project, Lead, Contract, ContractInstallment,
    FinancialEntry, PurchaseRequest, WorkTask, WorkDiary, WorkPhase,
    Client, Measurement, Proposal,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboards"])


@router.get("/executive")
async def executive_dashboard(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()
    month_start = today.replace(day=1)

    # Active projects
    active = (await db.execute(
        select(func.count()).select_from(Project)
        .where(Project.is_deleted.is_(False), Project.status.in_(["em_andamento", "planejamento"]))
    )).scalar() or 0

    # Delayed projects
    delayed = (await db.execute(
        select(func.count()).select_from(Project)
        .where(Project.is_deleted.is_(False), Project.status == "em_andamento",
               Project.planned_end < today, Project.actual_end.is_(None))
    )).scalar() or 0

    # Revenue planned
    revenue_planned = (await db.execute(
        select(func.coalesce(func.sum(FinancialEntry.planned_amount), 0))
        .where(FinancialEntry.is_deleted.is_(False), FinancialEntry.type == "receita")
    )).scalar() or 0

    # Revenue received
    revenue_received = (await db.execute(
        select(func.coalesce(func.sum(FinancialEntry.actual_amount), 0))
        .where(FinancialEntry.is_deleted.is_(False), FinancialEntry.type == "receita", FinancialEntry.status == "pago")
    )).scalar() or 0

    # Total costs
    total_costs = (await db.execute(
        select(func.coalesce(func.sum(FinancialEntry.actual_amount), 0))
        .where(FinancialEntry.is_deleted.is_(False), FinancialEntry.type == "despesa")
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
        .where(Lead.is_deleted.is_(False), Lead.status.notin_(["fechado_ganho", "fechado_perdido"]))
    )).scalar() or 0

    # Contracts this month
    contracts_month = (await db.execute(
        select(func.count()).select_from(Contract)
        .where(Contract.is_deleted.is_(False), Contract.created_at >= datetime(month_start.year, month_start.month, month_start.day, tzinfo=timezone.utc))
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
        .where(WorkTask.is_deleted.is_(False), WorkTask.status.in_(["nao_iniciada", "em_andamento"]),
               WorkTask.planned_end < today)
    )).scalar() or 0

    # Pending purchases
    pending_purchases = (await db.execute(
        select(func.count()).select_from(PurchaseRequest)
        .where(PurchaseRequest.is_deleted.is_(False), PurchaseRequest.status.in_(["rascunho", "aguardando_aprovacao", "aprovada"]))
    )).scalar() or 0

    # Recent diaries (last 7 days)
    week_ago = today - timedelta(days=7)
    recent_diaries = (await db.execute(
        select(func.count()).select_from(WorkDiary)
        .where(WorkDiary.is_deleted.is_(False), WorkDiary.date >= week_ago)
    )).scalar() or 0

    # Projects by status
    project_status = await db.execute(
        select(Project.status, func.count())
        .where(Project.is_deleted.is_(False))
        .group_by(Project.status)
    )
    project_status_dict = {row[0]: row[1] for row in project_status.all()}

    # Lead pipeline
    lead_pipeline = await db.execute(
        select(Lead.status, func.count())
        .where(Lead.is_deleted.is_(False))
        .group_by(Lead.status)
    )
    lead_pipeline_dict = {row[0]: row[1] for row in lead_pipeline.all()}

    # Phases with delays
    delayed_phases_result = await db.execute(
        select(WorkPhase.name, WorkPhase.planned_end, WorkPhase.project_id)
        .where(WorkPhase.is_deleted.is_(False), WorkPhase.status.in_(["nao_iniciada", "em_andamento"]),
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


@router.get("/by-project/{project_id}")
async def dashboard_by_project(project_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Dashboard data filtered by a specific project."""
    project_result = await db.execute(select(Project).where(Project.id == project_id, Project.is_deleted.is_(False)))
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Obra não encontrada")

    revenue_planned = (await db.execute(
        select(func.coalesce(func.sum(FinancialEntry.planned_amount), 0))
        .where(FinancialEntry.is_deleted.is_(False), FinancialEntry.project_id == project_id, FinancialEntry.type == "receita")
    )).scalar() or 0

    revenue_received = (await db.execute(
        select(func.coalesce(func.sum(FinancialEntry.actual_amount), 0))
        .where(FinancialEntry.is_deleted.is_(False), FinancialEntry.project_id == project_id, FinancialEntry.type == "receita", FinancialEntry.status == "pago")
    )).scalar() or 0

    expenses_planned = (await db.execute(
        select(func.coalesce(func.sum(FinancialEntry.planned_amount), 0))
        .where(FinancialEntry.is_deleted.is_(False), FinancialEntry.project_id == project_id, FinancialEntry.type == "despesa")
    )).scalar() or 0

    expenses_paid = (await db.execute(
        select(func.coalesce(func.sum(FinancialEntry.actual_amount), 0))
        .where(FinancialEntry.is_deleted.is_(False), FinancialEntry.project_id == project_id, FinancialEntry.type == "despesa", FinancialEntry.status == "pago")
    )).scalar() or 0

    phases_result = await db.execute(
        select(WorkPhase).where(WorkPhase.project_id == project_id, WorkPhase.is_deleted.is_(False))
    )
    phases = phases_result.scalars().all()
    total_progress = sum(p.progress_percent or 0 for p in phases) / max(len(phases), 1)

    measurements_count = (await db.execute(
        select(func.count()).select_from(Measurement).where(Measurement.project_id == project_id)
    )).scalar() or 0

    cat_result = await db.execute(
        select(FinancialEntry.category, FinancialEntry.type, func.sum(FinancialEntry.planned_amount))
        .where(FinancialEntry.is_deleted.is_(False), FinancialEntry.project_id == project_id)
        .group_by(FinancialEntry.category, FinancialEntry.type)
    )
    categories = [{"category": r[0] or "Sem categoria", "type": r[1], "amount": float(r[2] or 0)} for r in cat_result.all()]

    return {
        "project_name": project.name,
        "project_status": project.status,
        "progress": round(total_progress, 1),
        "revenue_planned": float(revenue_planned),
        "revenue_received": float(revenue_received),
        "expenses_planned": float(expenses_planned),
        "expenses_paid": float(expenses_paid),
        "balance": float(revenue_received) - float(expenses_paid),
        "phases_count": len(phases),
        "measurements_count": measurements_count,
        "categories": categories,
    }


@router.get("/by-client/{client_id}")
async def dashboard_by_client(client_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Dashboard data consolidated by client."""
    client_result = await db.execute(select(Client).where(Client.id == client_id, Client.is_deleted.is_(False)))
    client = client_result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    projects_result = await db.execute(
        select(Project).where(Project.client_id == client_id, Project.is_deleted.is_(False))
    )
    projects = projects_result.scalars().all()
    project_ids = [p.id for p in projects]

    contracts_count = (await db.execute(
        select(func.count()).select_from(Contract).where(Contract.client_id == client_id, Contract.is_deleted.is_(False))
    )).scalar() or 0

    revenue = 0
    expenses = 0
    if project_ids:
        revenue = float((await db.execute(
            select(func.coalesce(func.sum(FinancialEntry.planned_amount), 0))
            .where(FinancialEntry.is_deleted.is_(False), FinancialEntry.project_id.in_(project_ids), FinancialEntry.type == "receita")
        )).scalar() or 0)
        expenses = float((await db.execute(
            select(func.coalesce(func.sum(FinancialEntry.planned_amount), 0))
            .where(FinancialEntry.is_deleted.is_(False), FinancialEntry.project_id.in_(project_ids), FinancialEntry.type == "despesa")
        )).scalar() or 0)

    today = date.today()
    overdue_result = await db.execute(
        select(func.count(), func.coalesce(func.sum(ContractInstallment.amount), 0))
        .select_from(ContractInstallment)
        .join(Contract, ContractInstallment.contract_id == Contract.id)
        .where(Contract.client_id == client_id,
               ContractInstallment.status.in_(["pendente", "atrasada"]),
               ContractInstallment.due_date < today)
    )
    overdue_row = overdue_result.one()

    return {
        "client_name": client.name,
        "projects_count": len(projects),
        "contracts_count": contracts_count,
        "projects": [{"id": p.id, "name": p.name, "status": p.status} for p in projects],
        "revenue_total": revenue,
        "expenses_total": expenses,
        "balance": revenue - expenses,
        "overdue_count": overdue_row[0],
        "overdue_amount": float(overdue_row[1]),
    }


@router.get("/charts/pie")
async def dashboard_pie_charts(
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Data for pie charts: revenue vs expenses, project status, installment status."""
    base_filter = FinancialEntry.is_deleted.is_(False)

    rev_query = select(func.coalesce(func.sum(FinancialEntry.planned_amount), 0)).where(base_filter, FinancialEntry.type == "receita")
    exp_query = select(func.coalesce(func.sum(FinancialEntry.planned_amount), 0)).where(base_filter, FinancialEntry.type == "despesa")
    if project_id:
        rev_query = rev_query.where(FinancialEntry.project_id == project_id)
        exp_query = exp_query.where(FinancialEntry.project_id == project_id)

    rev_total = (await db.execute(rev_query)).scalar() or 0
    exp_total = (await db.execute(exp_query)).scalar() or 0

    project_status_query = select(Project.status, func.count()).where(Project.is_deleted.is_(False))
    if project_id:
        project_status_query = project_status_query.where(Project.id == project_id)
    project_status = await db.execute(project_status_query.group_by(Project.status))
    project_status_data = [{"label": r[0].replace("_", " ").title(), "value": r[1]} for r in project_status.all()]

    installment_query = (
        select(ContractInstallment.status, func.count())
        .select_from(ContractInstallment)
    )
    if project_id:
        installment_query = (
            installment_query
            .join(Contract, ContractInstallment.contract_id == Contract.id)
            .where(Contract.proposal_id.in_(
                select(Proposal.id).where(Proposal.project_id == project_id)
            ) | (Contract.client_id.in_(
                select(Project.client_id).where(Project.id == project_id)
            )))
        )
    installment_status = await db.execute(
        installment_query.group_by(ContractInstallment.status)
    )
    installment_data = [{"label": r[0].replace("_", " ").title(), "value": r[1]} for r in installment_status.all()]

    cat_query = select(FinancialEntry.category, func.sum(FinancialEntry.planned_amount)).where(base_filter, FinancialEntry.type == "despesa")
    if project_id:
        cat_query = cat_query.where(FinancialEntry.project_id == project_id)
    cat_result = await db.execute(cat_query.group_by(FinancialEntry.category))
    expense_categories = [{"label": r[0] or "Sem categoria", "value": float(r[1] or 0)} for r in cat_result.all()]

    return {
        "revenue_vs_expenses": [
            {"label": "Receitas", "value": float(rev_total)},
            {"label": "Despesas", "value": float(exp_total)},
        ],
        "projects_by_status": project_status_data,
        "installments_by_status": installment_data,
        "expenses_by_category": expense_categories,
    }
