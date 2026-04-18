import { useState, useEffect, useCallback } from "react"
import { useParams } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DetailPageHeader } from "@/components/shared/DetailPageHeader"
import { InfoCard } from "@/components/shared/InfoCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { proposalsApi } from "@/services/api"
import { useToast } from "@/components/ui/toast"
import { formatBRL, formatDateBR } from "@/lib/format"
import { Plus, CheckCircle, FileSignature, Trash2 } from "lucide-react"

interface ProposalItem {
  id: string; description: string; unit?: string; quantity?: number
  unit_cost?: number; total_cost?: number; total_price?: number
}

interface Proposal {
  id: string; code?: string; title: string; client_id?: string; client_name?: string
  status: string; description?: string; markup_percent?: number
  total_cost?: number; total_price?: number; created_at?: string
  items?: ProposalItem[]
  versions?: Array<{ id: string; version_number: number; created_at: string }>
}

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [showItemForm, setShowItemForm] = useState(false)
  const [itemForm, setItemForm] = useState({ description: "", unit: "un", quantity: "1", unit_cost: "" })
  const { showToast } = useToast()

  const fetchData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await proposalsApi.get(id)
      setProposal(res.data)
    } catch {
      showToast("Erro ao carregar proposta", "error")
    } finally { setLoading(false) }
  }, [id, showToast])

  useEffect(() => { fetchData() }, [fetchData])

  const handleApprove = async () => {
    if (!id || !confirm("Aprovar esta proposta?")) return
    try {
      await proposalsApi.approve(id)
      showToast("Proposta aprovada!")
      fetchData()
    } catch (err) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Erro ao aprovar"
      showToast(msg, "error")
    }
  }

  const handleGenerateContract = async () => {
    if (!id || !confirm("Gerar contrato a partir desta proposta?")) return
    try {
      await proposalsApi.generateContract(id, { payment_conditions: "4 parcelas mensais", installments_count: 4 })
      showToast("Contrato gerado!")
      fetchData()
    } catch (err) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Erro ao gerar contrato"
      showToast(msg, "error")
    }
  }

  const handleAddItem = async () => {
    if (!id) return
    try {
      await proposalsApi.addItem(id, {
        description: itemForm.description,
        unit: itemForm.unit,
        quantity: Number(itemForm.quantity),
        unit_cost: Number(itemForm.unit_cost),
      })
      setShowItemForm(false)
      showToast("Item adicionado!")
      fetchData()
    } catch {
      showToast("Erro ao adicionar item", "error")
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!id || !confirm("Remover este item?")) return
    try {
      await proposalsApi.deleteItem(id, itemId)
      showToast("Item removido")
      fetchData()
    } catch {
      showToast("Erro ao remover item", "error")
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-slate-500">Carregando...</p></div>
  if (!proposal) return <div className="flex items-center justify-center py-20"><p className="text-slate-500">Proposta nao encontrada</p></div>

  return (
    <div className="space-y-4">
      <DetailPageHeader
        title={proposal.title}
        subtitle={proposal.code ? "Codigo: " + proposal.code : ""}
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

      <Tabs defaultValue="resumo">
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="itens">Itens ({proposal.items?.length || 0})</TabsTrigger>
          <TabsTrigger value="versoes">Versoes</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <InfoCard label="Cliente" value={proposal.client_name || "-"} />
            <InfoCard label="Custo Total" value={formatBRL(proposal.total_cost)} />
            <InfoCard label="Preco Venda" value={formatBRL(proposal.total_price)} />
            <InfoCard label="Markup" value={(proposal.markup_percent || 0) + "%"} />
          </div>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-slate-700 mb-3">Descricao</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{proposal.description || "Sem descricao."}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="itens">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setItemForm({ description: "", unit: "un", quantity: "1", unit_cost: "" }); setShowItemForm(true) }} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" /> Novo Item
            </Button>
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Descricao</TableHead><TableHead>Unidade</TableHead><TableHead>Qtd</TableHead>
                <TableHead>Custo Unit.</TableHead><TableHead>Custo Total</TableHead><TableHead>Preco Venda</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(!proposal.items || proposal.items.length === 0) ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Nenhum item</TableCell></TableRow>
                ) : proposal.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell className="text-sm">{item.unit}</TableCell>
                    <TableCell className="text-sm">{item.quantity}</TableCell>
                    <TableCell className="text-sm">{formatBRL(item.unit_cost)}</TableCell>
                    <TableCell className="font-semibold">{formatBRL(item.total_cost)}</TableCell>
                    <TableCell className="font-semibold text-green-600">{formatBRL(item.total_price)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

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

      <Dialog open={showItemForm} onOpenChange={setShowItemForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Descricao</Label><Input value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Unidade</Label><Input value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} /></div>
              <div><Label>Quantidade</Label><Input type="number" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} /></div>
              <div><Label>Custo Unitario</Label><Input type="number" step="0.01" value={itemForm.unit_cost} onChange={(e) => setItemForm({ ...itemForm, unit_cost: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemForm(false)}>Cancelar</Button>
            <Button onClick={handleAddItem} className="bg-orange-500 hover:bg-orange-600">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
