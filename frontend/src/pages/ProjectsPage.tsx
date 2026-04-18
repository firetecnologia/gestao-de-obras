import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { projectsApi, clientsApi } from "@/services/api"
import { useToast } from "@/components/ui/toast"
import { useNavigate } from "react-router-dom"
import { formatBRL } from "@/lib/format"
import { Plus, Search, Pencil, Trash2 } from "lucide-react"

const STATUS_MAP: Record<string, { label: string; variant: "default" | "info" | "success" | "warning" | "destructive" | "secondary" }> = {
  rascunho: { label: "Rascunho", variant: "secondary" },
  planejamento: { label: "Planejamento", variant: "info" },
  em_andamento: { label: "Em Andamento", variant: "warning" },
  pausada: { label: "Pausada", variant: "secondary" },
  concluida: { label: "Concluída", variant: "success" },
  cancelada: { label: "Cancelada", variant: "destructive" },
  encerrada: { label: "Encerrada", variant: "default" },
}

const TYPE_LABELS: Record<string, string> = {
  reforma_residencial: "Reforma Residencial", reforma_comercial: "Reforma Comercial",
  construcao: "Construção", gestao: "Gestão de Obra",
  planejamento: "Planejamento", compatibilizacao: "Compatibilização",
}

interface Project { id: string; name: string; code?: string; client_id: string; client_name?: string; type: string; status: string; planned_start?: string; planned_end?: string; area_m2?: number; estimated_value?: number }
interface Client { id: string; name: string }

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [form, setForm] = useState({ name: "", client_id: "", type: "reforma_residencial", status: "rascunho", description: "", address_street: "", address_city: "", address_state: "", area_m2: "", planned_start: "", planned_end: "" })
  const { showToast } = useToast()
  const navigate = useNavigate()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, cRes] = await Promise.all([projectsApi.list({ search, page_size: 50 }), clientsApi.list({ page_size: 100 })])
      setProjects(pRes.data.items); setClients(cRes.data.items)
    } catch { showToast("Erro ao carregar obras", "error") } finally { setLoading(false) }
  }, [search, showToast])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async () => {
    try {
      const data = { ...form, area_m2: form.area_m2 ? Number(form.area_m2) : undefined, planned_start: form.planned_start || undefined, planned_end: form.planned_end || undefined }
      if (editing) { await projectsApi.update(editing.id, data) } else { await projectsApi.create(data) }
      setShowForm(false); setEditing(null); showToast(editing ? "Obra atualizada" : "Obra criada"); fetchData()
    } catch { showToast("Erro ao salvar obra", "error") }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Excluir esta obra?")) { try { await projectsApi.delete(id); showToast("Obra excluida"); fetchData() } catch { showToast("Erro ao excluir", "error") } }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Obras / Projetos</h1>
        <Button onClick={() => { setEditing(null); setForm({ name: "", client_id: "", type: "reforma_residencial", status: "rascunho", description: "", address_street: "", address_city: "", address_state: "", area_m2: "", planned_start: "", planned_end: "" }); setShowForm(true) }} className="bg-orange-500 hover:bg-orange-600"><Plus className="h-4 w-4 mr-2" /> Nova Obra</Button>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input placeholder="Buscar obras..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>Cliente</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead>Período</TableHead><TableHead>Valor</TableHead><TableHead className="w-20">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={8} className="text-center py-8">Carregando...</TableCell></TableRow>
            : projects.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">Nenhuma obra</TableCell></TableRow>
            : projects.map((p) => (
              <TableRow key={p.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate("/projects/" + p.id)}>
                <TableCell className="font-mono text-sm">{p.code}</TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.client_name || "-"}</TableCell>
                <TableCell className="text-sm">{TYPE_LABELS[p.type] || p.type}</TableCell>
                <TableCell><Badge variant={STATUS_MAP[p.status]?.variant || "secondary"}>{STATUS_MAP[p.status]?.label || p.status}</Badge></TableCell>
                <TableCell className="text-xs">{p.planned_start && `${p.planned_start} → ${p.planned_end || "?"}`}</TableCell>
                <TableCell className="text-sm">{p.estimated_value ? formatBRL(p.estimated_value) : "-"}</TableCell>
                <TableCell><div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setForm({ name: p.name, client_id: p.client_id, type: p.type, status: p.status, description: "", address_street: "", address_city: "", address_state: "", area_m2: p.area_m2?.toString() || "", planned_start: p.planned_start || "", planned_end: p.planned_end || "" }); setShowForm(true) }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Obra" : "Nova Obra"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome da Obra</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cliente</Label><Select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                <option value="">Selecione...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select></div>
              <div><Label>Tipo</Label><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Status</Label><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select></div>
              <div><Label>Área (m²)</Label><Input type="number" value={form.area_m2} onChange={(e) => setForm({ ...form, area_m2: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Início Previsto</Label><Input type="date" value={form.planned_start} onChange={(e) => setForm({ ...form, planned_start: e.target.value })} /></div>
              <div><Label>Fim Previsto</Label><Input type="date" value={form.planned_end} onChange={(e) => setForm({ ...form, planned_end: e.target.value })} /></div>
            </div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
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
