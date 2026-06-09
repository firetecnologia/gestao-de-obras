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
  ['maoDeObraReal', ['controle de m.o.', 'controle de mo', 'controle m.o.', 'controle mo', 'mao de obra real', 'mao de obra', 'mdo', 'mao obra']],
  ['comprasReais', ['controle de materiais', 'controle materiais', 'compras reais', 'compras', 'compras real']],
  ['orcamentoMateriais', ['orcamento', 'orcamento materiais', 'materiais', 'orc materiais', 'orcamento material']],
  ['orcamentoServicos', ['empreitas', 'orcamento servicos', 'servicos', 'orc servicos', 'orcamento servico']],
  ['financeiro', ['financeiro', 'resumo financeiro']],
  ['medicoes', ['medicoes', 'medicao', 'fisico financeiro contrato']],
  ['cadastros', ['cadastros', 'cadastro']],
  ['dadosDashboard', ['dados dashboard', 'grafico de custos']],
  ['baseDados', ['base de dados']],
  ['obras', ['obras', 'obra', 'projetos']],
];

export function matchTabName(sheetTitle: string): string | null {
  const norm = normalize(sheetTitle);
  for (const [key, aliases] of TAB_ALIASES) {
    if (aliases.some(alias => norm === alias || norm.startsWith(alias))) {
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
  receitaPrevista: ['receita prevista', 'rec prevista', 'receita prev', 'receita total prevista'],
  receitaRealizada: ['receita realizada', 'rec realizada', 'receita real'],
  custoPrevisto: ['custo previsto', 'custo prev'],
  custoRealizado: ['custo realizado', 'custo real', 'custo planilha'],
  lucroPrevisto: ['lucro previsto', 'lucro prev'],
  lucroRealizado: ['lucro realizado', 'lucro real'],
  categoria: ['categoria', 'cat', 'centro de custo'],
  material: ['material', 'mat', 'previsao de materiais'],
  unidade: ['unidade', 'un', 'und', 'un.'],
  quantidade: ['quantidade', 'qtd', 'qtde', 'quant'],
  custoUnitario: ['custo unitario', 'custo unit', 'r$ custo un'],
  custoTotal: ['custo total', 'total custo', 'r$ custo total'],
  valorVenda: ['valor venda', 'vlr venda', 'preco venda', 'valor de venda', 'r$ un', '$ un sugerido'],
  ambiente: ['ambiente', 'amb', 'local'],
  etapa: ['etapa', 'fase', 'item'],
  servico: ['servico', 'serviço', 'serv'],
  data: ['data', 'dt', 'date', 'data do pedido'],
  fornecedor: ['fornecedor', 'forn', 'supplier'],
  valorUnitario: ['valor unitario', 'vlr unitario', 'vlr unit', 'preco unitario', 'vl. unit', 'vl unit'],
  valorTotal: ['valor total', 'vlr total', 'total', 'vl. total', 'vl total', 'valor pedido'],
  centroCusto: ['centro de custo', 'centro custo', 'cc', 'centrocusto'],
  prestador: ['prestador', 'prest', 'profissional', 'fornecedor'],
  valorPrevisto: ['valor previsto', 'vlr previsto', 'prev'],
  valorPago: ['valor pago', 'vlr pago', 'pago'],
  extra: ['extra', 'adicional', 'extras', 'valor extra'],
  dataExecucao: ['data execucao', 'data execução', 'dt execucao', 'execucao', 'data de execucao'],
  dataPagamento: ['data pagamento', 'dt pagamento', 'pagamento', 'data do pagamento'],
  medicao: ['medicao', 'medição', 'med', 'medicoes'],
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
