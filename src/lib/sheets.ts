import { matchTabName, mapHeaders } from './normalize';
import { parseBRLNumber, parseBRDate } from './financial';
import type {
  DashboardData,
  Obra,
  OrcamentoMaterial,
  OrcamentoServico,
  CompraReal,
  MaoDeObraReal,
  Medicao,
} from '@/types';

export function extractSpreadsheetId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Direct ID (no slashes, no protocol)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;

  // URL patterns
  const patterns = [
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }

  return null;
}

type SheetRow = (string | number | null | undefined)[];

function parseRow(row: SheetRow, headerMap: Record<number, string>, fields: string[]): Record<string, string | number> {
  const obj: Record<string, string | number> = {};
  for (const [idxStr, field] of Object.entries(headerMap)) {
    const idx = parseInt(idxStr);
    if (fields.includes(field)) {
      obj[field] = row[idx] ?? '';
    }
  }
  return obj;
}

function parseObra(row: SheetRow, headerMap: Record<number, string>): Obra {
  const raw = parseRow(row, headerMap, [
    'idObra', 'cliente', 'endereco', 'responsavel', 'arquiteto',
    'inicio', 'previsaoTermino', 'status', 'receitaPrevista',
    'receitaRealizada', 'custoPrevisto', 'custoRealizado',
    'lucroPrevisto', 'lucroRealizado',
  ]);
  return {
    idObra: String(raw.idObra || ''),
    cliente: String(raw.cliente || ''),
    endereco: String(raw.endereco || ''),
    responsavel: String(raw.responsavel || ''),
    arquiteto: String(raw.arquiteto || ''),
    inicio: parseBRDate(String(raw.inicio || '')),
    previsaoTermino: parseBRDate(String(raw.previsaoTermino || '')),
    status: String(raw.status || ''),
    receitaPrevista: parseBRLNumber(raw.receitaPrevista),
    receitaRealizada: parseBRLNumber(raw.receitaRealizada),
    custoPrevisto: parseBRLNumber(raw.custoPrevisto),
    custoRealizado: parseBRLNumber(raw.custoRealizado),
    lucroPrevisto: parseBRLNumber(raw.lucroPrevisto),
    lucroRealizado: parseBRLNumber(raw.lucroRealizado),
  };
}

function parseMaterial(row: SheetRow, headerMap: Record<number, string>): OrcamentoMaterial {
  const raw = parseRow(row, headerMap, [
    'idObra', 'categoria', 'material', 'unidade', 'quantidade',
    'custoUnitario', 'custoTotal', 'valorVenda',
  ]);
  return {
    idObra: String(raw.idObra || ''),
    categoria: String(raw.categoria || ''),
    material: String(raw.material || ''),
    unidade: String(raw.unidade || ''),
    quantidade: parseBRLNumber(raw.quantidade),
    custoUnitario: parseBRLNumber(raw.custoUnitario),
    custoTotal: parseBRLNumber(raw.custoTotal),
    valorVenda: parseBRLNumber(raw.valorVenda),
  };
}

function parseServico(row: SheetRow, headerMap: Record<number, string>): OrcamentoServico {
  const raw = parseRow(row, headerMap, [
    'idObra', 'ambiente', 'etapa', 'servico', 'unidade',
    'quantidade', 'custoUnitario', 'custoTotal', 'valorVenda', 'status',
  ]);
  return {
    idObra: String(raw.idObra || ''),
    ambiente: String(raw.ambiente || ''),
    etapa: String(raw.etapa || ''),
    servico: String(raw.servico || ''),
    unidade: String(raw.unidade || ''),
    quantidade: parseBRLNumber(raw.quantidade),
    custoUnitario: parseBRLNumber(raw.custoUnitario),
    custoTotal: parseBRLNumber(raw.custoTotal),
    valorVenda: parseBRLNumber(raw.valorVenda),
    status: String(raw.status || ''),
  };
}

