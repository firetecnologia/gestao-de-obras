import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { DetailPageHeader } from "@/components/shared/DetailPageHeader"
import { InfoCard } from "@/components/shared/InfoCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { clientsApi, proposalsApi, contractsApi, projectsApi } from "@/services/api"
import { useToast } from "@/components/ui/toast"
import { formatBRL, formatDateBR } from "@/lib/format"
import { Mail, Phone, Building2, MapPin } from "lucide-react"

interface Client {
  id: string; person_type: string; name: string; company_name?: string
  cpf_cnpj?: string; email?: string; phone?: string
  address_street?: string; address_city?: string; address_state?: string
  notes?: string; created_at?: string
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [proposals, setProposals] = useState<Array<Record<string, unknown>>>([])
  const [contracts, setContracts] = useState<Array<Record<string, unknown>>>([])
  const [projects, setProjects] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    if (!id) return
    const fetch = async () => {
      setLoading(true)
      try {
        const [cRes, pRes, ctRes, prRes] = await Promise.all([
          clientsApi.get(id),
          proposalsApi.list({ page_size: 100 }),
          contractsApi.list({ page_size: 100 }),
          projectsApi.list({ page_size: 100 }),
        ])
        setClient(cRes.data)
        setProposals(pRes.data.items?.filter((p: Record<string, unknown>) => p.client_id === id) || [])
        setContracts(ctRes.data.items?.filter((c: Record<string, unknown>) => c.client_id === id) || [])
        setProjects(prRes.data.items?.filter((p: Record<string, unknown>) => p.client_id === id) || [])
      } catch {
        showToast("Erro ao carregar cliente", "error")
      } finally { setLoading(false) }
    }
    fetch()
  }, [id, showToast])

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-slate-500">Carregando...</p></div>
  if (!client) return <div className="flex items-center justify-center py-20"><p className="text-slate-500">Cliente nao encontrado</p></div>

  return (
    <div className="space-y-4">
      <DetailPageHeader
        title={client.name}
        subtitle={client.company_name || client.email || ""}
        breadcrumbs={[
          { label: "Clientes", href: "/clients" },
          { label: client.name },
        ]}
        actions={
          <Badge variant={client.person_type === "fisica" ? "info" : "secondary"}>
            {client.person_type === "fisica" ? "Pessoa Fisica" : "Pessoa Juridica"}
          </Badge>
        }
      />

      <Tabs defaultValue="resumo">
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="obras">Obras ({projects.length})</TabsTrigger>
          <TabsTrigger value="propostas">Propostas ({proposals.length})</TabsTrigger>
          <TabsTrigger value="contratos">Contratos ({contracts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <InfoCard label="Tipo" value={client.person_type === "fisica" ? "Pessoa Fisica" : "Pessoa Juridica"} />
            <InfoCard label="CPF/CNPJ" value={client.cpf_cnpj || "-"} />
            <InfoCard label="Obras" value={String(projects.length)} />
            <InfoCard label="Criado em" value={formatDateBR(client.created_at)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-semibold text-slate-700 mb-3">Contato</h3>
                {client.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-slate-400" />{client.email}</div>}
                {client.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-slate-400" />{client.phone}</div>}
                {client.company_name && <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-slate-400" />{client.company_name}</div>}
                {client.address_city && <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-slate-400" />{client.address_city}{client.address_state ? "/" + client.address_state : ""}</div>}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-700 mb-3">Observacoes</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{client.notes || "Nenhuma observacao."}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="obras">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Codigo</TableHead><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Nenhuma obra vinculada</TableCell></TableRow>
                ) : projects.map((p) => (
                  <TableRow key={String(p.id)} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate("/projects/" + p.id)}>
                    <TableCell className="font-mono text-sm">{String(p.code || "")}</TableCell>
                    <TableCell className="font-medium">{String(p.name || "")}</TableCell>
                    <TableCell className="text-sm">{String(p.type || "")}</TableCell>
                    <TableCell><StatusBadge status={String(p.status || "")} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="propostas">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Codigo</TableHead><TableHead>Titulo</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {proposals.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Nenhuma proposta</TableCell></TableRow>
                ) : proposals.map((p) => (
                  <TableRow key={String(p.id)} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate("/proposals/" + p.id)}>
                    <TableCell className="font-mono text-sm">{String(p.code || "")}</TableCell>
                    <TableCell className="font-medium">{String(p.title || "")}</TableCell>
                    <TableCell className="font-semibold">{formatBRL(p.total_price)}</TableCell>
                    <TableCell><StatusBadge status={String(p.status || "")} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="contratos">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Codigo</TableHead><TableHead>Titulo</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {contracts.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Nenhum contrato</TableCell></TableRow>
                ) : contracts.map((c) => (
                  <TableRow key={String(c.id)} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate("/contracts/" + c.id)}>
                    <TableCell className="font-mono text-sm">{String(c.code || "")}</TableCell>
                    <TableCell className="font-medium">{String(c.title || "")}</TableCell>
                    <TableCell className="font-semibold">{formatBRL(c.total_value)}</TableCell>
                    <TableCell><StatusBadge status={String(c.status || "")} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
