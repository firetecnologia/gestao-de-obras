import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { dashboardApi } from "@/services/api"
import {
  HardHat, AlertTriangle, DollarSign, TrendingUp,
  Users, ShoppingCart, BookOpen, Clock
} from "lucide-react"

interface ExecutiveData {
  active_projects: number
  delayed_projects: number
  revenue_planned: number
  revenue_received: number
  total_costs: number
  profit: number
  overdue_installments: number
  overdue_amount: number
  pipeline_leads: number
  contracts_this_month: number
}

interface OperationalData {
  delayed_tasks: number
  pending_purchases: number
  recent_diaries: number
  projects_by_status: Record<string, number>
  lead_pipeline: Record<string, number>
  delayed_phases: Array<{ name: string; planned_end: string; project_id: string }>
}

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
}

export default function DashboardPage() {
  const [exec, setExec] = useState<ExecutiveData | null>(null)
  const [ops, setOps] = useState<OperationalData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([dashboardApi.executive(), dashboardApi.operational()])
      .then(([e, o]) => { setExec(e.data); setOps(o.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Obras Ativas</p>
                <p className="text-3xl font-bold">{exec?.active_projects ?? 0}</p>
              </div>
              <HardHat className="h-10 w-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Obras Atrasadas</p>
                <p className="text-3xl font-bold text-red-600">{exec?.delayed_projects ?? 0}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Receita Recebida</p>
                <p className="text-2xl font-bold text-green-600">{formatBRL(exec?.revenue_received ?? 0)}</p>
              </div>
              <DollarSign className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Lucro</p>
                <p className="text-2xl font-bold">{formatBRL(exec?.profit ?? 0)}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pipeline (Leads)</p>
                <p className="text-3xl font-bold">{exec?.pipeline_leads ?? 0}</p>
              </div>
              <Users className="h-10 w-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Parcelas em Atraso</p>
                <p className="text-2xl font-bold text-red-600">{exec?.overdue_installments ?? 0}</p>
                <p className="text-xs text-slate-500">{formatBRL(exec?.overdue_amount ?? 0)}</p>
              </div>
              <Clock className="h-10 w-10 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Compras Pendentes</p>
                <p className="text-3xl font-bold">{ops?.pending_purchases ?? 0}</p>
              </div>
              <ShoppingCart className="h-10 w-10 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Diários (7 dias)</p>
                <p className="text-3xl font-bold">{ops?.recent_diaries ?? 0}</p>
              </div>
              <BookOpen className="h-10 w-10 text-teal-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Obras por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {ops?.projects_by_status && Object.entries(ops.projects_by_status).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(ops.projects_by_status).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <Badge variant={status === "em_andamento" ? "info" : status === "concluida" ? "success" : "secondary"}>
                      {status.replace(/_/g, " ")}
                    </Badge>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Nenhuma obra cadastrada</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pipeline de Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {ops?.lead_pipeline && Object.entries(ops.lead_pipeline).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(ops.lead_pipeline).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <Badge variant="outline">{status.replace(/_/g, " ")}</Badge>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Nenhum lead cadastrado</p>
            )}
          </CardContent>
        </Card>
      </div>

      {ops?.delayed_phases && ops.delayed_phases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-red-600">Fases Atrasadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ops.delayed_phases.map((phase, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded">
                  <span className="font-medium">{phase.name}</span>
                  <span className="text-sm text-red-600">Previsto: {phase.planned_end}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
