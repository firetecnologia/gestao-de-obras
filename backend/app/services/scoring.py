
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cidade import Cidade


TIPOS_ALTO_VALOR = {"residencial multifamiliar", "comercial", "saude", "educacao", "galpao", "industrial"}

TERMOS_FASE_FINAL = ["fase final", "entrega", "habite-se", "conclusão", "conclusao", "vistoria"]
TERMOS_ENGENHARIA = ["serviços de engenharia", "servicos de engenharia"]
TERMOS_OBRA = ["obra", "construção", "construcao", "reforma", "ampliação", "ampliacao"]
TERMOS_GENERICO = [
    "material de escritório",
    "material de limpeza",
    "material de consumo",
    "combustível",
    "veículo",
    "mobiliário",
    "equipamento de informática",
]
TERMOS_COMPRA_MATERIAL = [
    "aquisição de material",
    "compra de material",
    "fornecimento de material",
    "aquisicao de material",
]


def _normalize(text: str) -> str:
    return text.lower().strip()


async def calcular_score(oportunidade, db: AsyncSession) -> dict:
    score = 0
    motivos: list[str] = []

    texto_completo = _normalize(
        f"{oportunidade.nome_obra or ''} {oportunidade.resumo or ''} {oportunidade.texto_original or ''}"
    )

    tipo = _normalize(oportunidade.tipo_obra or "")
    if tipo in TIPOS_ALTO_VALOR:
        score += 30
        motivos.append(f"Tipo de obra de alto valor ({oportunidade.tipo_obra})")

    for termo in TERMOS_FASE_FINAL:
        if termo in texto_completo:
            score += 25
            motivos.append("Indicação de fase final/entrega/habite-se")
            break

    for termo in TERMOS_ENGENHARIA:
        if termo in texto_completo:
            score += 20
            motivos.append("Objeto contém 'serviços de engenharia'")
            break

    for termo in TERMOS_OBRA:
        if termo in texto_completo:
            score += 20
            motivos.append("Objeto contém termos de obra/construção")
            break

    if oportunidade.construtora or oportunidade.incorporadora or oportunidade.contratante:
        score += 15
        motivos.append("Construtora/incorporadora/contratante identificado")

    if oportunidade.valor_estimado and oportunidade.valor_estimado >= 500000:
        score += 15
        motivos.append(f"Valor relevante (R$ {oportunidade.valor_estimado:,.2f})")

    if oportunidade.cidade:
        result = await db.execute(
            select(Cidade).where(
                Cidade.nome.ilike(oportunidade.cidade),
                Cidade.ativo == True,
                Cidade.prioridade == "alta",
            )
        )
        if result.scalar_one_or_none():
            score += 10
            motivos.append("Cidade prioritária")

    if oportunidade.endereco:
        score += 10
        motivos.append("Endereço/local da obra identificado")

    for termo in TERMOS_GENERICO:
        if termo in texto_completo:
            score -= 20
            motivos.append("Item genérico sem relação clara com construção")
            break

    for termo in TERMOS_COMPRA_MATERIAL:
        if termo in texto_completo:
            score -= 30
            motivos.append("Apenas compra de material sem execução/serviço técnico")
            break

    score = max(score, 0)

    if score >= 70:
        prioridade = "alta"
    elif score >= 40:
        prioridade = "media"
    else:
        prioridade = "baixa"

    justificativa = ". ".join(motivos) if motivos else "Sem critérios específicos identificados"

    return {"score": score, "prioridade": prioridade, "justificativa": justificativa}
