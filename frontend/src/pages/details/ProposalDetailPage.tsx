import { useState, useEffect, useCallback } from "react"
import { useParams } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DetailPageHeader } from "@/components/shared/DetailPageHeader"
import { InfoCard } from "@/components/shared/InfoCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { proposalsApi, budgetApi } from "@/services/api"
import { useToast } from "@/components/ui/toast"
import { formatBRL, formatDateBR } from "@/lib/format"
import { Plus, CheckCircle, FileSignature, Trash2, Save, Pencil, X } from "lucide-react"

// ==================== TYPES ====================

interface Proposal {
  id: string; code?: string; title: string; client_id?: string; client_name?: string
  status: string; description?: string; markup_percent?: number
  total_cost?: number; total_price?: number; created_at?: string; valid_until?: string
  items?: Array<{ id: string; description: string; unit?: string; quantity?: number; unit_cost?: number; total_cost?: number; total_price?: number }>
  versions?: Array<{ id: string; version_number: number; created_at: string }>
}

interface ProposalHeaderData {
  id?: string; proposal_id?: string; address?: string; responsible?: string
  architect?: string; payment_method?: string; deadline?: string; observations?: string
}

interface MaterialItem {
  id: string; description: string; unit?: string; quantity?: number
  unit_cost?: number; total_cost?: number; unit_price?: number; total_price?: number
  category?: string; supplier_name?: string; cost_center?: string; room?: string; stage?: string; notes?: string
}

interface ServiceItem {
  id: string; description: string; unit?: string; quantity?: number
  unit_cost?: number; total_cost?: number; unit_price?: number; total_price?: number
  stage?: string; sub_stage?: string; provider_name?: string; service_type?: string; notes?: string
}

interface AdditiveItem {
  id: string; description: string; unit?: string; quantity?: number
  unit_cost?: number; total_cost?: number; unit_price?: number; total_price?: number
  status?: string; responsible?: string; date?: string; notes?: string
}

interface BudgetSummary {
  total_materials_cost: number; total_materials_price: number
  total_services_cost: number; total_services_price: number
  total_additives_cost: number; total_additives_price: number
  total_direct_cost: number; total_sale_price: number
  tax_value: number; discount_value: number; final_value: number
  down_payment: number; balance_due: number; net_profit: number; margin_percent: number
}

interface CommercialTerms {
  id?: string; proposal_id?: string; payment_method?: string; deadline?: string
  down_payment_percent?: number; down_payment_value?: number; num_installments?: number
  validity_days?: number; scope_included?: string; scope_excluded?: string
  commercial_notes?: string; tax_percent?: number; discount_percent?: number
  discount_value?: number; min_margin_percent?: number
}

// ==================== INLINE EDIT ROW COMPONENT ====================

