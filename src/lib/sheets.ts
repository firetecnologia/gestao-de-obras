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

function toNum(val: string | number | null | undefined): number {
  return parseBRLNumber(val);
}

function toStr(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function toDate(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  // Excel serial date numbers
  if (typeof val === 'number' && val > 40000 && val < 60000) {
    const date = new Date((val - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  return parseBRDate(String(val));
}

/**
 * Find the header row in a sheet by looking for rows with multiple text cells
 */
function findHeaderRow(rows: SheetRow[], knownHeaders: string[]): number {
  const lowerKnown = knownHeaders.map(h => h.toLowerCase());
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    const textCells = row.filter(c => typeof c === 'string' && c.trim().length > 1);
    if (textCells.length >= 3) {
      // Check if any known header matches
      const hasKnown = textCells.some(cell =>
        lowerKnown.some(kh => String(cell).toLowerCase().includes(kh))
      );
      if (hasKnown) return i;
    }
  }
  return 0;
}

// ===== FINANCEIRO parser =====
function parseFinanceiro(rows: SheetRow[], obraName: string): Obra {
  // Row 0 = headers, Row 1 = values
  const headers = (rows[0] || []).map(h => toStr(h).toLowerCase());
  const values = rows[1] || [];

  const getVal = (keywords: string[]): number => {
    for (const kw of keywords) {
      const idx = headers.findIndex(h => h.includes(kw));
      if (idx >= 0) return toNum(values[idx]);
    }
    return 0;
  };

  const getStatus = (): string => {
    const idx = headers.findIndex(h => h.includes('status'));
    if (idx >= 0) return toStr(values[idx]) || 'Em andamento';
    return 'Em andamento';
  };

  return {
    idObra: 'OBR-001',
    cliente: obraName || 'Obra',
    endereco: '',
    responsavel: '',
    arquiteto: '',
    inicio: '',
    previsaoTermino: '',
    status: getStatus(),
    receitaPrevista: getVal(['receita total prevista', 'receita prevista']),
    receitaRealizada: getVal(['receita realizada']),
    custoPrevisto: getVal(['custo previsto']),
    custoRealizado: getVal(['custo planilha', 'custo realizado']),
    lucroPrevisto: getVal(['lucro previsto']),
    lucroRealizado: getVal(['lucro realizado']),
  };
}

// ===== ORÇAMENTO parser =====
function parseOrcamento(rows: SheetRow[]): OrcamentoMaterial[] {
  // Find header row (usually row 7) with "ITEM", "PREVISÃO DE MATERIAIS", etc.
  let headerIdx = -1;
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    const firstCells = row.slice(0, 6).map(c => toStr(c).toLowerCase());
    if (firstCells.some(c => c.includes('item')) && firstCells.some(c => c.includes('material') || c.includes('previs'))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx < 0) return [];

  const result: OrcamentoMaterial[] = [];
  let currentCategory = '';

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => c === '' || c === null || c === undefined)) continue;

    const itemCode = toStr(row[0]);
    const material = toStr(row[1]);

    if (!itemCode && !material) continue;

    // Category row: integer item code (1, 2, 3...) or item with no decimal
    if (itemCode && !itemCode.includes('.') && /^\d+$/.test(itemCode)) {
      currentCategory = material;
      continue;
    }

    // Item row: has sub-item code like "1.1", "2.3", etc.
    if (itemCode && itemCode.includes('.') && material) {
      const unidade = toStr(row[2]);
      const quantidade = toNum(row[3]);
      const custoUnitario = toNum(row[4]);
      const custoTotal = toNum(row[5]);
      const valorVenda = toNum(row[7]) || toNum(row[6]);

      if (material && (custoTotal > 0 || quantidade > 0)) {
        result.push({
          idObra: 'OBR-001',
          categoria: currentCategory,
          material,
          unidade,
          quantidade,
          custoUnitario,
          custoTotal,
          valorVenda,
        });
      }
    }
  }

  return result;
}

