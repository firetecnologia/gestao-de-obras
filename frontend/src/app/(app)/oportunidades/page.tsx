"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api } from "@/services/api"
import { formatBRL, formatDateBR } from "@/lib/utils"
import { Plus, Search, Eye, Trash2 } from "lucide-react"

interface Oportunidade {
  id: number
  nome_obra: string
  cidade: string | null
  uf: string | null
  tipo_obra: string | null
  fase_provavel: string | null
  score: number
  prioridade: string
  valor_estimado: number | null
  fonte: string | null
  status: string
  data_encontrada: string
  proxima_acao: string | null
  servicos_sugeridos: string | null
}

const PRIORIDADE_BADGE: Record<string, string> = {
  alta: "bg-red-100 text-red-700",
  media: "bg-yellow-100 text-yellow-700",
  baixa: "bg-green-100 text-green-700",
}

const STATUS_OPTIONS = [
  "novo", "analisar", "contatar", "contato realizado", "em negociação",
  "proposta enviada", "convertido", "sem interesse", "descartado",
]

export default function OportunidadesPage() {
  const [items, setItems] = useState<Oportunidade[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    busca: "",
    status: "",
    prioridade: "",
    uf: "",
    tipo_obra: "",
  })

  const loadData = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.busca) params.set("busca", filters.busca)
    if (filters.status) params.set("status", filters.status)
    if (filters.prioridade) params.set("prioridade", filters.prioridade)
    if (filters.uf) params.set("uf", filters.uf)
    if (filters.tipo_obra) params.set("tipo_obra", filters.tipo_obra)
    api.getOportunidades(params.toString())
      .then((d) => setItems(d as Oportunidade[]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [filters.status, filters.prioridade, filters.uf, filters.tipo_obra])

  const handleStatusChange = async (id: number, status: string) => {
    await api.updateStatus(id, status)
    loadData()
  }

  const handleDelete = async (id: number) => {
    if (confirm("Descartar esta oportunidade?")) {
      await api.deleteOportunidade(id)
      loadData()
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Oportunidades</h1>
        <Link
          href="/oportunidades/nova"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Nova Oportunidade
        </Link>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nome, contratante..."
                value={filters.busca}
                onChange={(e) => setFilters({ ...filters, busca: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && loadData()}
                className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="">Todos os status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select
            value={filters.prioridade}
            onChange={(e) => setFilters({ ...filters, prioridade: e.target.value })}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="">Todas prioridades</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
          <select
            value={filters.uf}
            onChange={(e) => setFilters({ ...filters, uf: e.target.value })}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
          >
            <option value="">Todos os estados</option>
            <option value="SP">SP</option>
            <option value="MG">MG</option>
            <option value="RJ">RJ</option>
            <option value="PR">PR</option>
          </select>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium">Prioridade</th>
                <th className="text-left p-3 font-medium">Score</th>
                <th className="text-left p-3 font-medium">Obra / Resumo</th>
                <th className="text-left p-3 font-medium">Cidade/UF</th>
                <th className="text-left p-3 font-medium">Tipo</th>
                <th className="text-left p-3 font-medium">Fase</th>
                <th className="text-left p-3 font-medium">Valor</th>
                <th className="text-left p-3 font-medium">Fonte</th>
                <th className="text-left p-3 font-medium">Data</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">Nenhuma oportunidade encontrada</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${PRIORIDADE_BADGE[item.prioridade] || ""}`}>
                        {item.prioridade}
                      </span>
                    </td>
                    <td className="p-3 font-medium">{item.score}</td>
                    <td className="p-3 max-w-[250px]">
                      <p className="truncate font-medium" title={item.nome_obra}>{item.nome_obra}</p>
                    </td>
                    <td className="p-3 whitespace-nowrap">{item.cidade ? `${item.cidade}/${item.uf}` : item.uf || "-"}</td>
                    <td className="p-3">{item.tipo_obra || "-"}</td>
                    <td className="p-3">{item.fase_provavel || "-"}</td>
                    <td className="p-3 whitespace-nowrap">{formatBRL(item.valor_estimado)}</td>
                    <td className="p-3">{item.fonte || "-"}</td>
                    <td className="p-3 whitespace-nowrap">{formatDateBR(item.data_encontrada)}</td>
                    <td className="p-3">
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
                        className="px-2 py-1 border border-border rounded text-xs focus:ring-1 focus:ring-primary outline-none"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/oportunidades/${item.id}`}
                          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                          title="Descartar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
