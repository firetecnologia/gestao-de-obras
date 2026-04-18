import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DetailPageHeader } from "@/components/shared/DetailPageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { InfoCard } from "@/components/shared/InfoCard"
import { leadsApi, proposalsApi } from "@/services/api"
import { useToast } from "@/components/ui/toast"
import { formatDateBR } from "@/lib/format"
import { Plus, Phone, Mail, Building2, MessageSquare, Calendar } from "lucide-react"

interface Lead {
  id: string; name: string; email?: string; phone?: string; company?: string
  source?: string; status: string; notes?: string; responsible_id?: string
  responsible_name?: string; client_id?: string; converted_at?: string
  next_followup?: string; created_at?: string; lost_reason?: string
  interactions?: Interaction[]
}

interface Interaction {
  id: string; type: string; description: string; date: string
  user_id?: string; created_at?: string
}

interface Proposal {
  id: string; code?: string; title: string; status: string
  total_price?: number; created_at?: string
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [lead, setLead] = useState<Lead | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [showInteraction, setShowInteraction] = useState(false)
  const [interactionForm, setInteractionForm] = useState({ type: "ligacao", description: "" })
  const [activeTab, setActiveTab] = useState("resumo")
  const { showToast } = useToast()

  useEffect(() => {
    if (!id) return
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await leadsApi.get(id)
        setLead(res.data)
        try {
          const pRes = await proposalsApi.list({ page_size: 50 })
          setProposals(pRes.data.items?.filter((p: Proposal & { lead_id?: string }) => p.lead_id === id) || [])
        } catch { /* proposals may not have lead_id filter */ }
      } catch {
        showToast("Erro ao carregar lead", "error")
      } finally { setLoading(false) }
    }
    fetch()
  }, [id, showToast])

  const handleAddInteraction = async () => {
    if (!id) return
    try {
      await leadsApi.addInteraction(id, interactionForm)
      showToast("Interacao registrada!")
      setShowInteraction(false)
      const res = await leadsApi.get(id)
      setLead(res.data)
    } catch {
      showToast("Erro ao registrar interacao", "error")
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-slate-500">Carregando...</p></div>
  if (!lead) return <div className="flex items-center justify-center py-20"><p className="text-slate-500">Lead nao encontrado</p></div>

  const INTERACTION_TYPES: Record<string, string> = {
    ligacao: "Ligacao", whatsapp: "WhatsApp", email: "E-mail",
    reuniao: "Reuniao", visita: "Visita", outro: "Outro"
  }

  return (
    <div className="space-y-4">
      <DetailPageHeader
        title={lead.name}
        subtitle={lead.company || lead.email || ""}
        breadcrumbs={[
          { label: "CRM / Leads", href: "/leads" },
          { label: lead.name },
        ]}
        actions={
          <div className="flex gap-2">
            <StatusBadge status={lead.status} />
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="interacoes">Interacoes ({lead.interactions?.length || 0})</TabsTrigger>
          <TabsTrigger value="propostas">Propostas</TabsTrigger>
          <TabsTrigger value="historico">Historico</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <InfoCard label="Status" value={<StatusBadge status={lead.status} />} />
            <InfoCard label="Origem" value={lead.source || "-"} />
            <InfoCard label="Responsavel" value={lead.responsible_name || "-"} />
            <InfoCard label="Criado em" value={formatDateBR(lead.created_at)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-semibold text-slate-700 mb-3">Dados de Contato</h3>
                {lead.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-slate-400" />{lead.email}</div>}
                {lead.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-slate-400" />{lead.phone}</div>}
                {lead.company && <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-slate-400" />{lead.company}</div>}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-semibold text-slate-700 mb-3">Observacoes</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{lead.notes || "Nenhuma observacao."}</p>
                {lead.next_followup && (
                  <div className="flex items-center gap-2 text-sm text-orange-600 mt-2">
                    <Calendar className="h-4 w-4" />
                    Proximo follow-up: {formatDateBR(lead.next_followup)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="interacoes">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setInteractionForm({ type: "ligacao", description: "" }); setShowInteraction(true) }} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" /> Nova Interacao
            </Button>
          </div>
          <div className="space-y-3">
            {(!lead.interactions || lead.interactions.length === 0) ? (
              <Card><CardContent className="py-8 text-center text-slate-500">Nenhuma interacao registrada</CardContent></Card>
            ) : lead.interactions.map((i) => (
              <Card key={i.id}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-1"><MessageSquare className="h-4 w-4 text-slate-400" /></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{INTERACTION_TYPES[i.type] || i.type}</Badge>
                          <span className="text-xs text-slate-400">{formatDateBR(i.date)}</span>
                        </div>
                        <p className="text-sm mt-1">{i.description}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="propostas">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Codigo</TableHead><TableHead>Titulo</TableHead>
                <TableHead>Status</TableHead><TableHead>Data</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {proposals.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Nenhuma proposta vinculada</TableCell></TableRow>
                ) : proposals.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-slate-50" onClick={() => window.location.href = "/proposals/" + p.id}>
                    <TableCell className="font-mono text-sm">{p.code}</TableCell>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-sm">{formatDateBR(p.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3 border-l-2 border-green-400 pl-4">
                  <div>
                    <p className="text-sm font-medium">Lead criado</p>
                    <p className="text-xs text-slate-400">{formatDateBR(lead.created_at)}</p>
                  </div>
                </div>
                {lead.converted_at && (
                  <div className="flex items-start gap-3 border-l-2 border-blue-400 pl-4">
                    <div>
                      <p className="text-sm font-medium">Convertido em cliente</p>
                      <p className="text-xs text-slate-400">{formatDateBR(lead.converted_at)}</p>
                    </div>
                  </div>
                )}
                {lead.lost_reason && (
                  <div className="flex items-start gap-3 border-l-2 border-red-400 pl-4">
                    <div>
                      <p className="text-sm font-medium">Lead perdido</p>
                      <p className="text-xs text-slate-500">{lead.lost_reason}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showInteraction} onOpenChange={setShowInteraction}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Interacao</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tipo</Label><Select value={interactionForm.type} onChange={(e) => setInteractionForm({ ...interactionForm, type: e.target.value })}>
              {Object.entries(INTERACTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select></div>
            <div><Label>Descricao</Label><Textarea value={interactionForm.description} onChange={(e) => setInteractionForm({ ...interactionForm, description: e.target.value })} rows={4} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInteraction(false)}>Cancelar</Button>
            <Button onClick={handleAddInteraction} className="bg-orange-500 hover:bg-orange-600">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