function InlineEditableRow({
  item,
  columns,
  onSave,
  onDelete,
}: {
  item: Record<string, unknown>
  columns: Array<{ key: string; label: string; type?: "text" | "number" | "currency" }>
  onSave: (id: string, data: Record<string, unknown>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState<Record<string, unknown>>({})

  const startEdit = () => {
    const data: Record<string, unknown> = {}
    columns.forEach((col) => { data[col.key] = item[col.key] ?? "" })
    setFormData(data)
    setEditing(true)
  }

  const handleSave = async () => {
    await onSave(item.id as string, formData)
    setEditing(false)
  }

  const isNumeric = (t?: string) => t === "number" || t === "currency"

  if (editing) {
    return (
      <TableRow className="bg-orange-50">
        {columns.map((col) => (
          <TableCell key={col.key} className="py-1 px-2">
            <Input
              type={isNumeric(col.type) ? "number" : "text"}
              step={isNumeric(col.type) ? "0.01" : undefined}
              value={String(formData[col.key] ?? "")}
              onChange={(e) => setFormData({ ...formData, [col.key]: e.target.value })}
              className="h-8 text-xs"
            />
          </TableCell>
        ))}
        <TableCell className="py-1 px-2">
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSave} title="Salvar">
              <Save className="h-3.5 w-3.5 text-green-600" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(false)} title="Cancelar">
              <X className="h-3.5 w-3.5 text-slate-500" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  const formatCell = (col: { key: string; type?: string }) => {
    const val = item[col.key]
    if (col.type === "currency") return formatBRL(val as number)
    if (col.type === "number") return val != null ? String(val) : "-"
    return String(val ?? "-")
  }

  return (
    <TableRow className="hover:bg-slate-50">
      {columns.map((col) => (
        <TableCell key={col.key} className="text-sm py-2 px-2">
          {formatCell(col)}
        </TableCell>
      ))}
      <TableCell className="py-2 px-2">
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={startEdit} title="Editar">
            <Pencil className="h-3.5 w-3.5 text-blue-500" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(item.id as string)} title="Remover">
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ==================== MAIN COMPONENT ====================

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("resumo")
  const { showToast } = useToast()

  const [header, setHeader] = useState<ProposalHeaderData>({})
  const [materials, setMaterials] = useState<MaterialItem[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [additives, setAdditives] = useState<AdditiveItem[]>([])
  const [summary, setSummary] = useState<BudgetSummary | null>(null)
  const [terms, setTerms] = useState<CommercialTerms>({})

  const [showMaterialForm, setShowMaterialForm] = useState(false)
  const [showServiceForm, setShowServiceForm] = useState(false)
  const [showAdditiveForm, setShowAdditiveForm] = useState(false)
  const [headerEditing, setHeaderEditing] = useState(false)
  const [termsEditing, setTermsEditing] = useState(false)
  const [headerForm, setHeaderForm] = useState<ProposalHeaderData>({})
  const [termsForm, setTermsForm] = useState<CommercialTerms>({})

  const [newMaterial, setNewMaterial] = useState({ description: "", unit: "un", quantity: "1", unit_cost: "0", unit_price: "0", category: "", supplier_name: "" })
  const [newService, setNewService] = useState({ description: "", unit: "un", quantity: "1", unit_cost: "0", unit_price: "0", stage: "", sub_stage: "" })
  const [newAdditive, setNewAdditive] = useState({ description: "", unit: "un", quantity: "1", unit_cost: "0", unit_price: "0", status: "pendente", responsible: "" })

  // ==================== FETCH DATA ====================

  const fetchProposal = useCallback(async () => {
    if (!id) return
    try {
      const res = await proposalsApi.get(id)
      setProposal(res.data)
    } catch {
      showToast("Erro ao carregar proposta", "error")
    }
  }, [id, showToast])

  const fetchBudgetData = useCallback(async () => {
    if (!id) return
    try {
      const [headerRes, matRes, svcRes, addRes, summaryRes, termsRes] = await Promise.all([
        budgetApi.getHeader(id),
        budgetApi.listMaterials(id),
        budgetApi.listServices(id),
        budgetApi.listAdditives(id),
        budgetApi.getSummary(id),
        budgetApi.getCommercialTerms(id),
      ])
      setHeader(headerRes.data)
      setMaterials(matRes.data)
      setServices(svcRes.data)
      setAdditives(addRes.data)
      setSummary(summaryRes.data)
      setTerms(termsRes.data)
    } catch {
      // Budget data may not exist yet
    }
  }, [id])

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      await fetchProposal()
      await fetchBudgetData()
      setLoading(false)
    }
    loadAll()
  }, [fetchProposal, fetchBudgetData])

  // ==================== PROPOSAL ACTIONS ====================

  const handleApprove = async () => {
    if (!id || !confirm("Aprovar esta proposta?")) return
    try {
      await proposalsApi.approve(id)
      showToast("Proposta aprovada!")
      fetchProposal()
    } catch (err) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Erro ao aprovar"
      showToast(msg, "error")
    }
  }

  const handleGenerateContract = async () => {
    if (!id || !confirm("Gerar contrato a partir desta proposta?")) return
    try {
      await proposalsApi.generateContract(id, { payment_conditions: "Conforme proposta", installments_count: terms.num_installments || 4 })
      showToast("Contrato gerado!")
      fetchProposal()
    } catch (err) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Erro ao gerar contrato"
      showToast(msg, "error")
    }
  }

  // ==================== HEADER ACTIONS ====================

  const handleSaveHeader = async () => {
    if (!id) return
    try {
      const res = await budgetApi.updateHeader(id, { ...headerForm })
      setHeader(res.data)
      setHeaderEditing(false)
      showToast("Dados da obra salvos!")
    } catch {
      showToast("Erro ao salvar dados da obra", "error")
    }
  }

  // ==================== MATERIAL ACTIONS ====================

  const handleAddMaterial = async () => {
    if (!id) return
    try {
      await budgetApi.addMaterial(id, {
        description: newMaterial.description, unit: newMaterial.unit,
        quantity: Number(newMaterial.quantity), unit_cost: Number(newMaterial.unit_cost),
        unit_price: Number(newMaterial.unit_price),
        category: newMaterial.category || undefined, supplier_name: newMaterial.supplier_name || undefined,
      })
      setShowMaterialForm(false)
      setNewMaterial({ description: "", unit: "un", quantity: "1", unit_cost: "0", unit_price: "0", category: "", supplier_name: "" })
      showToast("Material adicionado!")
      fetchBudgetData()
    } catch {
      showToast("Erro ao adicionar material", "error")
    }
  }

  const handleUpdateMaterial = async (itemId: string, data: Record<string, unknown>) => {
    if (!id) return
    try {
      await budgetApi.updateMaterial(id, itemId, {
        description: data.description, unit: data.unit,
        quantity: Number(data.quantity), unit_cost: Number(data.unit_cost), unit_price: Number(data.unit_price),
        category: data.category || undefined, supplier_name: data.supplier_name || undefined,
      })
      showToast("Material atualizado!")
      fetchBudgetData()
    } catch { showToast("Erro ao atualizar material", "error") }
  }

  const handleDeleteMaterial = async (itemId: string) => {
    if (!id || !confirm("Remover este material?")) return
    try {
      await budgetApi.deleteMaterial(id, itemId)
      showToast("Material removido")
      fetchBudgetData()
    } catch { showToast("Erro ao remover material", "error") }
  }

  // ==================== SERVICE ACTIONS ====================

  const handleAddService = async () => {
    if (!id) return
    try {
      await budgetApi.addService(id, {
        description: newService.description, unit: newService.unit,
        quantity: Number(newService.quantity), unit_cost: Number(newService.unit_cost),
        unit_price: Number(newService.unit_price),
        stage: newService.stage || undefined, sub_stage: newService.sub_stage || undefined,
      })
      setShowServiceForm(false)
      setNewService({ description: "", unit: "un", quantity: "1", unit_cost: "0", unit_price: "0", stage: "", sub_stage: "" })
      showToast("Servico adicionado!")
      fetchBudgetData()
    } catch { showToast("Erro ao adicionar servico", "error") }
  }

  const handleUpdateService = async (itemId: string, data: Record<string, unknown>) => {
    if (!id) return
    try {
      await budgetApi.updateService(id, itemId, {
        description: data.description, unit: data.unit,
        quantity: Number(data.quantity), unit_cost: Number(data.unit_cost), unit_price: Number(data.unit_price),
        stage: data.stage || undefined, sub_stage: data.sub_stage || undefined,
      })
      showToast("Servico atualizado!")
      fetchBudgetData()
    } catch { showToast("Erro ao atualizar servico", "error") }
  }

  const handleDeleteService = async (itemId: string) => {
    if (!id || !confirm("Remover este servico?")) return
    try {
      await budgetApi.deleteService(id, itemId)
      showToast("Servico removido")
      fetchBudgetData()
    } catch { showToast("Erro ao remover servico", "error") }
  }

  // ==================== ADDITIVE ACTIONS ====================

  const handleAddAdditive = async () => {
    if (!id) return
    try {
      await budgetApi.addAdditive(id, {
        description: newAdditive.description, unit: newAdditive.unit,
        quantity: Number(newAdditive.quantity), unit_cost: Number(newAdditive.unit_cost),
        unit_price: Number(newAdditive.unit_price),
        status: newAdditive.status, responsible: newAdditive.responsible || undefined,
      })
      setShowAdditiveForm(false)
      setNewAdditive({ description: "", unit: "un", quantity: "1", unit_cost: "0", unit_price: "0", status: "pendente", responsible: "" })
      showToast("Aditivo adicionado!")
      fetchBudgetData()
    } catch { showToast("Erro ao adicionar aditivo", "error") }
  }

  const handleUpdateAdditive = async (itemId: string, data: Record<string, unknown>) => {
    if (!id) return
    try {
      await budgetApi.updateAdditive(id, itemId, {
        description: data.description, unit: data.unit,
        quantity: Number(data.quantity), unit_cost: Number(data.unit_cost), unit_price: Number(data.unit_price),
        status: data.status || "pendente", responsible: data.responsible || undefined,
      })
      showToast("Aditivo atualizado!")
      fetchBudgetData()
    } catch { showToast("Erro ao atualizar aditivo", "error") }
  }

  const handleDeleteAdditive = async (itemId: string) => {
    if (!id || !confirm("Remover este aditivo?")) return
    try {
      await budgetApi.deleteAdditive(id, itemId)
      showToast("Aditivo removido")
      fetchBudgetData()
    } catch { showToast("Erro ao remover aditivo", "error") }
  }

  // ==================== COMMERCIAL TERMS ACTIONS ====================

  const handleSaveTerms = async () => {
    if (!id) return
    try {
      const res = await budgetApi.updateCommercialTerms(id, {
        payment_method: termsForm.payment_method,
        deadline: termsForm.deadline,
        down_payment_percent: termsForm.down_payment_percent ? Number(termsForm.down_payment_percent) : null,
        down_payment_value: termsForm.down_payment_value ? Number(termsForm.down_payment_value) : null,
        num_installments: termsForm.num_installments ? Number(termsForm.num_installments) : null,
        validity_days: termsForm.validity_days ? Number(termsForm.validity_days) : null,
        scope_included: termsForm.scope_included,
        scope_excluded: termsForm.scope_excluded,
        commercial_notes: termsForm.commercial_notes,
        tax_percent: termsForm.tax_percent ? Number(termsForm.tax_percent) : null,
        discount_percent: termsForm.discount_percent ? Number(termsForm.discount_percent) : null,
        discount_value: termsForm.discount_value ? Number(termsForm.discount_value) : null,
        min_margin_percent: termsForm.min_margin_percent ? Number(termsForm.min_margin_percent) : null,
      })
      setTerms(res.data)
      setTermsEditing(false)
      showToast("Condicoes comerciais salvas!")
      fetchBudgetData()
    } catch { showToast("Erro ao salvar condicoes comerciais", "error") }
  }

  // ==================== SUBTOTALS ====================

  const materialSubtotalCost = materials.reduce((sum, m) => sum + (Number(m.total_cost) || 0), 0)
  const materialSubtotalPrice = materials.reduce((sum, m) => sum + (Number(m.total_price) || 0), 0)
  const serviceSubtotalCost = services.reduce((sum, s) => sum + (Number(s.total_cost) || 0), 0)
  const serviceSubtotalPrice = services.reduce((sum, s) => sum + (Number(s.total_price) || 0), 0)
  const additiveSubtotalCost = additives.reduce((sum, a) => sum + (Number(a.total_cost) || 0), 0)
  const additiveSubtotalPrice = additives.reduce((sum, a) => sum + (Number(a.total_price) || 0), 0)

  // ==================== RENDER ====================

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-slate-500">Carregando...</p></div>
  if (!proposal) return <div className="flex items-center justify-center py-20"><p className="text-slate-500">Proposta nao encontrada</p></div>

  const materialColumns: Array<{ key: string; label: string; type?: "text" | "number" | "currency" }> = [
    { key: "description", label: "Descricao" },
    { key: "unit", label: "Unid." },
    { key: "quantity", label: "Qtd", type: "number" },
    { key: "unit_cost", label: "Custo Unit.", type: "currency" },
    { key: "unit_price", label: "Preco Unit.", type: "currency" },
    { key: "category", label: "Categoria" },
    { key: "supplier_name", label: "Fornecedor" },
  ]

  const serviceColumns: Array<{ key: string; label: string; type?: "text" | "number" | "currency" }> = [
    { key: "description", label: "Descricao" },
    { key: "unit", label: "Unid." },
    { key: "quantity", label: "Qtd", type: "number" },
    { key: "unit_cost", label: "Custo Unit.", type: "currency" },
    { key: "unit_price", label: "Preco Unit.", type: "currency" },
    { key: "stage", label: "Etapa" },
    { key: "sub_stage", label: "Sub-etapa" },
  ]

  const additiveColumns: Array<{ key: string; label: string; type?: "text" | "number" | "currency" }> = [
    { key: "description", label: "Descricao" },
    { key: "unit", label: "Unid." },
    { key: "quantity", label: "Qtd", type: "number" },
    { key: "unit_cost", label: "Custo Unit.", type: "currency" },
    { key: "unit_price", label: "Preco Unit.", type: "currency" },
    { key: "status", label: "Status" },
    { key: "responsible", label: "Responsavel" },
  ]

  return (
    <div className="space-y-4">
      <DetailPageHeader
        title={proposal.title}
        subtitle={proposal.code ? "Codigo: " + proposal.code : "Orcamento"}
        breadcrumbs={[
          { label: "Propostas", href: "/proposals" },
          { label: proposal.title },
        ]}
        actions={
          <div className="flex gap-2">
            <StatusBadge status={proposal.status} />
            {proposal.status !== "aprovada" && (
              <Button onClick={handleApprove} variant="outline" className="text-green-600 border-green-300 hover:bg-green-50">
                <CheckCircle className="h-4 w-4 mr-2" /> Aprovar
              </Button>
            )}
            {proposal.status === "aprovada" && (
              <Button onClick={handleGenerateContract} variant="outline" className="text-blue-600 border-blue-300 hover:bg-blue-50">
                <FileSignature className="h-4 w-4 mr-2" /> Gerar Contrato
              </Button>
            )}
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="dados-obra">Dados da Obra</TabsTrigger>
          <TabsTrigger value="materiais">Materiais ({materials.length})</TabsTrigger>
          <TabsTrigger value="servicos">Servicos ({services.length})</TabsTrigger>
          <TabsTrigger value="aditivos">Aditivos ({additives.length})</TabsTrigger>
          <TabsTrigger value="custos">Custos e Margem</TabsTrigger>
          <TabsTrigger value="condicoes">Condicoes Comerciais</TabsTrigger>
          <TabsTrigger value="versoes">Versoes</TabsTrigger>
        </TabsList>

        {/* TAB: RESUMO */}
        <TabsContent value="resumo">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <InfoCard label="Cliente" value={proposal.client_name || "-"} />
            <InfoCard label="Custo Total" value={formatBRL(summary?.total_direct_cost ?? proposal.total_cost)} />
            <InfoCard label="Preco Venda" value={formatBRL(summary?.total_sale_price ?? proposal.total_price)} />
            <InfoCard label="Valor Final" value={formatBRL(summary?.final_value ?? proposal.total_price)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <InfoCard label="Materiais" value={formatBRL(summary?.total_materials_price)} />
            <InfoCard label="Servicos" value={formatBRL(summary?.total_services_price)} />
            <InfoCard label="Aditivos" value={formatBRL(summary?.total_additives_price)} />
            <InfoCard label="Margem" value={(Number(summary?.margin_percent) || 0).toFixed(1) + "%"} />
          </div>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-slate-700 mb-3">Descricao</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{proposal.description || "Sem descricao."}</p>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <span className="text-xs text-slate-400">Criada em</span>
                  <p className="text-sm">{formatDateBR(proposal.created_at)}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Validade</span>
                  <p className="text-sm">{proposal.valid_until ? formatDateBR(proposal.valid_until) : "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: DADOS DA OBRA */}
        <TabsContent value="dados-obra">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-700">Dados da Obra</h3>
                {!headerEditing ? (
                  <Button variant="outline" size="sm" onClick={() => { setHeaderForm({ ...header }); setHeaderEditing(true) }}>
                    <Pencil className="h-4 w-4 mr-2" /> Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveHeader} className="bg-orange-500 hover:bg-orange-600">
                      <Save className="h-4 w-4 mr-2" /> Salvar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setHeaderEditing(false)}>Cancelar</Button>
                  </div>
                )}
              </div>
              {headerEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Endereco da Obra</Label><Input value={headerForm.address || ""} onChange={(e) => setHeaderForm({ ...headerForm, address: e.target.value })} /></div>
                  <div><Label>Responsavel</Label><Input value={headerForm.responsible || ""} onChange={(e) => setHeaderForm({ ...headerForm, responsible: e.target.value })} /></div>
                  <div><Label>Arquiteto</Label><Input value={headerForm.architect || ""} onChange={(e) => setHeaderForm({ ...headerForm, architect: e.target.value })} /></div>
                  <div><Label>Forma de Pagamento</Label><Input value={headerForm.payment_method || ""} onChange={(e) => setHeaderForm({ ...headerForm, payment_method: e.target.value })} /></div>
                  <div><Label>Prazo</Label><Input value={headerForm.deadline || ""} onChange={(e) => setHeaderForm({ ...headerForm, deadline: e.target.value })} /></div>
                  <div className="md:col-span-2"><Label>Observacoes</Label><Textarea rows={3} value={headerForm.observations || ""} onChange={(e) => setHeaderForm({ ...headerForm, observations: e.target.value })} /></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><span className="text-xs text-slate-400">Endereco da Obra</span><p className="text-sm">{header.address || "-"}</p></div>
                  <div><span className="text-xs text-slate-400">Responsavel</span><p className="text-sm">{header.responsible || "-"}</p></div>
                  <div><span className="text-xs text-slate-400">Arquiteto</span><p className="text-sm">{header.architect || "-"}</p></div>
                  <div><span className="text-xs text-slate-400">Forma de Pagamento</span><p className="text-sm">{header.payment_method || "-"}</p></div>
                  <div><span className="text-xs text-slate-400">Prazo</span><p className="text-sm">{header.deadline || "-"}</p></div>
                  <div className="md:col-span-2"><span className="text-xs text-slate-400">Observacoes</span><p className="text-sm whitespace-pre-wrap">{header.observations || "-"}</p></div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: MATERIAIS */}
        <TabsContent value="materiais">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-sm text-slate-500">Subtotal Custo: <strong>{formatBRL(materialSubtotalCost)}</strong></span>
              <span className="text-sm text-slate-500 ml-4">Subtotal Venda: <strong className="text-green-600">{formatBRL(materialSubtotalPrice)}</strong></span>
            </div>
            <Button onClick={() => setShowMaterialForm(true)} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" /> Novo Material
            </Button>
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                {materialColumns.map((col) => <TableHead key={col.key} className="text-xs">{col.label}</TableHead>)}
                <TableHead className="w-20 text-xs">Acoes</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {materials.length === 0 ? (
                  <TableRow><TableCell colSpan={materialColumns.length + 1} className="text-center py-8 text-slate-500">Nenhum material. Clique em &quot;Novo Material&quot; para adicionar.</TableCell></TableRow>
                ) : materials.map((item) => (
                  <InlineEditableRow key={item.id} item={item as unknown as Record<string, unknown>} columns={materialColumns} onSave={handleUpdateMaterial} onDelete={handleDeleteMaterial} />
                ))}
                {materials.length > 0 && (
                  <TableRow className="bg-slate-100 font-semibold">
                    <TableCell colSpan={3} className="text-sm">SUBTOTAL</TableCell>
                    <TableCell className="text-sm">{formatBRL(materialSubtotalCost)}</TableCell>
                    <TableCell className="text-sm text-green-600">{formatBRL(materialSubtotalPrice)}</TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* TAB: SERVICOS */}
        <TabsContent value="servicos">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-sm text-slate-500">Subtotal Custo: <strong>{formatBRL(serviceSubtotalCost)}</strong></span>
              <span className="text-sm text-slate-500 ml-4">Subtotal Venda: <strong className="text-green-600">{formatBRL(serviceSubtotalPrice)}</strong></span>
            </div>
            <Button onClick={() => setShowServiceForm(true)} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" /> Novo Servico
            </Button>
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                {serviceColumns.map((col) => <TableHead key={col.key} className="text-xs">{col.label}</TableHead>)}
                <TableHead className="w-20 text-xs">Acoes</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {services.length === 0 ? (
                  <TableRow><TableCell colSpan={serviceColumns.length + 1} className="text-center py-8 text-slate-500">Nenhum servico. Clique em &quot;Novo Servico&quot; para adicionar.</TableCell></TableRow>
                ) : services.map((item) => (
                  <InlineEditableRow key={item.id} item={item as unknown as Record<string, unknown>} columns={serviceColumns} onSave={handleUpdateService} onDelete={handleDeleteService} />
                ))}
                {services.length > 0 && (
                  <TableRow className="bg-slate-100 font-semibold">
                    <TableCell colSpan={3} className="text-sm">SUBTOTAL</TableCell>
                    <TableCell className="text-sm">{formatBRL(serviceSubtotalCost)}</TableCell>
                    <TableCell className="text-sm text-green-600">{formatBRL(serviceSubtotalPrice)}</TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* TAB: ADITIVOS */}
        <TabsContent value="aditivos">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-sm text-slate-500">Subtotal Custo: <strong>{formatBRL(additiveSubtotalCost)}</strong></span>
              <span className="text-sm text-slate-500 ml-4">Subtotal Venda: <strong className="text-green-600">{formatBRL(additiveSubtotalPrice)}</strong></span>
            </div>
            <Button onClick={() => setShowAdditiveForm(true)} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" /> Novo Aditivo
            </Button>
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                {additiveColumns.map((col) => <TableHead key={col.key} className="text-xs">{col.label}</TableHead>)}
                <TableHead className="w-20 text-xs">Acoes</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {additives.length === 0 ? (
                  <TableRow><TableCell colSpan={additiveColumns.length + 1} className="text-center py-8 text-slate-500">Nenhum aditivo. Clique em &quot;Novo Aditivo&quot; para adicionar.</TableCell></TableRow>
                ) : additives.map((item) => (
                  <InlineEditableRow key={item.id} item={item as unknown as Record<string, unknown>} columns={additiveColumns} onSave={handleUpdateAdditive} onDelete={handleDeleteAdditive} />
                ))}
                {additives.length > 0 && (
                  <TableRow className="bg-slate-100 font-semibold">
                    <TableCell colSpan={3} className="text-sm">SUBTOTAL</TableCell>
                    <TableCell className="text-sm">{formatBRL(additiveSubtotalCost)}</TableCell>
                    <TableCell className="text-sm text-green-600">{formatBRL(additiveSubtotalPrice)}</TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* TAB: CUSTOS E MARGEM */}
        <TabsContent value="custos">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-700 mb-4">Resumo de Custos</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Materiais (custo)</span><span className="font-medium">{formatBRL(summary?.total_materials_cost)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Servicos (custo)</span><span className="font-medium">{formatBRL(summary?.total_services_cost)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Aditivos (custo)</span><span className="font-medium">{formatBRL(summary?.total_additives_cost)}</span></div>
                  <hr />
                  <div className="flex justify-between text-sm font-semibold"><span>Custo Direto Total</span><span className="text-red-600">{formatBRL(summary?.total_direct_cost)}</span></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-700 mb-4">Resumo de Venda</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Materiais (venda)</span><span className="font-medium">{formatBRL(summary?.total_materials_price)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Servicos (venda)</span><span className="font-medium">{formatBRL(summary?.total_services_price)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Aditivos (venda)</span><span className="font-medium">{formatBRL(summary?.total_additives_price)}</span></div>
                  <hr />
                  <div className="flex justify-between text-sm font-semibold"><span>Preco de Venda Total</span><span className="text-blue-600">{formatBRL(summary?.total_sale_price)}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-slate-700 mb-4">Resultado Financeiro</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Preco de Venda</span><span>{formatBRL(summary?.total_sale_price)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Imposto</span><span className="text-red-500">- {formatBRL(summary?.tax_value)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Desconto</span><span className="text-red-500">- {formatBRL(summary?.discount_value)}</span></div>
                  <hr />
                  <div className="flex justify-between text-sm font-semibold"><span>Valor Final</span><span className="text-blue-700">{formatBRL(summary?.final_value)}</span></div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Entrada</span><span className="font-medium">{formatBRL(summary?.down_payment)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Saldo a Pagar</span><span className="font-medium">{formatBRL(summary?.balance_due)}</span></div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Lucro Liquido</span><span className={"font-semibold " + ((Number(summary?.net_profit) || 0) >= 0 ? "text-green-600" : "text-red-600")}>{formatBRL(summary?.net_profit)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Margem (%)</span><span className={"font-semibold " + ((Number(summary?.margin_percent) || 0) >= 0 ? "text-green-600" : "text-red-600")}>{(Number(summary?.margin_percent) || 0).toFixed(1)}%</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: CONDICOES COMERCIAIS */}
        <TabsContent value="condicoes">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-700">Condicoes Comerciais</h3>
                {!termsEditing ? (
                  <Button variant="outline" size="sm" onClick={() => { setTermsForm({ ...terms }); setTermsEditing(true) }}>
                    <Pencil className="h-4 w-4 mr-2" /> Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveTerms} className="bg-orange-500 hover:bg-orange-600">
                      <Save className="h-4 w-4 mr-2" /> Salvar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setTermsEditing(false)}>Cancelar</Button>
                  </div>
                )}
              </div>
              {termsEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><Label>Forma de Pagamento</Label><Input value={termsForm.payment_method || ""} onChange={(e) => setTermsForm({ ...termsForm, payment_method: e.target.value })} /></div>
                    <div><Label>Prazo</Label><Input value={termsForm.deadline || ""} onChange={(e) => setTermsForm({ ...termsForm, deadline: e.target.value })} /></div>
                    <div><Label>Validade (dias)</Label><Input type="number" value={termsForm.validity_days ?? ""} onChange={(e) => setTermsForm({ ...termsForm, validity_days: e.target.value ? Number(e.target.value) : undefined })} /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div><Label>Entrada (%)</Label><Input type="number" step="0.01" value={termsForm.down_payment_percent ?? ""} onChange={(e) => setTermsForm({ ...termsForm, down_payment_percent: e.target.value ? Number(e.target.value) : undefined })} /></div>
                    <div><Label>Entrada (R$)</Label><Input type="number" step="0.01" value={termsForm.down_payment_value ?? ""} onChange={(e) => setTermsForm({ ...termsForm, down_payment_value: e.target.value ? Number(e.target.value) : undefined })} /></div>
                    <div><Label>N. Parcelas</Label><Input type="number" value={termsForm.num_installments ?? ""} onChange={(e) => setTermsForm({ ...termsForm, num_installments: e.target.value ? Number(e.target.value) : undefined })} /></div>
                    <div><Label>Imposto (%)</Label><Input type="number" step="0.01" value={termsForm.tax_percent ?? ""} onChange={(e) => setTermsForm({ ...termsForm, tax_percent: e.target.value ? Number(e.target.value) : undefined })} /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><Label>Desconto (%)</Label><Input type="number" step="0.01" value={termsForm.discount_percent ?? ""} onChange={(e) => setTermsForm({ ...termsForm, discount_percent: e.target.value ? Number(e.target.value) : undefined })} /></div>
                    <div><Label>Desconto (R$)</Label><Input type="number" step="0.01" value={termsForm.discount_value ?? ""} onChange={(e) => setTermsForm({ ...termsForm, discount_value: e.target.value ? Number(e.target.value) : undefined })} /></div>
                    <div><Label>Margem Min. (%)</Label><Input type="number" step="0.01" value={termsForm.min_margin_percent ?? ""} onChange={(e) => setTermsForm({ ...termsForm, min_margin_percent: e.target.value ? Number(e.target.value) : undefined })} /></div>
                  </div>
                  <div><Label>Escopo Incluido</Label><Textarea rows={3} value={termsForm.scope_included || ""} onChange={(e) => setTermsForm({ ...termsForm, scope_included: e.target.value })} /></div>
                  <div><Label>Escopo Excluido</Label><Textarea rows={3} value={termsForm.scope_excluded || ""} onChange={(e) => setTermsForm({ ...termsForm, scope_excluded: e.target.value })} /></div>
                  <div><Label>Notas Comerciais</Label><Textarea rows={3} value={termsForm.commercial_notes || ""} onChange={(e) => setTermsForm({ ...termsForm, commercial_notes: e.target.value })} /></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><span className="text-xs text-slate-400">Forma de Pagamento</span><p className="text-sm">{terms.payment_method || "-"}</p></div>
                    <div><span className="text-xs text-slate-400">Prazo</span><p className="text-sm">{terms.deadline || "-"}</p></div>
                    <div><span className="text-xs text-slate-400">Validade</span><p className="text-sm">{terms.validity_days ? terms.validity_days + " dias" : "-"}</p></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div><span className="text-xs text-slate-400">Entrada (%)</span><p className="text-sm">{terms.down_payment_percent ? terms.down_payment_percent + "%" : "-"}</p></div>
                    <div><span className="text-xs text-slate-400">Entrada (R$)</span><p className="text-sm">{terms.down_payment_value ? formatBRL(terms.down_payment_value) : "-"}</p></div>
                    <div><span className="text-xs text-slate-400">N. Parcelas</span><p className="text-sm">{terms.num_installments || "-"}</p></div>
                    <div><span className="text-xs text-slate-400">Imposto</span><p className="text-sm">{terms.tax_percent ? terms.tax_percent + "%" : "-"}</p></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><span className="text-xs text-slate-400">Desconto (%)</span><p className="text-sm">{terms.discount_percent ? terms.discount_percent + "%" : "-"}</p></div>
                    <div><span className="text-xs text-slate-400">Desconto (R$)</span><p className="text-sm">{terms.discount_value ? formatBRL(terms.discount_value) : "-"}</p></div>
                    <div><span className="text-xs text-slate-400">Margem Min.</span><p className="text-sm">{terms.min_margin_percent ? terms.min_margin_percent + "%" : "-"}</p></div>
                  </div>
                  <div><span className="text-xs text-slate-400">Escopo Incluido</span><p className="text-sm whitespace-pre-wrap">{terms.scope_included || "-"}</p></div>
                  <div><span className="text-xs text-slate-400">Escopo Excluido</span><p className="text-sm whitespace-pre-wrap">{terms.scope_excluded || "-"}</p></div>
                  <div><span className="text-xs text-slate-400">Notas Comerciais</span><p className="text-sm whitespace-pre-wrap">{terms.commercial_notes || "-"}</p></div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: VERSOES */}
        <TabsContent value="versoes">
          <Card><CardContent className="pt-6">
            {(!proposal.versions || proposal.versions.length === 0) ? (
              <p className="text-sm text-slate-500 text-center py-4">Nenhuma versao registrada</p>
            ) : (
              <div className="space-y-3">
                {proposal.versions.map((v) => (
                  <div key={v.id} className="flex justify-between items-center p-3 bg-slate-50 rounded">
                    <span className="font-medium">Versao {v.version_number}</span>
                    <span className="text-sm text-slate-500">{formatDateBR(v.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* MODAL: NOVO MATERIAL */}
      <Dialog open={showMaterialForm} onOpenChange={setShowMaterialForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Material</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Descricao *</Label><Input value={newMaterial.description} onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Unidade</Label><Input value={newMaterial.unit} onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })} /></div>
              <div><Label>Quantidade</Label><Input type="number" value={newMaterial.quantity} onChange={(e) => setNewMaterial({ ...newMaterial, quantity: e.target.value })} /></div>
              <div><Label>Custo Unitario</Label><Input type="number" step="0.01" value={newMaterial.unit_cost} onChange={(e) => setNewMaterial({ ...newMaterial, unit_cost: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Preco Unitario</Label><Input type="number" step="0.01" value={newMaterial.unit_price} onChange={(e) => setNewMaterial({ ...newMaterial, unit_price: e.target.value })} /></div>
              <div><Label>Categoria</Label><Input value={newMaterial.category} onChange={(e) => setNewMaterial({ ...newMaterial, category: e.target.value })} /></div>
              <div><Label>Fornecedor</Label><Input value={newMaterial.supplier_name} onChange={(e) => setNewMaterial({ ...newMaterial, supplier_name: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMaterialForm(false)}>Cancelar</Button>
            <Button onClick={handleAddMaterial} className="bg-orange-500 hover:bg-orange-600" disabled={!newMaterial.description}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: NOVO SERVICO */}
      <Dialog open={showServiceForm} onOpenChange={setShowServiceForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Servico</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Descricao *</Label><Input value={newService.description} onChange={(e) => setNewService({ ...newService, description: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Unidade</Label><Input value={newService.unit} onChange={(e) => setNewService({ ...newService, unit: e.target.value })} /></div>
              <div><Label>Quantidade</Label><Input type="number" value={newService.quantity} onChange={(e) => setNewService({ ...newService, quantity: e.target.value })} /></div>
              <div><Label>Custo Unitario</Label><Input type="number" step="0.01" value={newService.unit_cost} onChange={(e) => setNewService({ ...newService, unit_cost: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Preco Unitario</Label><Input type="number" step="0.01" value={newService.unit_price} onChange={(e) => setNewService({ ...newService, unit_price: e.target.value })} /></div>
              <div><Label>Etapa</Label><Input value={newService.stage} onChange={(e) => setNewService({ ...newService, stage: e.target.value })} /></div>
              <div><Label>Sub-etapa</Label><Input value={newService.sub_stage} onChange={(e) => setNewService({ ...newService, sub_stage: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowServiceForm(false)}>Cancelar</Button>
            <Button onClick={handleAddService} className="bg-orange-500 hover:bg-orange-600" disabled={!newService.description}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: NOVO ADITIVO */}
      <Dialog open={showAdditiveForm} onOpenChange={setShowAdditiveForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Aditivo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Descricao *</Label><Input value={newAdditive.description} onChange={(e) => setNewAdditive({ ...newAdditive, description: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Unidade</Label><Input value={newAdditive.unit} onChange={(e) => setNewAdditive({ ...newAdditive, unit: e.target.value })} /></div>
              <div><Label>Quantidade</Label><Input type="number" value={newAdditive.quantity} onChange={(e) => setNewAdditive({ ...newAdditive, quantity: e.target.value })} /></div>
              <div><Label>Custo Unitario</Label><Input type="number" step="0.01" value={newAdditive.unit_cost} onChange={(e) => setNewAdditive({ ...newAdditive, unit_cost: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Preco Unitario</Label><Input type="number" step="0.01" value={newAdditive.unit_price} onChange={(e) => setNewAdditive({ ...newAdditive, unit_price: e.target.value })} /></div>
              <div><Label>Status</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={newAdditive.status} onChange={(e) => setNewAdditive({ ...newAdditive, status: e.target.value })}>
                  <option value="pendente">Pendente</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="rejeitado">Rejeitado</option>
                </select>
              </div>
              <div><Label>Responsavel</Label><Input value={newAdditive.responsible} onChange={(e) => setNewAdditive({ ...newAdditive, responsible: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdditiveForm(false)}>Cancelar</Button>
            <Button onClick={handleAddAdditive} className="bg-orange-500 hover:bg-orange-600" disabled={!newAdditive.description}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
