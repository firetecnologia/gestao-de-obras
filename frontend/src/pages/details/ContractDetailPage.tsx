import { useState, useEffect, useCallback } from "react"
import { useParams } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { DetailPageHeader } from "@/components/shared/DetailPageHeader"
import { InfoCard } from "@/components/shared/InfoCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { contractsApi } from "@/services/api"
import { useToast } from "@/components/ui/toast"
import { formatBRL, formatDateBR } from "@/lib/format"
import { Banknote, HardHat } from "lucide-react"

interface Installment {
  id: string; installment_number: number; due_date: string
  amount: number; status: string; paid_date?: string
}

interface Contract {
  id: string; code?: string; title: string; client_id?: string; client_name?: string
  status: string; total_value?: number; payment_conditions?: string
  scope_summary?: string; start_date?: string; end_date?: string
  created_at?: string; project_id?: string
  installments?: Installment[]
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("resumo")
  const { showToast } = useToast()

  const fetchData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await contractsApi.get(id)
      setContract(res.data)
    } catch {
      showToast("Erro ao carregar contrato", "error")
    } finally { setLoading(false) }
  }, [id, showToast])

  useEffect(() => { fetchData() }, [fetchData])

  const handleGenerateInstallments = async () => {
    if (!id) return
    const numStr = prompt("Quantas parcelas deseja gerar?", "4")
    if (!numStr) return
    const num = parseInt(numStr, 10)
    if (isNaN(num) || num < 1 || num > 60) { showToast("Numero invalido (1-60)", "error"); return }
    try {
      const res = await contractsApi.generateInstallments(id, num)
      showToast(res.data.message || num + " parcelas geradas!")
      fetchData()
    } catch (err) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Erro ao gerar parcelas"
      showToast(msg, "error")
    }
  }

  const handleGenerateProject = async () => {
    if (!id || !confirm("Gerar obra a partir deste contrato?")) return
    try {
      const res = await contractsApi.generateProject(id, { name: "Nova Obra", type: "reforma_residencial" })
      showToast(res.data.message || "Obra gerada!")
      fetchData()
    } catch (err) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Erro ao gerar obra"
      showToast(msg, "error")
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-slate-500">Carregando...</p></div>
  if (!contract) return <div className="flex items-center justify-center py-20"><p className="text-slate-500">Contrato nao encontrado</p></div>

  const paidInstallments = contract.installments?.filter(i => i.status === "pago" || i.status === "recebido") || []
  const totalPaid = paidInstallments.reduce((acc, i) => acc + Number(i.amount || 0), 0)
  const totalInstallments = contract.installments?.reduce((acc, i) => acc + Number(i.amount || 0), 0) || 0

  return (
    <div className="space-y-4">
      <DetailPageHeader
        title={contract.title}
        subtitle={contract.code ? "Codigo: " + contract.code : ""}
        breadcrumbs={[
          { label: "Contratos", href: "/contracts" },
          { label: contract.title },
        ]}
        actions={
          <div className="flex gap-2">
            <StatusBadge status={contract.status} />
            <Button onClick={handleGenerateInstallments} variant="outline" className="text-green-600 border-green-300 hover:bg-green-50">
              <Banknote className="h-4 w-4 mr-2" /> Gerar Parcelas
            </Button>
            {(contract.status === "ativo" || contract.status === "rascunho") && (
              <Button onClick={handleGenerateProject} variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-50">
                <HardHat className="h-4 w-4 mr-2" /> Gerar Obra
              </Button>
            )}
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="parcelas">Parcelas ({contract.installments?.length || 0})</TabsTrigger>
          <TabsTrigger value="historico">Historico</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <InfoCard label="Cliente" value={contract.client_name || "-"} />
            <InfoCard label="Valor Total" value={formatBRL(contract.total_value)} />
            <InfoCard label="Total Pago" value={formatBRL(totalPaid)} />
            <InfoCard label="Periodo" value={contract.start_date ? formatDateBR(contract.start_date) + " - " + formatDateBR(contract.end_date) : "-"} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-700 mb-3">Condicoes de Pagamento</h3>
                <p className="text-sm text-slate-600">{contract.payment_conditions || "Nao definidas."}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-700 mb-3">Escopo</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{contract.scope_summary || "Sem escopo definido."}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="parcelas">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>#</TableHead><TableHead>Vencimento</TableHead><TableHead>Valor</TableHead>
                <TableHead>Data Pgto</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(!contract.installments || contract.installments.length === 0) ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Nenhuma parcela gerada</TableCell></TableRow>
                ) : contract.installments.map((inst) => (
                  <TableRow key={inst.id}>
                    <TableCell className="font-mono">{inst.installment_number}</TableCell>
                    <TableCell>{formatDateBR(inst.due_date)}</TableCell>
                    <TableCell className="font-semibold">{formatBRL(inst.amount)}</TableCell>
                    <TableCell className="text-sm">{formatDateBR(inst.paid_date) || "-"}</TableCell>
                    <TableCell><StatusBadge status={inst.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="historico">
          <Card><CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3 border-l-2 border-green-400 pl-4">
                <div>
                  <p className="text-sm font-medium">Contrato criado</p>
                  <p className="text-xs text-slate-400">{formatDateBR(contract.created_at)}</p>
                </div>
              </div>
              {contract.installments && contract.installments.length > 0 && (
                <div className="flex items-start gap-3 border-l-2 border-blue-400 pl-4">
                  <div>
                    <p className="text-sm font-medium">{contract.installments.length} parcelas geradas</p>
                    <p className="text-xs text-slate-400">Total: {formatBRL(totalInstallments)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
