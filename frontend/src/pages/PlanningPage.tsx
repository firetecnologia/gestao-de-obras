import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { planningApi, projectsApi } from "@/services/api"
import { Plus, ChevronDown, ChevronRight } from "lucide-react"

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  nao_iniciada: { label: "Não Iniciada", color: "bg-slate-200 text-slate-700" },
  em_andamento: { label: "Em Andamento", color: "bg-blue-100 text-blue-700" },
  concluida: { label: "Concluída", color: "bg-green-100 text-green-700" },
  atrasada: { label: "Atrasada", color: "bg-red-100 text-red-700" },
  pausada: { label: "Pausada", color: "bg-yellow-100 text-yellow-700" },
}

interface Phase { id: string; name: string; sort_order: number; planned_start?: string; planned_end?: string; status: string; progress_percent: number; tasks?: Task[] }
interface Task { id: string; name: string; planned_start?: string; planned_end?: string; status: string; progress_percent: number; responsible_id?: string }
interface Project { id: string; name: string; code?: string }

export default function PlanningPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState("")
  const [phases, setPhases] = useState<Phase[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())
  const [showPhaseForm, setShowPhaseForm] = useState(false)
  const [phaseForm, setPhaseForm] = useState({ name: "", planned_start: "", planned_end: "" })

  useEffect(() => {
    projectsApi.list({ page_size: 100 }).then(r => setProjects(r.data.items)).catch(() => {})
  }, [])

  const fetchPhases = useCallback(async () => {
    if (!selectedProject) return
    setLoading(true)
    try { const res = await planningApi.getPhases(selectedProject); setPhases(res.data) } catch { /* empty */ } finally { setLoading(false) }
  }, [selectedProject])

  useEffect(() => { fetchPhases() }, [fetchPhases])

  const togglePhase = (id: string) => {
    const next = new Set(expandedPhases)
    if (next.has(id)) next.delete(id); else next.add(id)
    setExpandedPhases(next)
  }

  const handleCreatePhase = async () => {
    try {
      await planningApi.createPhase({ ...phaseForm, project_id: selectedProject, planned_start: phaseForm.planned_start || undefined, planned_end: phaseForm.planned_end || undefined })
      setShowPhaseForm(false); fetchPhases()
    } catch { /* empty */ }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Planejamento / Cronograma</h1>
      </div>

      <div className="flex gap-4 items-end">
        <div className="w-80">
          <Label>Selecione a Obra</Label>
          <Select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
            <option value="">Selecione uma obra...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
          </Select>
        </div>
        {selectedProject && (
          <Button onClick={() => { setPhaseForm({ name: "", planned_start: "", planned_end: "" }); setShowPhaseForm(true) }} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" /> Nova Fase
          </Button>
        )}
      </div>

      {!selectedProject ? (
        <Card><CardContent className="py-12 text-center text-slate-500">Selecione uma obra para ver o planejamento</CardContent></Card>
      ) : loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>
      ) : phases.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500">Nenhuma fase cadastrada para esta obra</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {phases.map((phase) => (
            <Card key={phase.id}>
              <CardHeader className="py-3 px-4 cursor-pointer" onClick={() => togglePhase(phase.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expandedPhases.has(phase.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <CardTitle className="text-base">{phase.name}</CardTitle>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_MAP[phase.status]?.color || "bg-slate-100"}`}>
                      {STATUS_MAP[phase.status]?.label || phase.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span>{phase.planned_start} → {phase.planned_end}</span>
                    <div className="w-24 bg-slate-200 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${phase.progress_percent}%` }} />
                    </div>
                    <span className="font-mono text-xs">{phase.progress_percent}%</span>
                  </div>
                </div>
              </CardHeader>
              {expandedPhases.has(phase.id) && phase.tasks && phase.tasks.length > 0 && (
                <CardContent className="pt-0 pb-3">
                  <div className="ml-8 space-y-1">
                    {phase.tasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{task.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_MAP[task.status]?.color || "bg-slate-100"}`}>
                            {STATUS_MAP[task.status]?.label || task.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>{task.planned_start} → {task.planned_end}</span>
                          <div className="w-16 bg-slate-200 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${task.progress_percent}%` }} />
                          </div>
                          <span className="font-mono">{task.progress_percent}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showPhaseForm} onOpenChange={setShowPhaseForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Fase</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome da Fase</Label><Input value={phaseForm.name} onChange={(e) => setPhaseForm({ ...phaseForm, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Início Previsto</Label><Input type="date" value={phaseForm.planned_start} onChange={(e) => setPhaseForm({ ...phaseForm, planned_start: e.target.value })} /></div>
              <div><Label>Fim Previsto</Label><Input type="date" value={phaseForm.planned_end} onChange={(e) => setPhaseForm({ ...phaseForm, planned_end: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPhaseForm(false)}>Cancelar</Button>
            <Button onClick={handleCreatePhase} className="bg-orange-500 hover:bg-orange-600">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
