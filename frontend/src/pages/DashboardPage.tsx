import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { dashboardApi, projectsApi, clientsApi } from "@/services/api"
import { formatBRL } from "@/lib/format"

type View = "geral" | "obra" | "cliente"

export default function DashboardPage() {
  const [view, setView] = useState<View>("geral")
  const [selectedProject, setSelectedProject] = useState("")
  const [selectedClient, setSelectedClient] = useState("")

  const { data: execData } = useQuery({ queryKey: ["dashboard-executive"], queryFn: dashboardApi.executive })
  const { data: pieData } = useQuery({ queryKey: ["dashboard-pie"], queryFn: dashboardApi.pieCharts })
  const { data: projectsData } = useQuery({ queryKey: ["projects-list"], queryFn: () => projectsApi.list() })
  const { data: clientsData } = useQuery({ queryKey: ["clients-list"], queryFn: () => clientsApi.list() })
  const { data: projectDash } = useQuery({ queryKey: ["dashboard-project", selectedProject], queryFn: () => dashboardApi.byProject(selectedProject), enabled: !!selectedProject })
  const { data: clientDash } = useQuery({ queryKey: ["dashboard-client", selectedClient], queryFn: () => dashboardApi.byClient(selectedClient), enabled: !!selectedClient })

  const exec = execData?.data || {}
  const pie = pieData?.data || {}
  const projects = projectsData?.data?.items || []
  const clients = clientsData?.data?.items || []

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          {(["geral", "obra", "cliente"] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded text-sm font-medium ${view === v ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
              {v === "geral" ? "Visão Geral" : v === "obra" ? "Por Obra" : "Por Cliente"}
            </button>
          ))}
        </div>
      </div>

      {view === "geral" && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card label="Receita Recebida" value={formatBRL(exec.revenue_received || 0)} color="green" />
            <Card label="Custos Totais" value={formatBRL(exec.total_costs || 0)} color="red" />
            <Card label="Lucro" value={formatBRL(exec.profit || 0)} color={exec.profit >= 0 ? "green" : "red"} />
            <Card label="Obras Ativas" value={exec.active_projects || 0} />
          </div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card label="Obras Atrasadas" value={exec.delayed_projects || 0} color="red" />
            <Card label="Pipeline (Leads)" value={exec.pipeline_leads || 0} />
            <Card label="Parcelas Vencidas" value={exec.overdue_installments || 0} color="red" />
            <Card label="Contratos no Mes" value={exec.contracts_this_month || 0} />
          </div>
          {pie.revenue_vs_expenses && (
            <div className="grid grid-cols-2 gap-6">
              <PieChart title="Receitas x Despesas" data={pie.revenue_vs_expenses} />
              <PieChart title="Status das Obras" data={pie.projects_by_status} />
              <PieChart title="Parcelas" data={pie.installments_by_status} />
              <PieChart title="Categorias de Custo" data={pie.expenses_by_category} />
            </div>
          )}
        </>
      )}

      {view === "obra" && (
        <div>
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="border rounded px-3 py-2 mb-6 w-64">
            <option value="">Selecione uma obra</option>
            {projects.map((p: Record<string, unknown>) => <option key={p.id as string} value={p.id as string}>{p.name as string}</option>)}
          </select>
          {projectDash?.data && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <Card label="Receitas" value={formatBRL(projectDash.data.revenue_received || 0)} />
              <Card label="Despesas" value={formatBRL(projectDash.data.expenses_paid || 0)} />
              <Card label="Saldo" value={formatBRL(projectDash.data.balance || 0)} color={projectDash.data.balance >= 0 ? "green" : "red"} />
              <Card label="Progresso" value={`${projectDash.data.progress || 0}%`} />
            </div>
          )}
        </div>
      )}

      {view === "cliente" && (
        <div>
          <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="border rounded px-3 py-2 mb-6 w-64">
            <option value="">Selecione um cliente</option>
            {clients.map((c: Record<string, unknown>) => <option key={c.id as string} value={c.id as string}>{c.name as string}</option>)}
          </select>
          {clientDash?.data && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <Card label="Total Obras" value={clientDash.data.projects_count || 0} />
              <Card label="Receitas" value={formatBRL(clientDash.data.revenue_total || 0)} />
              <Card label="Despesas" value={formatBRL(clientDash.data.expenses_total || 0)} />
              <Card label="Saldo" value={formatBRL(clientDash.data.balance || 0)} color={clientDash.data.balance >= 0 ? "green" : "red"} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Card({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const textColor = color === "red" ? "text-red-600" : color === "green" ? "text-green-600" : "text-gray-900"
  return (
    <div className="bg-white border rounded-lg p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${textColor}`}>{value}</p>
    </div>
  )
}

function PieChart({ title, data }: { title: string; data: Array<{ label: string; value: number }> }) {
  if (!data || data.length === 0) return null
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#6B7280"]
  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="font-medium mb-3">{title}</h3>
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-sm flex-1">{item.label}</span>
            <span className="text-sm font-medium">{total > 0 ? Math.round((item.value / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
      {total > 0 && (
        <div className="mt-3 h-4 rounded-full overflow-hidden bg-gray-100 flex">
          {data.map((item, i) => (
            <div key={item.label} style={{ width: `${(item.value / total) * 100}%`, backgroundColor: colors[i % colors.length] }} className="h-full" />
          ))}
        </div>
      )}
    </div>
  )
}
