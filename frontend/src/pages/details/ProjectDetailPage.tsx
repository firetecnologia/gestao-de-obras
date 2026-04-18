import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { DetailPageHeader } from "@/components/shared/DetailPageHeader"
import { InfoCard } from "@/components/shared/InfoCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { projectsApi, planningApi, financialApi, diaryApi } from "@/services/api"
import { useToast } from "@/components/ui/toast"
import { formatBRL, formatDateBR } from "@/lib/format"

const TYPE_LABELS: Record<string, string> = {
  reforma_residencial: "Reforma Residencial", reforma_comercial: "Reforma Comercial",
  construcao: "Construcao", gestao: "Gestao de Obra",
  planejamento: "Planejamento", compatibilizacao: "Compatibilizacao",
}

interface Project {
  id: string; name: string; code?: string; client_id?: string; client_name?: string
  type: string; status: string; description?: string
  planned_start?: string; planned_end?: string; actual_start?: string; actual_end?: string
  area_m2?: number; estimated_value?: number; address_city?: string; address_state?: string
  created_at?: string
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [phases, setPhases] = useState<Array<Record<string, unknown>>>([])
  const [financial, setFinancial] = useState<Array<Record<string, unknown>>>([])
  const [diary, setDiary] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("resumo")
  const { showToast } = useToast()

  useEffect(() => {
    if (!id) return
    const fetch = async () => {
      setLoading(true)
      try {
        const pRes = await projectsApi.get(id)
        setProject(pRes.data)
        try {
          const phRes = await planningApi.getPhases(id)
          setPhases(phRes.data || [])
        } catch { /* planning may not exist yet */ }
        try {
          const fRes = await financialApi.listEntries({ project_id: id, page_size: 50 })
          setFinancial(fRes.data.items || [])
        } catch { /* ok */ }
        try {
          const dRes = await diaryApi.list({ project_id: id, page_size: 20 })
          setDiary(dRes.data.items || [])
        } catch { /* ok */ }
      } catch {
        showToast("Erro ao carregar obra", "error")
      } finally { setLoading(false) }
    }
    fetch()
  }, [id, showToast])

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-slate-500">Carregando...</p></div>
  if (!project) return <div className="flex items-center justify-center py-20"><p className="text-slate-500">Obra nao encontrada</p></div>

  return (
    <div className="space-y-4">
      <DetailPageHeader
        title={project.name}
        subtitle={(project.code ? project.code + " - " : "") + (TYPE_LABELS[project.type] || project.type)}
        breadcrumbs={[
          { label: "Obras", href: "/projects" },
          { label: project.name },
        ]}
        actions={<StatusBadge status={project.status} />}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="cronograma">Cronograma ({phases.length})</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro ({financial.length})</TabsTrigger>
          <TabsTrigger value="diario">Diario ({diary.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <InfoCard label="Cliente" value={project.client_name || "-"} />
            <InfoCard label="Tipo" value={TYPE_LABELS[project.type] || project.type} />
            <InfoCard label="Area (m2)" value={project.area_m2 ? project.area_m2 + " m2" : "-"} />
            <InfoCard label="Valor Estimado" value={formatBRL(project.estimated_value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-700 mb-3">Periodo</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Inicio Previsto:</span><span>{formatDateBR(project.planned_start)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Fim Previsto:</span><span>{formatDateBR(project.planned_end)}</span></div>
                  {project.actual_start && <div className="flex justify-between"><span className="text-slate-500">Inicio Real:</span><span>{formatDateBR(project.actual_start)}</span></div>}
                  {project.actual_end && <div className="flex justify-between"><span className="text-slate-500">Fim Real:</span><span>{formatDateBR(project.actual_end)}</span></div>}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-700 mb-3">Descricao</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{project.description || "Sem descricao."}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cronograma">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Fase</TableHead><TableHead>Inicio</TableHead><TableHead>Fim</TableHead>
                <TableHead>Progresso</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {phases.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Nenhuma fase cadastrada</TableCell></TableRow>
                ) : phases.map((ph) => (
                  <TableRow key={String(ph.id)}>
                    <TableCell className="font-medium">{String(ph.name || "")}</TableCell>
                    <TableCell className="text-sm">{formatDateBR(ph.planned_start as string)}</TableCell>
                    <TableCell className="text-sm">{formatDateBR(ph.planned_end as string)}</TableCell>
                    <TableCell className="text-sm">{ph.progress_percent ? ph.progress_percent + "%" : "-"}</TableCell>
                    <TableCell><StatusBadge status={String(ph.status || "pendente")} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="financeiro">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Tipo</TableHead><TableHead>Descricao</TableHead><TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {financial.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Nenhum lancamento</TableCell></TableRow>
                ) : financial.map((f) => (
                  <TableRow key={String(f.id)}>
                    <TableCell><StatusBadge status={String(f.type === "receita" ? "recebido" : "atrasado")} /></TableCell>
                    <TableCell className="font-medium">{String(f.description || "")}</TableCell>
                    <TableCell className="font-semibold">{formatBRL(f.planned_amount || f.actual_amount)}</TableCell>
                    <TableCell className="text-sm">{formatDateBR(f.due_date as string)}</TableCell>
                    <TableCell><StatusBadge status={String(f.status || "pendente")} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="diario">
          <div className="space-y-3">
            {diary.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-slate-500">Nenhum registro de diario</CardContent></Card>
            ) : diary.map((d) => (
              <Card key={String(d.id)}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{formatDateBR(d.date as string)}</p>
                      <p className="text-sm text-slate-600 mt-1">{String((d.description as string) || (d.activities as string) || "")}</p>
                      {d.weather ? <p className="text-xs text-slate-400 mt-1">Clima: {String(d.weather)}</p> : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