// ===== CONTROLE DE MATERIAIS parser =====
function parseControleMateriais(rows: SheetRow[]): CompraReal[] {
  // Find header row with "DATA DO PEDIDO", "MATERIAL", "FORNECEDOR"
  let headerIdx = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    const cells = row.map(c => toStr(c).toLowerCase());
    if (cells.some(c => c.includes('material')) && cells.some(c => c.includes('fornecedor') || c.includes('data'))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx < 0) return [];

  const headers = rows[headerIdx].map(c => toStr(c).toLowerCase());
  const colData = headers.findIndex(h => h.includes('data'));
  const colMaterial = headers.findIndex(h => h.includes('material'));
  const colFornecedor = headers.findIndex(h => h.includes('fornecedor'));
  const colUn = headers.findIndex(h => h.includes('un'));
  const colQtd = headers.findIndex(h => h.includes('qtd') || h === 'qd');
  const colVlUnit = headers.findIndex(h => h.includes('vl. unit') || h.includes('vl unit'));
  const colVlTotal = headers.findIndex(h => h.includes('vl. total') || h.includes('vl total'));
  const colValorPedido = headers.findIndex(h => h.includes('valor pedido'));
  const colCentro = headers.findIndex(h => h.includes('centro'));

  const result: CompraReal[] = [];
  let lastDate = '';
  let lastFornecedor = '';

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const material = colMaterial >= 0 ? toStr(row[colMaterial]) : '';
    if (!material || material === '--') continue;

    // Date: if "--" or empty, use last date
    const rawDate = colData >= 0 ? row[colData] : '';
    if (rawDate && rawDate !== '--' && rawDate !== '') {
      lastDate = toDate(rawDate);
    }

    // Fornecedor: if empty, use last
    const rawForn = colFornecedor >= 0 ? toStr(row[colFornecedor]) : '';
    if (rawForn && rawForn !== '--') {
      lastFornecedor = rawForn;
    }

    const quantidade = colQtd >= 0 ? toNum(row[colQtd]) : 0;
    const valorUnitario = colVlUnit >= 0 ? toNum(row[colVlUnit]) : 0;
    const valorTotal = colVlTotal >= 0 ? toNum(row[colVlTotal]) : (colValorPedido >= 0 ? toNum(row[colValorPedido]) : 0);
    const centroCusto = colCentro >= 0 ? toStr(row[colCentro]) : '';

    if (quantidade > 0 || valorTotal > 0) {
      result.push({
        idObra: 'OBR-001',
        data: lastDate,
        material,
        fornecedor: lastFornecedor,
        unidade: colUn >= 0 ? toStr(row[colUn]) : '',
        quantidade,
        valorUnitario,
        valorTotal: valorTotal || (quantidade * valorUnitario),
        centroCusto,
        status: 'Entregue',
      });
    }
  }

  return result;
}

// ===== CONTROLE DE M.O. parser =====
function parseControleMO(rows: SheetRow[]): MaoDeObraReal[] {
  // Find header row with "FORNECEDOR", "SERVIÇO", "VALOR PREVISTO"
  let headerIdx = -1;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    const cells = row.map(c => toStr(c).toLowerCase());
    if (cells.some(c => c.includes('fornecedor')) && cells.some(c => c.includes('servic') || c.includes('valor'))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx < 0) return [];

  const headers = rows[headerIdx].map(c => toStr(c).toLowerCase());
  const colForn = headers.findIndex(h => h.includes('fornecedor'));
  const colServ = headers.findIndex(h => h.includes('servi'));
  const colPrev = headers.findIndex(h => h.includes('valor previsto'));
  const colExec = headers.findIndex(h => h.includes('data') && h.includes('exec'));
  const colPago = headers.findIndex(h => h.includes('valor pago'));
  const colExtra = headers.findIndex(h => h.includes('extra'));
  const colDtPag = headers.findIndex(h => h.includes('data') && h.includes('pagamento'));

  const result: MaoDeObraReal[] = [];
  let currentSection = '';

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const fornecedor = colForn >= 0 ? toStr(row[colForn]) : '';
    const servico = colServ >= 0 ? toStr(row[colServ]) : '';
    const valorPrevisto = colPrev >= 0 ? toNum(row[colPrev]) : 0;
    const valorPago = colPago >= 0 ? toNum(row[colPago]) : 0;

    // Section header: only first column filled, no numeric values
    if (fornecedor && !servico && valorPrevisto === 0 && valorPago === 0) {
      currentSection = fornecedor;
      continue;
    }

    // Data row: must have fornecedor and some value
    if (fornecedor && (valorPrevisto > 0 || valorPago > 0)) {
      const extra = colExtra >= 0 ? toNum(row[colExtra]) : 0;
      const dataExecucao = colExec >= 0 ? toDate(row[colExec]) : '';
      const dataPagamento = colDtPag >= 0 ? toDate(row[colDtPag]) : '';

      const isPaid = valorPago > 0;
      result.push({
        idObra: 'OBR-001',
        prestador: fornecedor,
        servico: servico || currentSection,
        valorPrevisto,
        valorPago,
        extra,
        dataExecucao,
        dataPagamento,
        status: isPaid ? 'Pago' : 'Pendente',
      });
    }
  }

  return result;
}

