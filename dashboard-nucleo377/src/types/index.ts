// ===== Obra =====
export interface Obra {
  idObra: string;
  cliente: string;
  endereco: string;
  responsavel: string;
  arquiteto: string;
  inicio: string;
  previsaoTermino: string;
  status: string;
  receitaPrevista: number;
  receitaRealizada: number;
  custoPrevisto: number;
  custoRealizado: number;
  lucroPrevisto: number;
  lucroRealizado: number;
}

// ===== Orçamento Materiais =====
export interface OrcamentoMaterial {
  idObra: string;
  categoria: string;
  material: string;
  unidade: string;
  quantidade: number;
  custoUnitario: number;
  custoTotal: number;
  valorVenda: number;
}

// ===== Orçamento Serviços =====
export interface OrcamentoServico {
  idObra: string;
  ambiente: string;
  etapa: string;
  servico: string;
  unidade: string;
  quantidade: number;
  custoUnitario: number;
  custoTotal: number;
  valorVenda: number;
  status: string;
}

// ===== Compras Reais =====
export interface CompraReal {
  idObra: string;
  data: string;
  material: string;
  fornecedor: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  centroCusto: string;
  status: string;
}

// ===== Mão de Obra Real =====
export interface MaoDeObraReal {
  idObra: string;
  prestador: string;
  servico: string;
  valorPrevisto: number;
  valorPago: number;
  extra: number;
  dataExecucao: string;
  dataPagamento: string;
  status: string;
}

// ===== Medições =====
export interface Medicao {
  idObra: string;
  servico: string;
  medicao: string;
  percentual: number;
  valorMedido: number;
  status: string;
}

// ===== Dashboard Data =====
export interface DashboardData {
  obras: Obra[];
  orcamentoMateriais: OrcamentoMaterial[];
  orcamentoServicos: OrcamentoServico[];
  comprasReais: CompraReal[];
  maoDeObraReal: MaoDeObraReal[];
  medicoes: Medicao[];
  lastUpdated: string;
  connected: boolean;
  spreadsheetId: string | null;
  errors: string[];
}

// ===== Alerts =====
export interface Alerta {
  tipo: 'erro' | 'aviso' | 'info';
  mensagem: string;
  detalhe?: string;
}

// ===== Filters =====
export interface Filtros {
  obra: string;
  periodo: string;
  fornecedor: string;
  centroCusto: string;
  categoria: string;
  status: string;
}

// ===== Search Result =====
export interface SearchResult {
  tipo: 'compra' | 'material' | 'servico' | 'fornecedor' | 'medicao';
  titulo: string;
  detalhe: string;
  valor?: number;
}

// ===== Connection Status =====
export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';
