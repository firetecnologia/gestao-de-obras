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
import { purchasesApi, projectsApi } from "@/services/api"
import { Plus, Search, Pencil, Trash2 } from "lucide-react"

const STATUS_MAP: Record<string, { label: string; variant: "default" | "info" | "success" | "warning" | "destructive" | "secondary" }> = {
  rascunho: { label: "Rascunho", variant: "secondary" },
  solicitada: { label: "Solicitada", variant: "info" },
  em_cotacao: { label: "Em Cotação", variant: "warning" },
  aprovada: { label: "Aprovada", variant: "success" },
  pedido_emitido: { label: "Pedido Emitido", variant: "default" },
  recebida: { label: "Recebida", variant: "success" },
  cancelada: { label: "Cancelada", variant: "destructive" },
}

interface PurchaseRequest { id: string; code?: string; title: string; project_id?: string; project_name?: string; status: string; priority?: string; needed_by?: string; created_at?: string }
interface Project { id: string; name: string; code?: string }

export default function PurchasesPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PurchaseRequest | null>(null)
  const [form, setForm] = useState({ title: "", project_id: "", priority: "media", needed_by: "", notes: "" })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [rRes, pRes] = await Promise.all([purchasesApi.listRequests({ search, page_size: 50 }), projectsApi.list({ page_size: 100 })])
      setRequests(rRes.data.items); setProjects(pRes.data.items)
    } catch { /* empty */ } finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async () => {
    try {
      const data = { ...form, needed_by: form.needed_by || undefined }
      if (editing) { await purchasesApi.updateRequest(editing.id, data) } else { await purchasesApi.createRequest(data) }
      setShowForm(false); setEditing(null); fetchData()
    } catch { /* empty */ }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Excluir esta solicitação?")) { await purchasesApi.deleteRequest(id); fetchData() }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Compras</h1>
        <Button onClick={() => { setEditing(null); setForm({ title: "", project_id: "", priority: "media", needed_by: "", notes: "" }); setShowForm(true) }} className="bg-orange-500 hover:bg-orange-600"><Plus className="h-4 w-4 mr-2" /> Nova Solicitação</Button>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input placeholder="Buscar solicitações..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Título</TableHead><TableHead>Obra</TableHead><TableHead>Prioridade</TableHead><TableHead>Necessário até</TableHead><TableHead>Status</TableHead><TableHead className="w-20">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell></TableRow>
            : requests.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Nenhuma solicitação</TableCell></TableRow>
            : requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-sm">{r.code}</TableCell>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell>{r.project_name || "-"}</TableCell>
                <TableCell><Badge variant={r.priority === "alta" ? "destructive" : r.priority === "urgente" ? "destructive" : "secondary"}>{r.priority || "média"}</Badge></TableCell>
                <TableCell className="text-sm">{r.needed_by || "-"}</TableCell>
                <TableCell><Badge variant={STATUS_MAP[r.status]?.variant || "secondary"}>{STATUS_MAP[r.status]?.label || r.status}</Badge></TableCell>
                <TableCell><div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setForm({ title: r.title, project_id: r.project_id || "", priority: r.priority || "media", needed_by: r.needed_by || "", notes: "" }); setShowForm(true) }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Solicitação" : "Nova Solicitação de Compra"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Obra</Label><Select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                <option value="">Selecione...</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select></div>
              <div><Label>Prioridade</Label><Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option><option value="urgente">Urgente</option>
              </Select></div>
            </div>
            <div><Label>Necessário até</Label><Input type="date" value={form.needed_by} onChange={(e) => setForm({ ...form, needed_by: e.target.value })} /></div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
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