function parseCompra(row: SheetRow, headerMap: Record<number, string>): CompraReal {
  const raw = parseRow(row, headerMap, [
    'idObra', 'data', 'material', 'fornecedor', 'unidade',
    'quantidade', 'valorUnitario', 'valorTotal', 'centroCusto', 'status',
  ]);
  return {
    idObra: String(raw.idObra || ''),
    data: parseBRDate(String(raw.data || '')),
    material: String(raw.material || ''),
    fornecedor: String(raw.fornecedor || ''),
    unidade: String(raw.unidade || ''),
    quantidade: parseBRLNumber(raw.quantidade),
    valorUnitario: parseBRLNumber(raw.valorUnitario),
    valorTotal: parseBRLNumber(raw.valorTotal),
    centroCusto: String(raw.centroCusto || ''),
    status: String(raw.status || ''),
  };
}

function parseMaoDeObra(row: SheetRow, headerMap: Record<number, string>): MaoDeObraReal {
  const raw = parseRow(row, headerMap, [
    'idObra', 'prestador', 'servico', 'valorPrevisto', 'valorPago',
    'extra', 'dataExecucao', 'dataPagamento', 'status',
  ]);
  return {
    idObra: String(raw.idObra || ''),
    prestador: String(raw.prestador || ''),
    servico: String(raw.servico || ''),
    valorPrevisto: parseBRLNumber(raw.valorPrevisto),
    valorPago: parseBRLNumber(raw.valorPago),
    extra: parseBRLNumber(raw.extra),
    dataExecucao: parseBRDate(String(raw.dataExecucao || '')),
    dataPagamento: parseBRDate(String(raw.dataPagamento || '')),
    status: String(raw.status || ''),
  };
}

function parseMedicao(row: SheetRow, headerMap: Record<number, string>): Medicao {
  const raw = parseRow(row, headerMap, [
    'idObra', 'servico', 'medicao', 'percentual', 'valorMedido', 'status',
  ]);
  return {
    idObra: String(raw.idObra || ''),
    servico: String(raw.servico || ''),
    medicao: String(raw.medicao || ''),
    percentual: parseBRLNumber(raw.percentual),
    valorMedido: parseBRLNumber(raw.valorMedido),
    status: String(raw.status || ''),
  };
}

export interface SheetData {
  title: string;
  rows: SheetRow[];
}

export function processSheets(sheets: SheetData[]): Omit<DashboardData, 'lastUpdated' | 'connected' | 'spreadsheetId' | 'errors'> & { errors: string[] } {
  const result: Omit<DashboardData, 'lastUpdated' | 'connected' | 'spreadsheetId'> = {
    obras: [],
    orcamentoMateriais: [],
    orcamentoServicos: [],
    comprasReais: [],
    maoDeObraReal: [],
    medicoes: [],
    errors: [],
  };

  const errors: string[] = [];
  const foundTabs = new Set<string>();

  for (const sheet of sheets) {
    const tabKey = matchTabName(sheet.title);
    if (!tabKey) continue;
    foundTabs.add(tabKey);

    const rows = sheet.rows.filter(r => r && r.some(cell => cell !== null && cell !== undefined && cell !== ''));
    if (rows.length < 2) {
      errors.push(`Aba "${sheet.title}" não possui dados suficientes.`);
      continue;
    }

    const headers = rows[0].map(h => String(h || ''));
    const headerMap = mapHeaders(headers);
    const dataRows = rows.slice(1);

    switch (tabKey) {
      case 'obras':
        result.obras = dataRows.map(r => parseObra(r, headerMap));
        break;
      case 'orcamentoMateriais':
        result.orcamentoMateriais = dataRows.map(r => parseMaterial(r, headerMap));
        break;
      case 'orcamentoServicos':
        result.orcamentoServicos = dataRows.map(r => parseServico(r, headerMap));
        break;
      case 'comprasReais':
        result.comprasReais = dataRows.map(r => parseCompra(r, headerMap));
        break;
      case 'maoDeObraReal':
        result.maoDeObraReal = dataRows.map(r => parseMaoDeObra(r, headerMap));
        break;
      case 'medicoes':
        result.medicoes = dataRows.map(r => parseMedicao(r, headerMap));
        break;
    }
  }

  if (!foundTabs.has('obras')) {
    errors.push('Não encontrei a aba "Obras".');
  }

  result.errors = errors;
  return result;
}
