/**
 * Utility functions for financial calculations
 */

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function calcularMargem(receita: number, custo: number): number {
  if (receita === 0) return 0;
  return ((receita - custo) / receita) * 100;
}

export function calcularDesvioCusto(previsto: number, realizado: number): number {
  if (previsto === 0) return 0;
  return ((realizado - previsto) / previsto) * 100;
}

export function parseBRLNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  
  // Remove "R$", spaces, dots (thousands), replace comma with dot
  const cleaned = value
    .replace(/R\$\s*/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parseBRDate(value: string | undefined | null): string {
  if (!value) return '';
  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
  // DD/MM/YYYY
  const match = value.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3].length === 2 ? '20' + match[3] : match[3];
    return `${year}-${month}-${day}`;
  }
  return value;
}

export function sumBy<T>(arr: T[], fn: (item: T) => number): number {
  return arr.reduce((acc, item) => acc + fn(item), 0);
}

export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

export function topN<T>(arr: T[], n: number, fn: (item: T) => number): T[] {
  return [...arr].sort((a, b) => fn(b) - fn(a)).slice(0, n);
}
