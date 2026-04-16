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
import { proposalsApi, clientsApi } from "@/services/api"
import { Plus, Search, Pencil, Trash2, CheckCircle, FileSignature } from "lucide-react"

const STATUS_MAP: Record<string, { label: string; variant: "default" | "info" | "success" | "warning" | "destructive" | "secondary" }> = {
  rascunho: { label: "Rascunho", variant: "secondary" },
  em_revisao: { label: "Em Revisão", variant: "info" },
  aprovada_interna: { label: "Aprovada Int.", variant: "info" },
  enviada: { label: "Enviada", variant: "warning" },
  em_negociacao: { label: "Em Negociação", variant: "warning" },
  aprovada: { label: "Aprovada", variant: "success" },
  rejeitada: { label: "Rejeitada", variant: "destructive" },
}

interface Proposal { id: string; code?: string; title: string; client_id?: string; client_name?: string; status: string; total_cost?: number; total_price?: number; created_at?: string }
interface Client { id: string; name: string }

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Proposal | null>(null)
  const [form, setForm] = useState({ title: "", client_id: "", description: "", markup_percent: "30", status: "rascunho" })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, cRes] = await Promise.all([proposalsApi.list({ search, page_size: 50 }), clientsApi.list({ page_size: 100 })])
      setProposals(pRes.data.items); setClients(cRes.data.items)
    } catch { /* empty */ } finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async () => {
    try {
      const data = { ...form, markup_percent: Number(form.markup_percent) }
      if (editing) { await proposalsApi.update(editing.id, data) } else { await proposalsApi.create(data) }
      setShowForm(false); setEditing(null); fetchData()
    } catch { /* empty */ }
  }

  const handleApprove = async (id: string) => {
    if (confirm("Aprovar esta proposta?")) {
      try { await proposalsApi.approve(id); fetchData() } catch { /* empty */ }
    }
  }

  const handleGenerateContract = async (id: string) => {
    if (confirm("Gerar contrato a partir desta proposta?")) {
      try { await proposalsApi.generateContract(id, { payment_conditions: "4 parcelas mensais", installments_count: 4 }); fetchData() } catch { /* empty */ }
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Excluir esta proposta?")) { await proposalsApi.delete(id); fetchData() }
  }

  const formatBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Propostas / Orçamentos</h1>
        <Button onClick={() => { setEditing(null); setForm({ title: "", client_id: "", description: "", markup_percent: "30", status: "rascunho" }); setShowForm(true) }} className="bg-orange-500 hover:bg-orange-600"><Plus className="h-4 w-4 mr-2" /> Nova Proposta</Button>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input placeholder="Buscar propostas..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Título</TableHead><TableHead>Cliente</TableHead><TableHead>Custo</TableHead><TableHead>Preço Venda</TableHead><TableHead>Status</TableHead><TableHead className="w-32">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell></TableRow>
            : proposals.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Nenhuma proposta</TableCell></TableRow>
            : proposals.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-sm">{p.code}</TableCell>
                <TableCell className="font-medium">{p.title}</TableCell>
                <TableCell>{p.client_name || "-"}</TableCell>
                <TableCell className="text-sm">{p.total_cost ? formatBRL(Number(p.total_cost)) : "-"}</TableCell>
                <TableCell className="text-sm font-semibold">{p.total_price ? formatBRL(Number(p.total_price)) : "-"}</TableCell>
                <TableCell><Badge variant={STATUS_MAP[p.status]?.variant || "secondary"}>{STATUS_MAP[p.status]?.label || p.status}</Badge></TableCell>
                <TableCell><div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setForm({ title: p.title, client_id: p.client_id || "", description: "", markup_percent: "30", status: p.status }); setShowForm(true) }}><Pencil className="h-4 w-4" /></Button>
                  {p.status !== "aprovada" && <Button variant="ghost" size="icon" onClick={() => handleApprove(p.id)} title="Aprovar"><CheckCircle className="h-4 w-4 text-green-600" /></Button>}
                  {p.status === "aprovada" && <Button variant="ghost" size="icon" onClick={() => handleGenerateContract(p.id)} title="Gerar Contrato"><FileSignature className="h-4 w-4 text-blue-600" /></Button>}
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Proposta" : "Nova Proposta"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cliente</Label><Select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                <option value="">Selecione...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select></div>
              <div><Label>Markup (%)</Label><Input type="number" value={form.markup_percent} onChange={(e) => setForm({ ...form, markup_percent: e.target.value })} /></div>
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
