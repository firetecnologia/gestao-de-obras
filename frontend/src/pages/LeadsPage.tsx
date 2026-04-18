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
import { leadsApi } from "@/services/api"
import { useToast } from "@/components/ui/toast"
import { useNavigate } from "react-router-dom"
import { Plus, Search, Pencil, Trash2, UserPlus } from "lucide-react"

const STATUS_LABELS: Record<string, string> = {
  novo: "Novo", em_contato: "Em Contato", reuniao_agendada: "Reunião Agendada",
  visita_tecnica: "Visita Técnica", proposta_elaboracao: "Proposta em Elaboração",
  proposta_enviada: "Proposta Enviada", em_negociacao: "Em Negociação",
  fechado_ganho: "Fechado Ganho", fechado_perdido: "Fechado Perdido",
}

const STATUS_COLORS: Record<string, "default" | "info" | "success" | "warning" | "destructive" | "secondary"> = {
  novo: "info", em_contato: "warning", reuniao_agendada: "secondary",
  proposta_enviada: "default", em_negociacao: "warning",
  fechado_ganho: "success", fechado_perdido: "destructive",
}

interface Lead { id: string; name: string; email?: string; phone?: string; company?: string; source?: string; status: string; notes?: string; responsible_id?: string }

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Lead | null>(null)
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", source: "site", status: "novo", notes: "" })
  const { showToast } = useToast()
  const navigate = useNavigate()

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try { const res = await leadsApi.list({ search, page_size: 50 }); setLeads(res.data.items) } catch { showToast("Erro ao carregar leads", "error") } finally { setLoading(false) }
  }, [search, showToast])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const handleSave = async () => {
    try {
      if (editing) { await leadsApi.update(editing.id, form) } else { await leadsApi.create(form) }
      setShowForm(false); setEditing(null); fetchLeads()
      showToast(editing ? "Lead atualizado" : "Lead criado")
    } catch { showToast("Erro ao salvar lead", "error") }
  }

  const handleConvert = async (id: string) => {
    if (confirm("Converter este lead em cliente?")) {
      try { await leadsApi.convert(id); showToast("Lead convertido em cliente!"); fetchLeads() } catch { showToast("Erro ao converter lead", "error") }
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Excluir este lead?")) { try { await leadsApi.delete(id); showToast("Lead excluido"); fetchLeads() } catch { showToast("Erro ao excluir", "error") } }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">CRM / Leads</h1>
        <Button onClick={() => { setEditing(null); setForm({ name: "", email: "", phone: "", company: "", source: "site", status: "novo", notes: "" }); setShowForm(true) }} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" /> Novo Lead
        </Button>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar leads..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : leads.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Nenhum lead encontrado</TableCell></TableRow>
              ) : leads.map((l) => (
                <TableRow key={l.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate("/leads/" + l.id)}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>{l.company || "-"}</TableCell>
                  <TableCell><div className="text-sm">{l.email}</div><div className="text-xs text-slate-500">{l.phone}</div></TableCell>
                  <TableCell>{l.source}</TableCell>
                  <TableCell><Badge variant={STATUS_COLORS[l.status] || "secondary"}>{STATUS_LABELS[l.status] || l.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditing(l); setForm({ name: l.name, email: l.email || "", phone: l.phone || "", company: l.company || "", source: l.source || "", status: l.status, notes: l.notes || "" }); setShowForm(true) }}><Pencil className="h-4 w-4" /></Button>
                      {!["fechado_ganho", "fechado_perdido"].includes(l.status) && <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleConvert(l.id) }} title="Converter em cliente"><UserPlus className="h-4 w-4 text-green-600" /></Button>}
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(l.id) }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Lead" : "Novo Lead"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><Label>Empresa</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Origem</Label><Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                <option value="site">Site</option><option value="indicacao">Indicação</option><option value="instagram">Instagram</option><option value="google">Google</option><option value="whatsapp">WhatsApp</option><option value="outro">Outro</option>
              </Select></div>
              <div><Label>Status</Label><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select></div>
            </div>
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
