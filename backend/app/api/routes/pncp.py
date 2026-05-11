import logging
from datetime import date, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.oportunidade import Oportunidade
from app.models.user import User
from app.schemas.oportunidade import PNCPSearchRequest
from app.services.pncp import buscar_contratacoes, buscar_contratos, filtrar_por_palavras_chave
from app.services.scoring import calcular_score
from app.services.service_suggestion import sugerir_servicos
from app.api.deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pncp", tags=["Busca PNCP"])


def _extract_numero_controle(item: dict) -> str | None:
    return item.get("numeroControlePNCP") or item.get("id") or None


def _extract_link(item: dict) -> str | None:
    ncp = item.get("numeroControlePNCP")
    if ncp:
        return f"https://pncp.gov.br/app/conteudo/{ncp}"
    uri = item.get("uri")
    if uri:
        return f"https://pncp.gov.br{uri}" if uri.startswith("/") else uri
    return None


def _extract_valor(item: dict) -> float | None:
    for key in ["valorTotalEstimado", "valorTotalHomologado", "valorInicial", "valorFinal"]:
        val = item.get(key)
        if val is not None:
            try:
                return float(val)
            except (ValueError, TypeError):
                continue
    return None


def _extract_orgao(item: dict) -> str:
    orgao = item.get("orgaoEntidade", {})
    if isinstance(orgao, dict):
        return orgao.get("razaoSocial", "") or orgao.get("nomeFantasia", "") or ""
    return str(orgao) if orgao else ""


def _extract_municipio(item: dict) -> tuple[str, str]:
    orgao = item.get("orgaoEntidade", {})
    if isinstance(orgao, dict):
        municipio = orgao.get("municipioNome", "") or ""
        uf = orgao.get("ufSigla", "") or orgao.get("uf", "") or ""
        return municipio, uf
    uf = item.get("uf", "") or ""
    return "", uf


def _parse_date(val) -> date | None:
    if not val:
        return None
    if isinstance(val, date):
        return val
    try:
        return datetime.fromisoformat(str(val).replace("Z", "+00:00")).date()
    except Exception:
        return None


async def _check_duplicate(db: AsyncSession, link: str | None, ncp: str | None, orgao: str, objeto: str, cidade: str, data_pub: date | None) -> bool:
    if link:
        result = await db.execute(select(Oportunidade).where(Oportunidade.link_fonte == link))
        if result.scalar_one_or_none():
            return True
    if ncp:
        result = await db.execute(select(Oportunidade).where(Oportunidade.numero_controle_pncp == ncp))
        if result.scalar_one_or_none():
            return True
    if orgao and objeto and cidade and data_pub:
        result = await db.execute(
            select(Oportunidade).where(
                Oportunidade.orgao_publico == orgao,
                Oportunidade.nome_obra == objeto[:500],
                Oportunidade.cidade == cidade,
                Oportunidade.data_publicacao == data_pub,
            )
        )
        if result.scalar_one_or_none():
            return True
    return False


@router.post("/buscar", response_model=dict)
async def buscar_pncp(
    data: PNCPSearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contratacoes = await buscar_contratacoes(
        data_inicial=data.data_inicial,
        data_final=data.data_final,
        uf=data.uf,
        codigo_ibge=data.codigo_ibge,
        pagina=data.pagina,
    )
    contratos = await buscar_contratos(
        data_inicial=data.data_inicial,
        data_final=data.data_final,
        uf=data.uf,
        codigo_ibge=data.codigo_ibge,
        pagina=data.pagina,
    )

    items_contratacoes = contratacoes.get("data", []) if isinstance(contratacoes.get("data"), list) else []
    items_contratos = contratos.get("data", []) if isinstance(contratos.get("data"), list) else []

    if data.palavras_chave:
        items_contratacoes = filtrar_por_palavras_chave(items_contratacoes, data.palavras_chave)
        items_contratos = filtrar_por_palavras_chave(items_contratos, data.palavras_chave)

    all_items = items_contratacoes + items_contratos
    salvos = 0
    duplicados = 0
    erros = 0

    for item in all_items:
        try:
            objeto = (item.get("objetoCompra", "") or item.get("objeto", "") or "")[:500]
            if not objeto:
                continue

            ncp = _extract_numero_controle(item)
            link = _extract_link(item)
            orgao = _extract_orgao(item)
            cidade, uf = _extract_municipio(item)
            data_pub = _parse_date(item.get("dataPublicacaoPncp") or item.get("dataVigenciaInicio"))
            valor = _extract_valor(item)

            is_dup = await _check_duplicate(db, link, ncp, orgao, objeto, cidade, data_pub)
            if is_dup:
                duplicados += 1
                continue

            oportunidade = Oportunidade(
                nome_obra=objeto,
                resumo=objeto,
                cidade=cidade or None,
                uf=uf or data.uf or None,
                orgao_publico=orgao or None,
                contratante=orgao or None,
                tipo_obra=None,
                fase_provavel="contratação" if "contrat" in objeto.lower() else "licitação",
                origem_informacao="PNCP",
                fonte="PNCP",
                link_fonte=link,
                numero_controle_pncp=ncp,
                data_publicacao=data_pub,
                data_encontrada=date.today(),
                valor_estimado=valor,
                status="novo",
                texto_original=str(item)[:5000],
            )

            score_result = await calcular_score(oportunidade, db)
            oportunidade.score = score_result["score"]
            oportunidade.prioridade = score_result["prioridade"]
            oportunidade.score_justificativa = score_result["justificativa"]

            servicos = sugerir_servicos(oportunidade.nome_obra, oportunidade.resumo or "", oportunidade.texto_original or "")
            if servicos:
                oportunidade.servicos_sugeridos = "; ".join(servicos)

            db.add(oportunidade)
            salvos += 1
        except Exception as e:
            logger.error(f"Error processing PNCP item: {e}")
            erros += 1

    await db.commit()

    return {
        "total_encontrados": len(all_items),
        "salvos": salvos,
        "duplicados": duplicados,
        "erros": erros,
        "contratacoes_encontradas": len(items_contratacoes),
        "contratos_encontrados": len(items_contratos),
        "errors_contratacoes": contratacoes.get("error"),
        "errors_contratos": contratos.get("error"),
    }
