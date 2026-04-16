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
import { contractsApi, clientsApi } from "@/services/api"
import { useToast } from "@/components/ui/toast"
import { Plus, Search, Pencil, Trash2, HardHat, Banknote } from "lucide-react"

const STATUS_MAP: Record<string, { label: string; variant: "default" | "info" | "success" | "warning" | "destructive" | "secondary" }> = {
  rascunho: { label: "Rascunho", variant: "secondary" },
  aguardando_assinatura: { label: "Aguardando Assinatura", variant: "warning" },
  ativo: { label: "Ativo", variant: "success" },
  suspenso: { label: "Suspenso", variant: "warning" },
  concluido: { label: "Concluído", variant: "info" },
  cancelado: { label: "Cancelado", variant: "destructive" },
}

interface Contract { id: string; code?: string; title: string; client_id: string; client_name?: string; status: string; total_value?: number; start_date?: string; end_date?: string; installments?: Array<{ id: string; installment_number: number; due_date: string; amount: number; status: string }> }
interface Client { id: string; name: string }

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Contract | null>(null)
  const [form, setForm] = useState({ title: "", client_id: "", scope_summary: "", total_value: "", payment_conditions: "4 parcelas mensais", installments_count: "4", start_date: "", end_date: "" })
  const { showToast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [ctrRes, clRes] = await Promise.all([contractsApi.list({ search, page_size: 50 }), clientsApi.list({ page_size: 100 })])
      setContracts(ctrRes.data.items); setClients(clRes.data.items)
    } catch { showToast("Erro ao carregar contratos", "error") } finally { setLoading(false) }
  }, [search, showToast])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async () => {
    try {
      const data = { ...form, total_value: Number(form.total_value), installments_count: Number(form.installments_count), start_date: form.start_date || undefined, end_date: form.end_date || undefined }
      if (editing) { await contractsApi.update(editing.id, data) } else { await contractsApi.create(data) }
      setShowForm(false); setEditing(null); fetchData()
      showToast(editing ? "Contrato atualizado" : "Contrato criado")
    } catch (err) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Erro ao salvar contrato"
      showToast(msg, "error")
    }
  }

  const handleGenerateProject = async (id: string) => {
    if (confirm("Gerar obra a partir deste contrato?")) {
      try {
        const res = await contractsApi.generateProject(id, { name: "Nova Obra", type: "reforma_residencial" })
        showToast(res.data.message || "Obra gerada com sucesso!")
        fetchData()
      } catch (err) {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Erro ao gerar obra"
        showToast(msg, "error")
      }
    }
  }

  const handleGenerateInstallments = async (id: string) => {
    const numStr = prompt("Quantas parcelas deseja gerar?", "4")
    if (!numStr) return
    const num = parseInt(numStr, 10)
    if (isNaN(num) || num < 1 || num > 60) { showToast("Numero invalido (1-60)", "error"); return }
    try {
      const res = await contractsApi.generateInstallments(id, num)
      showToast(res.data.message || `${num} parcelas geradas!`)
      fetchData()
    } catch (err) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Erro ao gerar parcelas"
      showToast(msg, "error")
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Excluir este contrato?")) {
      try { await contractsApi.delete(id); showToast("Contrato excluido"); fetchData() } catch { showToast("Erro ao excluir", "error") }
    }
  }

  const formatBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Contratos</h1>
        <Button onClick={() => { setEditing(null); setForm({ title: "", client_id: "", scope_summary: "", total_value: "", payment_conditions: "4 parcelas mensais", installments_count: "4", start_date: "", end_date: "" }); setShowForm(true) }} className="bg-orange-500 hover:bg-orange-600"><Plus className="h-4 w-4 mr-2" /> Novo Contrato</Button>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input placeholder="Buscar contratos..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Título</TableHead><TableHead>Cliente</TableHead><TableHead>Valor</TableHead><TableHead>Período</TableHead><TableHead>Status</TableHead><TableHead className="w-28">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell></TableRow>
            : contracts.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Nenhum contrato</TableCell></TableRow>
            : contracts.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-sm">{c.code}</TableCell>
                <TableCell className="font-medium">{c.title}</TableCell>
                <TableCell>{c.client_name || "-"}</TableCell>
                <TableCell className="font-semibold">{c.total_value ? formatBRL(Number(c.total_value)) : "-"}</TableCell>
                <TableCell className="text-xs">{c.start_date && `${c.start_date} → ${c.end_date || "?"}`}</TableCell>
                <TableCell><Badge variant={STATUS_MAP[c.status]?.variant || "secondary"}>{STATUS_MAP[c.status]?.label || c.status}</Badge></TableCell>
                <TableCell><div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setForm({ title: c.title, client_id: c.client_id, scope_summary: "", total_value: c.total_value?.toString() || "", payment_conditions: "", installments_count: "4", start_date: c.start_date || "", end_date: c.end_date || "" }); setShowForm(true) }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleGenerateInstallments(c.id)} title="Gerar Parcelas"><Banknote className="h-4 w-4 text-green-600" /></Button>
                  {(c.status === "ativo" || c.status === "rascunho") && <Button variant="ghost" size="icon" onClick={() => handleGenerateProject(c.id)} title="Gerar Obra"><HardHat className="h-4 w-4 text-orange-600" /></Button>}
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Contrato" : "Novo Contrato"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cliente</Label><Select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                <option value="">Selecione...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select></div>
              <div><Label>Valor Total</Label><Input type="number" value={form.total_value} onChange={(e) => setForm({ ...form, total_value: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Condições de Pagamento</Label><Input value={form.payment_conditions} onChange={(e) => setForm({ ...form, payment_conditions: e.target.value })} /></div>
              <div><Label>Nº Parcelas</Label><Input type="number" value={form.installments_count} onChange={(e) => setForm({ ...form, installments_count: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data Início</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>Data Fim</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div><Label>Escopo</Label><Textarea value={form.scope_summary} onChange={(e) => setForm({ ...form, scope_summary: e.target.value })} /></div>
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
