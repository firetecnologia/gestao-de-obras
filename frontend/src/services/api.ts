import { API_URL } from "@/lib/utils"

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.href = "/login"
    }
  }
  return res
}

async function get<T>(path: string): Promise<T> {
  const res = await request(path)
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`)
  return res.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await request(path, { method: "POST", body: JSON.stringify(body) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `POST ${path}: ${res.status}`)
  }
  return res.json()
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await request(path, { method: "PUT", body: JSON.stringify(body) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `PUT ${path}: ${res.status}`)
  }
  return res.json()
}

async function patch<T>(path: string): Promise<T> {
  const res = await request(path, { method: "PATCH" })
  if (!res.ok) throw new Error(`PATCH ${path}: ${res.status}`)
  return res.json()
}

async function del(path: string): Promise<void> {
  const res = await request(path, { method: "DELETE" })
  if (!res.ok) throw new Error(`DELETE ${path}: ${res.status}`)
}

export const api = {
  // Auth
  login: (email: string, senha: string) => post<{ access_token: string; user: unknown }>("/auth/login", { email, senha }),
  me: () => get<unknown>("/auth/me"),

  // Cidades
  getCidades: (params?: string) => get<unknown[]>(`/cidades${params ? `?${params}` : ""}`),
  getCidade: (id: number) => get<unknown>(`/cidades/${id}`),
  createCidade: (data: unknown) => post<unknown>("/cidades", data),
  updateCidade: (id: number, data: unknown) => put<unknown>(`/cidades/${id}`, data),
  deleteCidade: (id: number) => del(`/cidades/${id}`),

  // Palavras-chave
  getPalavrasChave: (params?: string) => get<unknown[]>(`/palavras-chave${params ? `?${params}` : ""}`),
  createPalavraChave: (data: unknown) => post<unknown>("/palavras-chave", data),
  updatePalavraChave: (id: number, data: unknown) => put<unknown>(`/palavras-chave/${id}`, data),
  deletePalavraChave: (id: number) => del(`/palavras-chave/${id}`),

  // Construtoras
  getConstrutoras: (params?: string) => get<unknown[]>(`/construtoras${params ? `?${params}` : ""}`),
  getConstrutora: (id: number) => get<unknown>(`/construtoras/${id}`),
  createConstrutora: (data: unknown) => post<unknown>("/construtoras", data),
  updateConstrutora: (id: number, data: unknown) => put<unknown>(`/construtoras/${id}`, data),
  deleteConstrutora: (id: number) => del(`/construtoras/${id}`),

  // Fontes
  getFontes: (params?: string) => get<unknown[]>(`/fontes${params ? `?${params}` : ""}`),
  createFonte: (data: unknown) => post<unknown>("/fontes", data),
  updateFonte: (id: number, data: unknown) => put<unknown>(`/fontes/${id}`, data),
  deleteFonte: (id: number) => del(`/fontes/${id}`),

  // Oportunidades
  getOportunidades: (params?: string) => get<unknown[]>(`/oportunidades${params ? `?${params}` : ""}`),
  getOportunidade: (id: number) => get<unknown>(`/oportunidades/${id}`),
  createOportunidade: (data: unknown) => post<unknown>("/oportunidades", data),
  updateOportunidade: (id: number, data: unknown) => put<unknown>(`/oportunidades/${id}`, data),
  updateStatus: (id: number, status: string) => patch<unknown>(`/oportunidades/${id}/status?status=${status}`),
  deleteOportunidade: (id: number) => del(`/oportunidades/${id}`),
  addHistorico: (id: number, data: unknown) => post<unknown>(`/oportunidades/${id}/historico`, data),

  // PNCP
  buscarPNCP: (data: unknown) => post<unknown>("/pncp/buscar", data),

  // Dashboard
  getDashboard: () => get<unknown>("/dashboard"),

  // Relatório
  getRelatorioSemanal: () => get<unknown>("/relatorio/semanal"),
  getRelatorioCSV: () => request("/relatorio/semanal/csv"),
  getRelatorioExcel: () => request("/relatorio/semanal/excel"),
}
