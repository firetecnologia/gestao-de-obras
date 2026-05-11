"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import {
  Target,
  AlertTriangle,
  TrendingUp,
  Calendar,
  BarChart3,
} from "lucide-react"

interface DashboardData {
  cards: {
    total: number
    novas: number
    alta_prioridade: number
    ultimos_7_dias: number
    ultimos_30_dias: number
  }
  graficos: {
    por_cidade: { cidade: string; total: number }[]
    por_tipo: { tipo: string; total: number }[]
    por_fase: { fase: string; total: number }[]
    por_fonte: { fonte: string; total: number }[]
    por_prioridade: { prioridade: string; total: number }[]
    por_status: { status: string; total: number }[]
  }
}

const PRIORITY_COLORS: Record<string, string> = {
  alta: "bg-red-100 text-red-700",
  media: "bg-yellow-100 text-yellow-700",
  baixa: "bg-green-100 text-green-700",
}

const STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  analisar: "Analisar",
  contatar: "Contatar",
  "contato realizado": "Contato Realizado",
  "em negociação": "Em Negociação",
  "proposta enviada": "Proposta Enviada",
  convertido: "Convertido",
  "sem interesse": "Sem Interesse",
  descartado: "Descartado",
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getDashboard()
      .then((d) => setData(d as DashboardData))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!data) return <p className="text-muted-foreground">Erro ao carregar dashboard.</p>

  const cards = [
    { label: "Total de Oportunidades", value: data.cards.total, icon: Target, color: "text-primary" },
    { label: "Novas", value: data.cards.novas, icon: TrendingUp, color: "text-green-600" },
    { label: "Alta Prioridade", value: data.cards.alta_prioridade, icon: AlertTriangle, color: "text-red-600" },
    { label: "Últimos 7 dias", value: data.cards.ultimos_7_dias, icon: Calendar, color: "text-blue-600" },
    { label: "Últimos 30 dias", value: data.cards.ultimos_30_dias, icon: BarChart3, color: "text-purple-600" },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{card.label}</span>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Por Cidade" items={data.graficos.por_cidade.map((i) => ({ label: i.cidade, value: i.total }))} />
        <ChartCard title="Por Tipo de Obra" items={data.graficos.por_tipo.map((i) => ({ label: i.tipo, value: i.total }))} />
        <ChartCard title="Por Fase" items={data.graficos.por_fase.map((i) => ({ label: i.fase, value: i.total }))} />
        <ChartCard title="Por Fonte" items={data.graficos.por_fonte.map((i) => ({ label: i.fonte, value: i.total }))} />
        <ChartCard
          title="Por Prioridade"
          items={data.graficos.por_prioridade.map((i) => ({ label: i.prioridade, value: i.total }))}
          colorMap={PRIORITY_COLORS}
        />
        <ChartCard
          title="Por Status Comercial"
          items={data.graficos.por_status.map((i) => ({ label: STATUS_LABELS[i.status] || i.status, value: i.total }))}
        />
      </div>
    </div>
  )
}

function ChartCard({
  title,
  items,
  colorMap,
}: {
  title: string
  items: { label: string; value: number }[]
  colorMap?: Record<string, string>
}) {
  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="font-semibold mb-4">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem dados</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="text-sm w-32 truncate flex-shrink-0" title={item.label}>
                {colorMap?.[item.label] ? (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorMap[item.label]}`}>
                    {item.label}
                  </span>
                ) : (
                  item.label
                )}
              </span>
              <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(item.value / max) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium w-8 text-right">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
