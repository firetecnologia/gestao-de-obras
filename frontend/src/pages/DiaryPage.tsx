import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { diaryApi, projectsApi } from "@/services/api"
import { Plus, Pencil, Trash2, Camera, Calendar } from "lucide-react"

interface DiaryEntry { id: string; project_id: string; project_name?: string; date: string; weather?: string; team_count?: number; activities: string; materials_received?: string; pending_items?: string; occurrences?: string; notes?: string; photos?: Array<{ id: string; file_path: string; caption?: string }> }
interface Project { id: string; name: string; code?: string }

export default function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filterProject, setFilterProject] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<DiaryEntry | null>(null)
  const [form, setForm] = useState({ project_id: "", date: new Date().toISOString().slice(0, 10), weather: "ensolarado", team_count: "0", activities: "", materials_received: "", pending_items: "", occurrences: "", notes: "" })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page_size: 50 }
      if (filterProject) params.project_id = filterProject
      const [dRes, pRes] = await Promise.all([diaryApi.list(params), projectsApi.list({ page_size: 100 })])
      setEntries(dRes.data.items); setProjects(pRes.data.items)
    } catch { /* empty */ } finally { setLoading(false) }
  }, [filterProject])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async () => {
    try {
      const data = { ...form, team_count: Number(form.team_count) }
      if (editing) { await diaryApi.update(editing.id, data) } else { await diaryApi.create(data) }
      setShowForm(false); setEditing(null); fetchData()
    } catch { /* empty */ }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Excluir este registro?")) { await diaryApi.delete(id); fetchData() }
  }

  const WEATHER_MAP: Record<string, string> = { ensolarado: "Ensolarado", nublado: "Nublado", chuvoso: "Chuvoso", parcialmente_nublado: "Parc. Nublado" }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Diário de Obra</h1>
        <Button onClick={() => { setEditing(null); setForm({ project_id: "", date: new Date().toISOString().slice(0, 10), weather: "ensolarado", team_count: "0", activities: "", materials_received: "", pending_items: "", occurrences: "", notes: "" }); setShowForm(true) }} className="bg-orange-500 hover:bg-orange-600"><Plus className="h-4 w-4 mr-2" /> Novo Registro</Button>
      </div>

      <div className="flex gap-4">
        <div className="w-64">
          <Select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
            <option value="">Todas as obras</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" /></div>
      ) : entries.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500">Nenhum registro de diário</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-orange-500" />
                    <div>
                      <CardTitle className="text-base">{entry.date}</CardTitle>
                      <p className="text-sm text-slate-500">{entry.project_name}</p>
                    </div>
                    <Badge variant="secondary">{WEATHER_MAP[entry.weather || ""] || entry.weather}</Badge>
                    {entry.team_count && <span className="text-xs text-slate-500">{entry.team_count} pessoas</span>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(entry); setForm({ project_id: entry.project_id, date: entry.date, weather: entry.weather || "ensolarado", team_count: entry.team_count?.toString() || "0", activities: entry.activities, materials_received: entry.materials_received || "", pending_items: entry.pending_items || "", occurrences: entry.occurrences || "", notes: entry.notes || "" }); setShowForm(true) }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-3 px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div><span className="font-medium text-slate-600">Atividades:</span><p className="text-slate-800 whitespace-pre-wrap">{entry.activities}</p></div>
                  {entry.pending_items && <div><span className="font-medium text-red-600">Pendências:</span><p className="text-slate-800 whitespace-pre-wrap">{entry.pending_items}</p></div>}
                  {entry.materials_received && <div><span className="font-medium text-slate-600">Materiais Recebidos:</span><p className="text-slate-800 whitespace-pre-wrap">{entry.materials_received}</p></div>}
                  {entry.occurrences && <div><span className="font-medium text-amber-600">Ocorrências:</span><p className="text-slate-800 whitespace-pre-wrap">{entry.occurrences}</p></div>}
                </div>
                {entry.photos && entry.photos.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {entry.photos.map((p) => (
                      <div key={p.id} className="w-20 h-20 bg-slate-100 rounded flex items-center justify-center">
                        <Camera className="h-6 w-6 text-slate-400" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Registro" : "Novo Registro de Diário"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Obra</Label><Select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                <option value="">Selecione...</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select></div>
              <div><Label>Data</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Clima</Label><Select value={form.weather} onChange={(e) => setForm({ ...form, weather: e.target.value })}>
                <option value="ensolarado">Ensolarado</option><option value="nublado">Nublado</option><option value="chuvoso">Chuvoso</option><option value="parcialmente_nublado">Parc. Nublado</option>
              </Select></div>
              <div><Label>Equipe (pessoas)</Label><Input type="number" value={form.team_count} onChange={(e) => setForm({ ...form, team_count: e.target.value })} /></div>
            </div>
            <div><Label>Atividades Executadas</Label><Textarea rows={3} value={form.activities} onChange={(e) => setForm({ ...form, activities: e.target.value })} /></div>
            <div><Label>Materiais Recebidos</Label><Textarea rows={2} value={form.materials_received} onChange={(e) => setForm({ ...form, materials_received: e.target.value })} /></div>
            <div><Label>Pendências</Label><Textarea rows={2} value={form.pending_items} onChange={(e) => setForm({ ...form, pending_items: e.target.value })} /></div>
            <div><Label>Ocorrências</Label><Textarea rows={2} value={form.occurrences} onChange={(e) => setForm({ ...form, occurrences: e.target.value })} /></div>
            <div><Label>Observações</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-orange-500 hover:bg-orange-600">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
