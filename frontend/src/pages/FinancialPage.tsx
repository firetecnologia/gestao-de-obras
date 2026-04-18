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
import { useToast } from "@/components/ui/toast"
import { formatBRL, formatDateBR, toNumber } from "@/lib/format"
import { Plus, DollarSign, AlertTriangle, Filter, ArrowUpRight, ArrowDownRight } from "lucide-react"

interface FinancialEntry {
  id: string; type: string; category?: string; description: string
  planned_amount?: number | string | null; actual_amount?: number | string | null
  due_date?: string; paid_date?: string; status: string
  project_id?: string; project_name?: string
  supplier_id?: string; supplier_name?: string
}
interface OverdueInstallment {
  id: string; contract_code?: string; client_name?: string
  installment_number?: number; amount: number | string
  due_date: string; days_overdue: number
}
interface Summary {
  revenue_planned: number; revenue_received: number
  expenses_planned: number; expenses_paid: number
  overdue_count: number; overdue_amount: number
  balance_planned: number; balance_actual: number
}
interface Project { id: string; name: string }

const STATUS_MAP: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "secondary" | "info" }> = {
  pendente: { label: "Pendente", variant: "warning" },
  pago: { label: "Pago", variant: "success" },
  recebido: { label: "Recebido", variant: "success" },
  atrasado: { label: "Atrasado", variant: "destructive" },
  cancelado: { label: "Cancelado", variant: "secondary" },
  parcial: { label: "Parcial", variant: "info" },
}

