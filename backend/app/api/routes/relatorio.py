import io
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.oportunidade import Oportunidade
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/relatorio", tags=["Relatório Semanal"])


@router.get("/semanal")
async def relatorio_semanal(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    today = date.today()
    week_ago = today - timedelta(days=7)
    active = Oportunidade.ativo == True

    novas_q = await db.execute(
        select(Oportunidade)
        .where(active, Oportunidade.data_encontrada >= week_ago)
        .order_by(Oportunidade.score.desc())
    )
    novas = novas_q.scalars().all()

    alta_q = await db.execute(
        select(Oportunidade)
        .where(active, Oportunidade.prioridade == "alta", Oportunidade.data_encontrada >= week_ago)
        .order_by(Oportunidade.score.desc())
    )
    alta_prioridade = alta_q.scalars().all()

    melhores_cidades_q = await db.execute(
        select(Oportunidade.cidade, func.count(Oportunidade.id).label("total"))
        .where(active, Oportunidade.data_encontrada >= week_ago, Oportunidade.cidade.isnot(None))
        .group_by(Oportunidade.cidade)
        .order_by(func.count(Oportunidade.id).desc())
        .limit(10)
    )
    melhores_cidades = [{"cidade": r[0], "total": r[1]} for r in melhores_cidades_q.all()]

    melhores_fontes_q = await db.execute(
        select(Oportunidade.fonte, func.count(Oportunidade.id).label("total"))
        .where(active, Oportunidade.data_encontrada >= week_ago, Oportunidade.fonte.isnot(None))
        .group_by(Oportunidade.fonte)
        .order_by(func.count(Oportunidade.id).desc())
        .limit(10)
    )
    melhores_fontes = [{"fonte": r[0], "total": r[1]} for r in melhores_fontes_q.all()]

    prospeccao_q = await db.execute(
        select(Oportunidade)
        .where(active, Oportunidade.prioridade.in_(["alta", "media"]), Oportunidade.status.in_(["novo", "analisar"]))
        .order_by(Oportunidade.score.desc())
        .limit(20)
    )
    lista_prospeccao = prospeccao_q.scalars().all()

    def _serialize(op: Oportunidade) -> dict:
        return {
            "id": op.id,
            "nome_obra": op.nome_obra,
            "cidade": op.cidade,
            "uf": op.uf,
            "tipo_obra": op.tipo_obra,
            "fase_provavel": op.fase_provavel,
            "score": op.score,
            "prioridade": op.prioridade,
            "valor_estimado": op.valor_estimado,
            "fonte": op.fonte,
            "status": op.status,
            "servicos_sugeridos": op.servicos_sugeridos,
            "data_encontrada": str(op.data_encontrada) if op.data_encontrada else None,
        }

    return {
        "periodo": {"inicio": str(week_ago), "fim": str(today)},
        "resumo": {
            "total_novas": len(novas),
            "total_alta_prioridade": len(alta_prioridade),
        },
        "novas_da_semana": [_serialize(o) for o in novas],
        "alta_prioridade": [_serialize(o) for o in alta_prioridade],
        "melhores_cidades": melhores_cidades,
        "melhores_fontes": melhores_fontes,
        "lista_prospeccao": [_serialize(o) for o in lista_prospeccao],
    }


@router.get("/semanal/csv")
async def relatorio_semanal_csv(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    today = date.today()
    week_ago = today - timedelta(days=7)

    result = await db.execute(
        select(Oportunidade)
        .where(Oportunidade.ativo == True, Oportunidade.data_encontrada >= week_ago)
        .order_by(Oportunidade.score.desc())
    )
    oportunidades = result.scalars().all()

    output = io.StringIO()
    output.write("ID;Nome;Cidade;UF;Tipo;Fase;Score;Prioridade;Valor;Fonte;Status;Serviços Sugeridos;Data\n")
    for op in oportunidades:
        output.write(
            f"{op.id};{op.nome_obra};{op.cidade or ''};{op.uf or ''};{op.tipo_obra or ''};"
            f"{op.fase_provavel or ''};{op.score};{op.prioridade};{op.valor_estimado or ''};"
            f"{op.fonte or ''};{op.status};{op.servicos_sugeridos or ''};{op.data_encontrada}\n"
        )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=relatorio_semanal_{today}.csv"},
    )


@router.get("/semanal/excel")
async def relatorio_semanal_excel(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    from openpyxl import Workbook

    today = date.today()
    week_ago = today - timedelta(days=7)

    result = await db.execute(
        select(Oportunidade)
        .where(Oportunidade.ativo == True, Oportunidade.data_encontrada >= week_ago)
        .order_by(Oportunidade.score.desc())
    )
    oportunidades = result.scalars().all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Relatório Semanal"
    headers = ["ID", "Nome", "Cidade", "UF", "Tipo", "Fase", "Score", "Prioridade", "Valor", "Fonte", "Status", "Serviços Sugeridos", "Data"]
    ws.append(headers)

    for op in oportunidades:
        ws.append([
            op.id,
            op.nome_obra,
            op.cidade or "",
            op.uf or "",
            op.tipo_obra or "",
            op.fase_provavel or "",
            op.score,
            op.prioridade,
            op.valor_estimado or "",
            op.fonte or "",
            op.status,
            op.servicos_sugeridos or "",
            str(op.data_encontrada) if op.data_encontrada else "",
        ])

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=relatorio_semanal_{today}.xlsx"},
    )
