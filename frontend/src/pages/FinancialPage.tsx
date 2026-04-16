import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { financialApi, projectsApi } from "@/services/api"
import { Plus, DollarSign, TrendingDown, TrendingUp } from "lucide-react"

interface FinancialEntry { id: string; type: string; category: string; description: string; amount: number; due_date?: string; payment_date?: string; status: string; project_id?: string; project_name?: string }
interface OverdueInstallment { id: string; contract_title?: string; client_name?: string; amount: number; due_date: string; days_overdue: number }
interface Summary { total_receivable: number; total_payable: number; total_received: number; total_paid: number; balance: number }
interface Project { id: string; name: string }

export default function FinancialPage() {
  const [tab, setTab] = useState("entries")
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [overdue, setOverdue] = useState<OverdueInstallment[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: "despesa", category: "material", description: "", amount: "", due_date: "", project_id: "" })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page_size: 50 }
      if (filterType) params.type = filterType
      const [eRes, sRes, oRes, pRes] = await Promise.all([
        financialApi.listEntries(params), financialApi.getSummary(), financialApi.listOverdue(), projectsApi.list({ page_size: 100 })
      ])
      setEntries(eRes.data.items); setSummary(sRes.data); setOverdue(oRes.data.items || oRes.data); setProjects(pRes.data.items)
    } catch { /* empty */ } finally { setLoading(false) }
  }, [filterType])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async () => {
    try {
      await financialApi.createEntry({ ...form, amount: Number(form.amount), due_date: form.due_date || undefined, project_id: form.project_id || undefined })
      setShowForm(false); fetchData()
    } catch { /* empty */ }
  }

  const formatBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Financeiro</h1>
        <Button onClick={() => { setForm({ type: "despesa", category: "material", description: "", amount: "", due_date: "", project_id: "" }); setShowForm(true) }} className="bg-orange-500 hover:bg-orange-600"><Plus className="h-4 w-4 mr-2" /> Novo Lançamento</Button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">A Receber</p><p className="text-2xl font-bold text-green-600">{formatBRL(summary.total_receivable)}</p></div><TrendingUp className="h-8 w-8 text-green-400" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">A Pagar</p><p className="text-2xl font-bold text-red-600">{formatBRL(summary.total_payable)}</p></div><TrendingDown className="h-8 w-8 text-red-400" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Recebido</p><p className="text-2xl font-bold">{formatBRL(summary.total_received)}</p></div><DollarSign className="h-8 w-8 text-green-500" /></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Saldo</p><p className={`text-2xl font-bold ${summary.balance >= 0 ? "text-green-600" : "text-red-600"}`}>{formatBRL(summary.balance)}</p></div><DollarSign className="h-8 w-8 text-slate-400" /></div></CardContent></Card>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="entries">Lançamentos</TabsTrigger>
          <TabsTrigger value="overdue">Inadimplência</TabsTrigger>
        </TabsList>

        <TabsContent value="entries">
          <div className="flex gap-4 mb-4">
            <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-48">
              <option value="">Todos os tipos</option>
              <option value="receita">Receitas</option>
              <option value="despesa">Despesas</option>
            </Select>
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Categoria</TableHead><TableHead>Descrição</TableHead><TableHead>Obra</TableHead><TableHead>Valor</TableHead><TableHead>Vencimento</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell></TableRow>
                : entries.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Nenhum lançamento</TableCell></TableRow>
                : entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell><Badge variant={e.type === "receita" ? "success" : "destructive"}>{e.type === "receita" ? "Receita" : "Despesa"}</Badge></TableCell>
                    <TableCell className="text-sm">{e.category}</TableCell>
                    <TableCell className="font-medium">{e.description}</TableCell>
                    <TableCell className="text-sm">{e.project_name || "-"}</TableCell>
                    <TableCell className={`font-semibold ${e.type === "receita" ? "text-green-600" : "text-red-600"}`}>{formatBRL(Number(e.amount))}</TableCell>
                    <TableCell className="text-sm">{e.due_date || "-"}</TableCell>
                    <TableCell><Badge variant={e.status === "pago" || e.status === "recebido" ? "success" : e.status === "atrasado" ? "destructive" : "secondary"}>{e.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="overdue">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Contrato</TableHead><TableHead>Cliente</TableHead><TableHead>Valor</TableHead><TableHead>Vencimento</TableHead><TableHead>Dias em Atraso</TableHead></TableRow></TableHeader>
              <TableBody>
                {overdue.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Nenhuma parcela em atraso</TableCell></TableRow>
                : overdue.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.contract_title}</TableCell>
                    <TableCell>{o.client_name}</TableCell>
                    <TableCell className="font-semibold text-red-600">{formatBRL(Number(o.amount))}</TableCell>
                    <TableCell>{o.due_date}</TableCell>
                    <TableCell><Badge variant="destructive">{o.days_overdue} dias</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Lançamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo</Label><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="despesa">Despesa</option><option value="receita">Receita</option>
              </Select></div>
              <div><Label>Categoria</Label><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="material">Material</option><option value="mao_de_obra">Mão de Obra</option><option value="servico">Serviço</option><option value="equipamento">Equipamento</option><option value="parcela">Parcela</option><option value="outros">Outros</option>
              </Select></div>
            </div>
            <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div><Label>Vencimento</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <div><Label>Obra</Label><Select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
              <option value="">Nenhuma</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select></div>
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
