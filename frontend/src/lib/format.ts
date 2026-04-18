/**
 * Central formatting utilities for the Gestão de Obras ERP.
 * All monetary, date, and number formatting should use these functions.
 */

/**
 * Safely converts any value to a finite number.
 * Returns 0 for null, undefined, NaN, Infinity, empty strings, and non-numeric values.
 */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0
  const n = typeof value === "string" ? parseFloat(value) : Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * Formats a value as BRL currency (R$ 1.234,56).
 * Handles null, undefined, NaN, strings, and Decimal objects from the API.
 */
export function formatBRL(value: unknown): string {
  const n = toNumber(value)
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n)
}

/**
 * Formats a date string (YYYY-MM-DD or ISO) to Brazilian format (DD/MM/YYYY).
 * Returns "-" for null/undefined/empty.
 */
export function formatDateBR(value: string | null | undefined): string {
  if (!value) return "-"
  try {
    const d = new Date(value + (value.length === 10 ? "T12:00:00" : ""))
    if (isNaN(d.getTime())) return value
    return d.toLocaleDateString("pt-BR")
  } catch {
    return value
  }
}

/**
 * Formats a datetime string to Brazilian format (DD/MM/YYYY HH:mm).
 */
export function formatDateTimeBR(value: string | null | undefined): string {
  if (!value) return "-"
  try {
    const d = new Date(value)
    if (isNaN(d.getTime())) return value
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  } catch {
    return value
  }
}

/**
 * Formats a number as percentage (e.g., 30 -> "30%").
 */
export function formatPercent(value: unknown): string {
  const n = toNumber(value)
  return `${n.toFixed(1)}%`
}
