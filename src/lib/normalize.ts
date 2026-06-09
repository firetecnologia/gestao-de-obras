/**
 * Normalize tab and column names for fuzzy matching
 */

function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalize(str: string): string {
  return removeAccents(str).toLowerCase().trim().replace(/\s+/g, ' ');
}

// Ordered from most specific to least specific to avoid substring false positives
const TAB_ALIASES: [string, string[]][] = [
  ['maoDeObraReal', ['mao de obra real', 'mao de obra', 'mdo', 'mao obra']],
  ['orcamentoMateriais', ['orcamento materiais', 'materiais', 'orc materiais', 'orcamento material']],
  ['orcamentoServicos', ['orcamento servicos', 'servicos', 'orc servicos', 'orcamento servico']],
  ['comprasReais', ['compras reais', 'compras', 'compras real']],
  ['medicoes', ['medicoes', 'medicao']],
  ['cadastros', ['cadastros', 'cadastro']],
  ['dadosDashboard', ['dados dashboard']],
  ['obras', ['obras', 'obra', 'projetos']],
];

export function matchTabName(sheetTitle: string): string | null {
  const norm = normalize(sheetTitle);
  for (const [key, aliases] of TAB_ALIASES) {
    if (aliases.some(alias => norm === alias)) {
      return key;
    }
  }
  return null;
}

const COLUMN_ALIASES: Record<string, string[]> = {
  idObra: ['id obra', 'id_obra', 'idobra', 'id', 'obra id'],
  cliente: ['cliente', 'client'],
  endereco: ['endereco', 'endereço', 'end'],
  responsavel: ['responsavel', 'responsável', 'resp'],
  arquiteto: ['arquiteto', 'arq'],
  inicio: ['inicio', 'início', 'data inicio', 'dt inicio'],
  previsaoTermino: ['previsao termino', 'previsão término', 'prev termino', 'termino'],
  status: ['status', 'situacao', 'situação'],
  receitaPrevista: ['receita prevista', 'rec prevista', 'receita prev'],
  receitaRealizada: ['receita realizada', 'rec realizada', 'receita real'],
  custoPrevisto: ['custo previsto', 'custo prev'],
  custoRealizado: ['custo realizado', 'custo real'],
  lucroPrevisto: ['lucro previsto', 'lucro prev'],
  lucroRealizado: ['lucro realizado', 'lucro real'],
  categoria: ['categoria', 'cat'],
  material: ['material', 'mat', 'item'],
  unidade: ['unidade', 'un', 'und'],
  quantidade: ['quantidade', 'qtd', 'qtde', 'quant'],
  custoUnitario: ['custo unitario', 'custo unit'],
  custoTotal: ['custo total', 'total custo'],
  valorVenda: ['valor venda', 'vlr venda', 'preco venda', 'valor de venda'],
  ambiente: ['ambiente', 'amb', 'local'],
  etapa: ['etapa', 'fase'],
  servico: ['servico', 'serviço', 'serv'],
  data: ['data', 'dt', 'date'],
  fornecedor: ['fornecedor', 'forn', 'supplier'],
  valorUnitario: ['valor unitario', 'vlr unitario', 'vlr unit', 'preco unitario'],
  valorTotal: ['valor total', 'vlr total', 'total'],
  centroCusto: ['centro de custo', 'centro custo', 'cc', 'centrocusto'],
  prestador: ['prestador', 'prest', 'profissional'],
  valorPrevisto: ['valor previsto', 'vlr previsto', 'prev'],
  valorPago: ['valor pago', 'vlr pago', 'pago'],
  extra: ['extra', 'adicional', 'extras'],
  dataExecucao: ['data execucao', 'data execução', 'dt execucao', 'execucao'],
  dataPagamento: ['data pagamento', 'dt pagamento', 'pagamento'],
  medicao: ['medicao', 'medição', 'med'],
  percentual: ['percentual', 'percent', '%', 'perc'],
  valorMedido: ['valor medido', 'vlr medido'],
};

export function matchColumnName(header: string): string | null {
  const norm = normalize(header);
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some(alias => norm === alias || norm === alias.replace(/ /g, '_'))) {
      return key;
    }
  }
  return null;
}

export function mapHeaders(headers: string[]): Record<number, string> {
  const mapping: Record<number, string> = {};
  headers.forEach((h, idx) => {
    const match = matchColumnName(h);
    if (match) mapping[idx] = match;
  });
  return mapping;
}
