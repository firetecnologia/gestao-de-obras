"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import { formatBRL, formatDateBR } from "@/lib/utils"
import { Download, FileSpreadsheet } from "lucide-react"

interface RelatorioData {
  periodo: { inicio: string; fim: string }
  resumo: { total_novas: number; total_alta_prioridade: number }
  novas_da_semana: OportunidadeResumo[]
  alta_prioridade: OportunidadeResumo[]
  melhores_cidades: { cidade: string; total: number }[]
  melhores_fontes: { fonte: string; total: number }[]
  lista_prospeccao: OportunidadeResumo[]
}

interface OportunidadeResumo {
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
  servicos_sugeridos: string | null
  data_encontrada: string | null
}

const PRIORIDADE_BADGE: Record<string, string> = {
  alta: "bg-red-100 text-red-700",
  media: "bg-yellow-100 text-yellow-700",
  baixa: "bg-green-100 text-green-700",
}

export default function RelatorioPage() {
  const [data, setData] = useState<RelatorioData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getRelatorioSemanal()
      .then((d) => setData(d as RelatorioData))
      .finally(() => setLoading(false))
  }, [])

  const handleDownloadCSV = async () => {
    const res = await api.getRelatorioCSV()
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "relatorio_semanal.csv"
    a.click()
  }

  const handleDownloadExcel = async () => {
    const res = await api.getRelatorioExcel()
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "relatorio_semanal.xlsx"
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!data) return <p className="text-muted-foreground">Erro ao carregar relatório.</p>

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Relatório Semanal</h1>
          <p className="text-sm text-muted-foreground">
            Período: {formatDateBR(data.periodo.inicio)} a {formatDateBR(data.periodo.fim)}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadCSV} className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={handleDownloadExcel} className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Novas da Semana</p>
          <p className="text-3xl font-bold text-primary">{data.resumo.total_novas}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Alta Prioridade</p>
          <p className="text-3xl font-bold text-red-600">{data.resumo.total_alta_prioridade}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold mb-3">Melhores Cidades</h3>
          {data.melhores_cidades.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados</p> : (
            <div className="space-y-2">
              {data.melhores_cidades.map((c) => (
                <div key={c.cidade} className="flex justify-between text-sm">
                  <span>{c.cidade}</span>
                  <span className="font-medium">{c.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold mb-3">Melhores Fontes</h3>
          {data.melhores_fontes.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados</p> : (
            <div className="space-y-2">
              {data.melhores_fontes.map((f) => (
                <div key={f.fonte} className="flex justify-between text-sm">
                  <span>{f.fonte}</span>
                  <span className="font-medium">{f.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold mb-4">Lista de Prospecção (Top 20)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 font-medium">Score</th>
                <th className="text-left p-2 font-medium">Prioridade</th>
                <th className="text-left p-2 font-medium">Obra</th>
                <th className="text-left p-2 font-medium">Cidade/UF</th>
                <th className="text-left p-2 font-medium">Valor</th>
                <th className="text-left p-2 font-medium">Serviços Sugeridos</th>
              </tr>
            </thead>
            <tbody>
              {data.lista_prospeccao.map((item) => (
                <tr key={item.id} className="border-b border-border hover:bg-muted/30">
                  <td className="p-2 font-medium">{item.score}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORIDADE_BADGE[item.prioridade]}`}>
                      {item.prioridade}
                    </span>
                  </td>
                  <td className="p-2 max-w-[250px] truncate" title={item.nome_obra}>{item.nome_obra}</td>
                  <td className="p-2">{item.cidade ? `${item.cidade}/${item.uf}` : item.uf || "-"}</td>
                  <td className="p-2 whitespace-nowrap">{formatBRL(item.valor_estimado)}</td>
                  <td className="p-2 max-w-[200px] truncate text-xs" title={item.servicos_sugeridos || ""}>{item.servicos_sugeridos || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