// ===== EMPREITAS parser =====
function parseEmpreitas(rows: SheetRow[]): OrcamentoServico[] {
  const result: OrcamentoServico[] = [];
  let currentAmbiente = '';

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const col0 = toStr(row[0]);
    const col1 = toStr(row[1]);
    const col2 = toStr(row[2]);

    if (!col0) continue;

    // Area header: no UN. (col1 is empty or text, col2 not a number)
    if (col0 && (!col1 || col1 === '') && !col2) {
      currentAmbiente = col0;
      continue;
    }

    // Check if this is an area header row (has sub-items but no unit)
    if (col0 && col1 === '' && (toNum(row[2]) === 0 || row[2] === '')) {
      currentAmbiente = col0;
      continue;
    }

    // Service row: servico, UN., QTD, valor unit, valor total, %, R$ executado
    const unidade = col1;
    const quantidade = toNum(row[2]);
    const custoUnitario = toNum(row[3]);
    const custoTotal = toNum(row[4]);
    const percentual = toNum(row[5]);
    const valorExecutado = toNum(row[6]);

    if (col0 && (custoTotal > 0 || quantidade > 0)) {
      result.push({
        idObra: 'OBR-001',
        ambiente: currentAmbiente,
        etapa: '',
        servico: col0,
        unidade,
        quantidade,
        custoUnitario,
        custoTotal,
        valorVenda: custoTotal,
        status: percentual >= 1 ? 'Concluído' : (valorExecutado > 0 ? 'Em andamento' : 'Pendente'),
      });
    }
  }

  return result;
}

// ===== Generic parser (original format) =====
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

/**
 * Extract obra/client name from ORÇAMENTO sheet
 */
function extractObraName(sheets: SheetData[]): string {
  for (const sheet of sheets) {
    const norm = sheet.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (norm.includes('orcamento') || norm.includes('financeiro')) {
      for (let i = 0; i < Math.min(5, sheet.rows.length); i++) {
        const row = sheet.rows[i];
        if (!row) continue;
        for (let j = 0; j < row.length - 1; j++) {
          const cell = String(row[j] || '').toLowerCase();
          if (cell.includes('cliente')) {
            const name = String(row[j + 1] || '').trim();
            if (name) return name;
          }
        }
      }
    }
  }
  return 'Obra';
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
  const obraName = extractObraName(sheets);

  // Detect if this is the "Núcleo 377" format (has FINANCEIRO, CONTROLE DE MATERIAIS, etc.)
  const isN377Format = sheets.some(s => {
    const norm = s.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return norm.includes('financeiro') || norm.includes('controle de m');
  });

  for (const sheet of sheets) {
    const tabKey = matchTabName(sheet.title);
    if (!tabKey) continue;
    foundTabs.add(tabKey);

    const rows = sheet.rows.filter(r => r && r.some(cell => cell !== null && cell !== undefined && cell !== ''));
    if (rows.length < 2) {
      errors.push(`Aba "${sheet.title}" não possui dados suficientes.`);
      continue;
    }

    if (isN377Format) {
      // Use specialized parsers for each tab
      switch (tabKey) {
        case 'financeiro':
          result.obras = [parseFinanceiro(rows, obraName)];
          break;
        case 'orcamentoMateriais':
          result.orcamentoMateriais = parseOrcamento(rows);
          break;
        case 'comprasReais':
          result.comprasReais = parseControleMateriais(rows);
          break;
        case 'maoDeObraReal':
          result.maoDeObraReal = parseControleMO(rows);
          break;
        case 'orcamentoServicos':
          result.orcamentoServicos = parseEmpreitas(rows);
          break;
      }
    } else {
      // Generic format (original)
      const headerRowIdx = findHeaderRow(rows, ['id obra', 'material', 'fornecedor', 'cliente', 'prestador', 'servico']);
      const headers = rows[headerRowIdx].map(h => String(h || ''));
      const headerMap = mapHeaders(headers);
      const dataRows = rows.slice(headerRowIdx + 1);

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
  }

  // For N377 format, if no "obras" was found but FINANCEIRO was, it's already set
  if (!foundTabs.has('obras') && !foundTabs.has('financeiro')) {
    errors.push('Não encontrei a aba "Obras" ou "Financeiro".');
  }

  result.errors = errors;
  return result;
}
