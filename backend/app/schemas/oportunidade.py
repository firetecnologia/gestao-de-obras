from datetime import datetime, date

from pydantic import BaseModel


class OportunidadeCreate(BaseModel):
    nome_obra: str
    resumo: str | None = None
    cidade: str | None = None
    uf: str | None = None
    endereco: str | None = None
    construtora: str | None = None
    incorporadora: str | None = None
    contratante: str | None = None
    orgao_publico: str | None = None
    tipo_obra: str | None = None
    fase_provavel: str | None = None
    origem_informacao: str | None = None
    fonte: str | None = None
    link_fonte: str | None = None
    numero_controle_pncp: str | None = None
    data_publicacao: date | None = None
    valor_estimado: float | None = None
    prazo_previsto: str | None = None
    status: str = "novo"
    proxima_acao: str | None = None
    responsavel_interno: str | None = None
    observacoes: str | None = None
    texto_original: str | None = None
    construtora_id: int | None = None
    fonte_busca_id: int | None = None


class OportunidadeUpdate(BaseModel):
    nome_obra: str | None = None
    resumo: str | None = None
    cidade: str | None = None
    uf: str | None = None
    endereco: str | None = None
    construtora: str | None = None
    incorporadora: str | None = None
    contratante: str | None = None
    orgao_publico: str | None = None
    tipo_obra: str | None = None
    fase_provavel: str | None = None
    origem_informacao: str | None = None
    fonte: str | None = None
    link_fonte: str | None = None
    data_publicacao: date | None = None
    valor_estimado: float | None = None
    prazo_previsto: str | None = None
    status: str | None = None
    prioridade: str | None = None
    proxima_acao: str | None = None
    responsavel_interno: str | None = None
    observacoes: str | None = None
    construtora_id: int | None = None
    fonte_busca_id: int | None = None


class OportunidadeResponse(BaseModel):
    id: int
    nome_obra: str
    resumo: str | None
    cidade: str | None
    uf: str | None
    endereco: str | None
    construtora: str | None
    incorporadora: str | None
    contratante: str | None
    orgao_publico: str | None
    tipo_obra: str | None
    fase_provavel: str | None
    origem_informacao: str | None
    fonte: str | None
    link_fonte: str | None
    numero_controle_pncp: str | None
    data_publicacao: date | None
    data_encontrada: date
    valor_estimado: float | None
    prazo_previsto: str | None
    status: str
    prioridade: str
    score: int
    score_justificativa: str | None
    servicos_sugeridos: str | None
    proxima_acao: str | None
    responsavel_interno: str | None
    observacoes: str | None
    texto_original: str | None
    construtora_id: int | None
    fonte_busca_id: int | None
    ativo: bool
    created_at: datetime
    historico: list["HistoricoComercialResponse"] = []

    model_config = {"from_attributes": True}


class HistoricoComercialCreate(BaseModel):
    oportunidade_id: int
    tipo: str
    descricao: str | None = None
    pessoa_contatada: str | None = None
    telefone: str | None = None
    email: str | None = None
    resposta: str | None = None
    data_proximo_followup: date | None = None
    valor_proposta: float | None = None
    usuario: str | None = None


class HistoricoComercialResponse(BaseModel):
    id: int
    oportunidade_id: int
    tipo: str
    descricao: str | None
    pessoa_contatada: str | None
    telefone: str | None
    email: str | None
    resposta: str | None
    data_proximo_followup: date | None
    valor_proposta: float | None
    usuario: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PNCPSearchRequest(BaseModel):
    data_inicial: date
    data_final: date
    uf: str | None = None
    codigo_ibge: str | None = None
    palavras_chave: list[str] = []
    pagina: int = 1
