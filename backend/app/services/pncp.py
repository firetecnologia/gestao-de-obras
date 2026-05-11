import logging
from datetime import date

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

PNCP_BASE = settings.PNCP_BASE_URL


async def buscar_contratacoes(
    data_inicial: date,
    data_final: date,
    uf: str | None = None,
    codigo_ibge: str | None = None,
    pagina: int = 1,
    tam_pagina: int = 50,
) -> dict:
    params = {
        "dataInicial": data_inicial.strftime("%Y%m%d"),
        "dataFinal": data_final.strftime("%Y%m%d"),
        "pagina": pagina,
        "tamanhoPagina": tam_pagina,
    }
    if uf:
        params["uf"] = uf.upper()
    if codigo_ibge:
        params["codigoMunicipioIbge"] = codigo_ibge

    url = f"{PNCP_BASE}/contratacoes/publicacao"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        logger.error(f"PNCP API error: {e.response.status_code} - {e.response.text}")
        return {"data": [], "error": str(e)}
    except Exception as e:
        logger.error(f"PNCP request failed: {e}")
        return {"data": [], "error": str(e)}


async def buscar_contratos(
    data_inicial: date,
    data_final: date,
    uf: str | None = None,
    codigo_ibge: str | None = None,
    pagina: int = 1,
    tam_pagina: int = 50,
) -> dict:
    params = {
        "dataInicial": data_inicial.strftime("%Y%m%d"),
        "dataFinal": data_final.strftime("%Y%m%d"),
        "pagina": pagina,
        "tamanhoPagina": tam_pagina,
    }
    if uf:
        params["uf"] = uf.upper()
    if codigo_ibge:
        params["codigoMunicipioIbge"] = codigo_ibge

    url = f"{PNCP_BASE}/contratos/publicacao"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        logger.error(f"PNCP Contratos API error: {e.response.status_code} - {e.response.text}")
        return {"data": [], "error": str(e)}
    except Exception as e:
        logger.error(f"PNCP Contratos request failed: {e}")
        return {"data": [], "error": str(e)}


def filtrar_por_palavras_chave(items: list[dict], palavras_chave: list[str]) -> list[dict]:
    if not palavras_chave:
        return items
    resultado = []
    for item in items:
        objeto = (item.get("objetoCompra", "") or item.get("objeto", "") or "").lower()
        descricao = (item.get("descricao", "") or "").lower()
        texto = f"{objeto} {descricao}"
        for palavra in palavras_chave:
            if palavra.lower() in texto:
                resultado.append(item)
                break
    return resultado
