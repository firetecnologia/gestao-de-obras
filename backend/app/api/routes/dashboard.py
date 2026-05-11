from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.oportunidade import Oportunidade
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("")
async def get_dashboard(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    today = date.today()
    seven_days_ago = today - timedelta(days=7)
    thirty_days_ago = today - timedelta(days=30)
    active = Oportunidade.ativo == True

    total = await db.scalar(select(func.count(Oportunidade.id)).where(active)) or 0
    novas = await db.scalar(select(func.count(Oportunidade.id)).where(active, Oportunidade.status == "novo")) or 0
    alta = await db.scalar(select(func.count(Oportunidade.id)).where(active, Oportunidade.prioridade == "alta")) or 0
    ultimos_7 = await db.scalar(
        select(func.count(Oportunidade.id)).where(active, Oportunidade.data_encontrada >= seven_days_ago)
    ) or 0
    ultimos_30 = await db.scalar(
        select(func.count(Oportunidade.id)).where(active, Oportunidade.data_encontrada >= thirty_days_ago)
    ) or 0

    # By city
    por_cidade_q = await db.execute(
        select(Oportunidade.cidade, func.count(Oportunidade.id).label("total"))
        .where(active, Oportunidade.cidade.isnot(None))
        .group_by(Oportunidade.cidade)
        .order_by(func.count(Oportunidade.id).desc())
        .limit(15)
    )
    por_cidade = [{"cidade": r[0], "total": r[1]} for r in por_cidade_q.all()]

    # By type
    por_tipo_q = await db.execute(
        select(Oportunidade.tipo_obra, func.count(Oportunidade.id).label("total"))
        .where(active, Oportunidade.tipo_obra.isnot(None))
        .group_by(Oportunidade.tipo_obra)
        .order_by(func.count(Oportunidade.id).desc())
    )
    por_tipo = [{"tipo": r[0], "total": r[1]} for r in por_tipo_q.all()]

    # By phase
    por_fase_q = await db.execute(
        select(Oportunidade.fase_provavel, func.count(Oportunidade.id).label("total"))
        .where(active, Oportunidade.fase_provavel.isnot(None))
        .group_by(Oportunidade.fase_provavel)
        .order_by(func.count(Oportunidade.id).desc())
    )
    por_fase = [{"fase": r[0], "total": r[1]} for r in por_fase_q.all()]

    # By source
    por_fonte_q = await db.execute(
        select(Oportunidade.fonte, func.count(Oportunidade.id).label("total"))
        .where(active, Oportunidade.fonte.isnot(None))
        .group_by(Oportunidade.fonte)
        .order_by(func.count(Oportunidade.id).desc())
    )
    por_fonte = [{"fonte": r[0], "total": r[1]} for r in por_fonte_q.all()]

    # By priority
    por_prioridade_q = await db.execute(
        select(Oportunidade.prioridade, func.count(Oportunidade.id).label("total"))
        .where(active)
        .group_by(Oportunidade.prioridade)
    )
    por_prioridade = [{"prioridade": r[0], "total": r[1]} for r in por_prioridade_q.all()]

    # By status
    por_status_q = await db.execute(
        select(Oportunidade.status, func.count(Oportunidade.id).label("total"))
        .where(active)
        .group_by(Oportunidade.status)
        .order_by(func.count(Oportunidade.id).desc())
    )
    por_status = [{"status": r[0], "total": r[1]} for r in por_status_q.all()]

    return {
        "cards": {
            "total": total,
            "novas": novas,
            "alta_prioridade": alta,
            "ultimos_7_dias": ultimos_7,
            "ultimos_30_dias": ultimos_30,
        },
        "graficos": {
            "por_cidade": por_cidade,
            "por_tipo": por_tipo,
            "por_fase": por_fase,
            "por_fonte": por_fonte,
            "por_prioridade": por_prioridade,
            "por_status": por_status,
        },
    }
