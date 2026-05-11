import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBRL(value: number | null | undefined): string {
  if (value == null) return "-"
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

export function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return "-"
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("pt-BR")
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
