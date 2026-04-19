import { useState } from "react"
import { useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { projectsApi, measurementsApi, planningApi, financialApi } from "@/services/api"
import { formatBRL, formatDateBR } from "@/lib/format"
import { useToast } from "@/components/ui/toast"
import { DetailPageHeader } from "@/components/shared/DetailPageHeader"

type Tab = "resumo" | "medicoes" | "cronograma" | "financeiro" | "diario"

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>("resumo")

  const { data } = useQuery({ queryKey: ["project", id], queryFn: () => projectsApi.get(id!) })
  const { data: measurementsData } = useQuery({ queryKey: ["measurements", id], queryFn: () => measurementsApi.list(id!), enabled: tab === "medicoes" })
  const { data: phasesData } = useQuery({ queryKey: ["phases", id], queryFn: () => planningApi.getPhases(id!), enabled: tab === "cronograma" })
  const { data: finData } = useQuery({ queryKey: ["project-financial", id], queryFn: () => financialApi.listEntries({ project_id: id }), enabled: tab === "financeiro" })

  const project = data?.data
  const measurements = measurementsData?.data || []
  const phases = phasesData?.data || []
  const entries = finData?.data || []

  const [mForm, setMForm] = useState({ phase_id: "", percent_complete: "", measured_value: "", observation: "" })
  const [showMForm, setShowMForm] = useState(false)

  const createMeasurement = useMutation({
    mutationFn: (d: Record<string, unknown>) => measurementsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["measurements", id] }); setShowMForm(false); showToast("Medição registrada! Cronograma e financeiro atualizados.") },
  })

  if (!project) return <div className="p-6">Carregando...</div>

  const tabs: { key: Tab; label: string }[] = [
    { key: "resumo", label: "Resumo" },
    { key: "medicoes", label: "Medições" },
    { key: "cronograma", label: "Cronograma" },
    { key: "financeiro", label: "Financeiro" },
    { key: "diario", label: "Diário" },
  ]

  return (
    <div className="p-6">
      <DetailPageHeader title={project.name} breadcrumbs={[{ label: "Obras", href: "/projects" }, { label: project.name }]} />
      <div className="flex gap-2 mb-6 border-b">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 font-medium border-b-2 ${tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "resumo" && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold">Dados da Obra</h3>
            <p><span className="text-gray-500">Status:</span> <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-sm">{project.status}</span></p>
            <p><span className="text-gray-500">Tipo:</span> {project.type || "-"}</p>
            <p><span className="text-gray-500">Endereço:</span> {project.address || "-"}</p>
            <p><span className="text-gray-500">Início:</span> {formatDateBR(project.start_date)}</p>
            <p><span className="text-gray-500">Previsão Fim:</span> {formatDateBR(project.end_date)}</p>
            <p><span className="text-gray-500">Valor:</span> {formatBRL(project.total_value || 0)}</p>
          </div>
          <div className="bg-white border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold">Progresso</h3>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${project.progress || 0}%` }} />
            </div>
            <p className="text-center font-medium">{project.progress || 0}% concluído</p>
          </div>
        </div>
      )}

      {tab === "medicoes" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Medições da Obra</h3>
            <button onClick={() => setShowMForm(!showMForm)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">+ Nova Medição</button>
          </div>
          {showMForm && (
            <div className="bg-gray-50 p-4 rounded mb-4 grid grid-cols-2 gap-3">
              <select value={mForm.phase_id} onChange={(e) => setMForm({ ...mForm, phase_id: e.target.value })} className="border rounded px-3 py-2">
                <option value="">Selecione a fase</option>
                {phases.map((p: Record<string, unknown>) => <option key={p.id as string} value={p.id as string}>{p.name as string}</option>)}
              </select>
              <input placeholder="% Concluído" type="number" value={mForm.percent_complete} onChange={(e) => setMForm({ ...mForm, percent_complete: e.target.value })} className="border rounded px-3 py-2" />
              <input placeholder="Valor Medido (R$)" type="number" value={mForm.measured_value} onChange={(e) => setMForm({ ...mForm, measured_value: e.target.value })} className="border rounded px-3 py-2" />
              <input placeholder="Observação" value={mForm.observation} onChange={(e) => setMForm({ ...mForm, observation: e.target.value })} className="border rounded px-3 py-2" />
              <button onClick={() => createMeasurement.mutate({ project_id: id, phase_id: mForm.phase_id || undefined, percent_complete: Number(mForm.percent_complete) || 0, measured_value: Number(mForm.measured_value) || 0, observation: mForm.observation })} className="px-4 py-2 bg-green-600 text-white rounded col-span-2">Registrar Medição</button>
            </div>
          )}
          <p className="text-xs text-gray-500 mb-4">Ao registrar uma medição, o sistema atualiza automaticamente o progresso da fase e gera reflexo financeiro.</p>
          {measurements.length === 0 ? <p className="text-gray-500">Nenhuma medição registrada</p> : (
            <table className="w-full border-collapse">
              <thead><tr className="bg-gray-100"><th className="p-2 text-left">Data</th><th className="p-2 text-left">Fase</th><th className="p-2 text-right">% Concluído</th><th className="p-2 text-right">Valor</th><th className="p-2 text-left">Obs</th></tr></thead>
              <tbody>
                {measurements.map((m: Record<string, unknown>) => (
                  <tr key={m.id as string} className="border-b">
                    <td className="p-2">{formatDateBR(m.created_at as string)}</td>
                    <td className="p-2">{m.phase_name as string || "-"}</td>
                    <td className="p-2 text-right">{m.percent_complete as number}%</td>
                    <td className="p-2 text-right">{formatBRL(m.measured_value as number)}</td>
                    <td className="p-2 text-sm text-gray-500">{m.observation as string || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "cronograma" && (
        <div>
          <h3 className="font-semibold mb-4">Fases / Cronograma</h3>
          {phases.length === 0 ? <p className="text-gray-500">Nenhuma fase cadastrada</p> : (
            <div className="space-y-3">
              {phases.map((p: Record<string, unknown>) => (
                <div key={p.id as string} className="bg-white border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{p.name as string}</span>
                    <span className="text-sm">{p.progress_percent as number || 0}%</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${p.progress_percent as number || 0}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{formatDateBR(p.start_date as string)}</span>
                    <span>{formatDateBR(p.end_date as string)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "financeiro" && (
        <div>
          <h3 className="font-semibold mb-4">Financeiro da Obra</h3>
          {entries.length === 0 ? <p className="text-gray-500">Nenhum lançamento</p> : (
            <table className="w-full border-collapse">
              <thead><tr className="bg-gray-100"><th className="p-2 text-left">Data</th><th className="p-2 text-left">Descrição</th><th className="p-2 text-left">Tipo</th><th className="p-2 text-right">Valor</th></tr></thead>
              <tbody>
                {entries.map((e: Record<string, unknown>) => (
                  <tr key={e.id as string} className="border-b">
                    <td className="p-2">{formatDateBR(e.due_date as string || e.created_at as string)}</td>
                    <td className="p-2">{e.description as string}</td>
                    <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${e.type === "receita" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{e.type as string}</span></td>
                    <td className="p-2 text-right font-medium">{formatBRL(e.planned_amount as number || e.amount as number || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "diario" && <div className="text-gray-500">Diário de obra aparecerá aqui.</div>}
    </div>
  )
}