export default function FinancialPage() {
  const [tab, setTab] = useState("overview")
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [overdue, setOverdue] = useState<OverdueInstallment[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterProject, setFilterProject] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: "despesa", category: "material", description: "", planned_amount: "", due_date: "", project_id: "" })
  const { showToast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [eRes, sRes, oRes, pRes] = await Promise.all([
        financialApi.listEntries({ page_size: 100 }), financialApi.getSummary(), financialApi.listOverdue(), projectsApi.list({ page_size: 100 })
      ])
      setEntries(eRes.data.items)
      setSummary(sRes.data)
      setOverdue(Array.isArray(oRes.data) ? oRes.data : oRes.data.items || [])
      setProjects(pRes.data.items)
    } catch {
      showToast("Erro ao carregar dados financeiros", "error")
    } finally { setLoading(false) }
  }, [showToast])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async () => {
    try {
      await financialApi.createEntry({
        ...form,
        planned_amount: Number(form.planned_amount),
        due_date: form.due_date || undefined,
        project_id: form.project_id || undefined,
      })
      setShowForm(false)
      showToast("Lançamento criado com sucesso")
      fetchData()
    } catch {
      showToast("Erro ao criar lançamento", "error")
    }
  }

  const getEntryAmount = (e: FinancialEntry): number => toNumber(e.actual_amount) || toNumber(e.planned_amount)

  const receivables = entries.filter(e => e.type === "receita" && e.status !== "recebido" && e.status !== "pago")
  const payables = entries.filter(e => e.type === "despesa" && e.status !== "pago" && e.status !== "recebido")
  const filteredEntries = entries.filter(e => {
    if (filterType && e.type !== filterType) return false
    if (filterStatus && e.status !== filterStatus) return false
    if (filterProject && e.project_id !== filterProject) return false
    return true
  })

  const balanceColor = summary && toNumber(summary.balance_planned) >= 0 ? "text-green-600" : "text-red-600"
  const overdueCardBorder = summary && toNumber(summary.overdue_count) > 0 ? "border-l-red-500" : "border-l-green-500"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Financeiro</h1>
        <Button onClick={() => { setForm({ type: "despesa", category: "material", description: "", planned_amount: "", due_date: "", project_id: "" }); setShowForm(true) }} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" /> Novo Lançamento
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">A Receber (Previsto)</p>
                  <p className="text-2xl font-bold text-green-600">{formatBRL(summary.revenue_planned)}</p>
                  <p className="text-xs text-slate-400 mt-1">Recebido: {formatBRL(summary.revenue_received)}</p>
                </div>
                <ArrowUpRight className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">A Pagar (Previsto)</p>
                  <p className="text-2xl font-bold text-red-600">{formatBRL(summary.expenses_planned)}</p>
                  <p className="text-xs text-slate-400 mt-1">Pago: {formatBRL(summary.expenses_paid)}</p>
                </div>
                <ArrowDownRight className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Saldo Previsto</p>
                  <p className={"text-2xl font-bold " + balanceColor}>{formatBRL(summary.balance_planned)}</p>
                  <p className="text-xs text-slate-400 mt-1">Realizado: {formatBRL(summary.balance_actual)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
          <Card className={"border-l-4 " + overdueCardBorder}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Inadimplência</p>
                  <p className="text-2xl font-bold text-red-600">{formatBRL(summary.overdue_amount)}</p>
                  <p className="text-xs text-slate-400 mt-1">{toNumber(summary.overdue_count)} lançamentos atrasados</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="receivables">A Receber</TabsTrigger>
          <TabsTrigger value="payables">A Pagar</TabsTrigger>
          <TabsTrigger value="overdue">Inadimplência</TabsTrigger>
          <TabsTrigger value="entries">Lançamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">Resumo por Status</h3>
                <div className="space-y-3">
                  {summary && (<>
                    <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <span className="text-sm font-medium text-green-700">Receitas Previstas</span>
                      <span className="font-bold text-green-600">{formatBRL(summary.revenue_planned)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <span className="text-sm font-medium text-green-700">Receitas Recebidas</span>
                      <span className="font-bold text-green-600">{formatBRL(summary.revenue_received)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                      <span className="text-sm font-medium text-red-700">Despesas Previstas</span>
                      <span className="font-bold text-red-600">{formatBRL(summary.expenses_planned)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                      <span className="text-sm font-medium text-red-700">Despesas Pagas</span>
                      <span className="font-bold text-red-600">{formatBRL(summary.expenses_paid)}</span>
                    </div>
                  </>)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">Últimos Lançamentos</h3>
                <div className="space-y-2">
                  {entries.slice(0, 8).map((e) => (
                    <div key={e.id} className="flex justify-between items-center p-2 rounded hover:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Badge variant={e.type === "receita" ? "success" : "destructive"} className="text-[10px]">
                          {e.type === "receita" ? "R" : "D"}
                        </Badge>
                        <span className="text-sm truncate max-w-[200px]">{e.description}</span>
                      </div>
                      <span className={"text-sm font-semibold " + (e.type === "receita" ? "text-green-600" : "text-red-600")}>
                        {formatBRL(getEntryAmount(e))}
                      </span>
                    </div>
                  ))}
                  {entries.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Nenhum lançamento encontrado</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="receivables">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead>Obra</TableHead>
                <TableHead>Valor Previsto</TableHead><TableHead>Valor Recebido</TableHead>
                <TableHead>Vencimento</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {receivables.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Nenhuma receita pendente</TableCell></TableRow>
                ) : receivables.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.description}</TableCell>
                    <TableCell className="text-sm">{e.category || "-"}</TableCell>
                    <TableCell className="text-sm">{e.project_name || "-"}</TableCell>
                    <TableCell className="text-green-600 font-semibold">{formatBRL(e.planned_amount)}</TableCell>
                    <TableCell className="text-green-600">{formatBRL(e.actual_amount)}</TableCell>
                    <TableCell className="text-sm">{formatDateBR(e.due_date)}</TableCell>
                    <TableCell><Badge variant={STATUS_MAP[e.status]?.variant || "secondary"}>{STATUS_MAP[e.status]?.label || e.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payables">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead>Fornecedor</TableHead>
                <TableHead>Obra</TableHead><TableHead>Valor Previsto</TableHead>
                <TableHead>Vencimento</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {payables.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Nenhuma despesa pendente</TableCell></TableRow>
                ) : payables.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.description}</TableCell>
                    <TableCell className="text-sm">{e.category || "-"}</TableCell>
                    <TableCell className="text-sm">{e.supplier_name || "-"}</TableCell>
                    <TableCell className="text-sm">{e.project_name || "-"}</TableCell>
                    <TableCell className="text-red-600 font-semibold">{formatBRL(e.planned_amount)}</TableCell>
                    <TableCell className="text-sm">{formatDateBR(e.due_date)}</TableCell>
                    <TableCell><Badge variant={STATUS_MAP[e.status]?.variant || "secondary"}>{STATUS_MAP[e.status]?.label || e.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="overdue">
          <Card><CardContent className="p-0">
            <div className="p-4 border-b bg-red-50">
              <h3 className="font-semibold text-red-700">Parcelas de Contratos em Atraso</h3>
            </div>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Contrato</TableHead><TableHead>Cliente</TableHead><TableHead>Parcela</TableHead>
                <TableHead>Valor</TableHead><TableHead>Vencimento</TableHead><TableHead>Dias em Atraso</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {overdue.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Nenhuma parcela em atraso</TableCell></TableRow>
                ) : overdue.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.contract_code || "-"}</TableCell>
                    <TableCell>{o.client_name || "-"}</TableCell>
                    <TableCell className="text-sm">#{o.installment_number}</TableCell>
                    <TableCell className="font-semibold text-red-600">{formatBRL(o.amount)}</TableCell>
                    <TableCell>{formatDateBR(o.due_date)}</TableCell>
                    <TableCell><Badge variant="destructive">{o.days_overdue} dias</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="entries">
          <div className="flex gap-3 mb-4 items-center">
            <Filter className="h-4 w-4 text-slate-400" />
            <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-40">
              <option value="">Todos os tipos</option>
              <option value="receita">Receitas</option>
              <option value="despesa">Despesas</option>
            </Select>
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-40">
              <option value="">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="recebido">Recebido</option>
              <option value="atrasado">Atrasado</option>
            </Select>
            <Select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="w-48">
              <option value="">Todas as obras</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Tipo</TableHead><TableHead>Categoria</TableHead><TableHead>Descrição</TableHead>
                <TableHead>Obra</TableHead><TableHead>Valor Previsto</TableHead><TableHead>Valor Real</TableHead>
                <TableHead>Vencimento</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={8} className="text-center py-8">Carregando...</TableCell></TableRow>
                : filteredEntries.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">Nenhum lançamento</TableCell></TableRow>
                : filteredEntries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell><Badge variant={e.type === "receita" ? "success" : "destructive"}>{e.type === "receita" ? "Receita" : "Despesa"}</Badge></TableCell>
                    <TableCell className="text-sm">{e.category || "-"}</TableCell>
                    <TableCell className="font-medium">{e.description}</TableCell>
                    <TableCell className="text-sm">{e.project_name || "-"}</TableCell>
                    <TableCell className={"font-semibold " + (e.type === "receita" ? "text-green-600" : "text-red-600")}>{formatBRL(e.planned_amount)}</TableCell>
                    <TableCell className={"text-sm " + (e.type === "receita" ? "text-green-600" : "text-red-600")}>{formatBRL(e.actual_amount)}</TableCell>
                    <TableCell className="text-sm">{formatDateBR(e.due_date)}</TableCell>
                    <TableCell><Badge variant={STATUS_MAP[e.status]?.variant || "secondary"}>{STATUS_MAP[e.status]?.label || e.status}</Badge></TableCell>
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
              <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={form.planned_amount} onChange={(e) => setForm({ ...form, planned_amount: e.target.value })} /></div>
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
