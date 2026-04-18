import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { DetailPageHeader } from "@/components/shared/DetailPageHeader"
import { InfoCard } from "@/components/shared/InfoCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { suppliersApi, purchasesApi } from "@/services/api"
import { useToast } from "@/components/ui/toast"
import { formatBRL, formatDateBR } from "@/lib/format"
import { Mail, Phone, Building2, MapPin } from "lucide-react"

interface Supplier {
  id: string; name: string; company_name?: string; cpf_cnpj?: string
  email?: string; phone?: string; category?: string
  address_city?: string; address_state?: string
  notes?: string; created_at?: string
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    if (!id) return
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await suppliersApi.get(id)
        setSupplier(res.data)
        try {
          const oRes = await purchasesApi.listOrders({ supplier_id: id, page_size: 50 })
          setOrders(oRes.data.items || [])
        } catch { /* ok */ }
      } catch {
        showToast("Erro ao carregar fornecedor", "error")
      } finally { setLoading(false) }
    }
    fetch()
  }, [id, showToast])

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-slate-500">Carregando...</p></div>
  if (!supplier) return <div className="flex items-center justify-center py-20"><p className="text-slate-500">Fornecedor nao encontrado</p></div>

  return (
    <div className="space-y-4">
      <DetailPageHeader
        title={supplier.name}
        subtitle={supplier.category || supplier.company_name || ""}
        breadcrumbs={[
          { label: "Fornecedores", href: "/suppliers" },
          { label: supplier.name },
        ]}
      />

      <Tabs defaultValue="resumo">
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="compras">Compras ({orders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="resumo">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <InfoCard label="Categoria" value={supplier.category || "-"} />
            <InfoCard label="CPF/CNPJ" value={supplier.cpf_cnpj || "-"} />
            <InfoCard label="Pedidos" value={String(orders.length)} />
            <InfoCard label="Criado em" value={formatDateBR(supplier.created_at)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-semibold text-slate-700 mb-3">Contato</h3>
                {supplier.email && <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-slate-400" />{supplier.email}</div>}
                {supplier.phone && <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-slate-400" />{supplier.phone}</div>}
                {supplier.company_name && <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-slate-400" />{supplier.company_name}</div>}
                {supplier.address_city && <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-slate-400" />{supplier.address_city}{supplier.address_state ? "/" + supplier.address_state : ""}</div>}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-slate-700 mb-3">Observacoes</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{supplier.notes || "Nenhuma observacao."}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compras">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Pedido</TableHead><TableHead>Descricao</TableHead><TableHead>Valor</TableHead>
                <TableHead>Data</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Nenhum pedido</TableCell></TableRow>
                ) : orders.map((o) => (
                  <TableRow key={String(o.id)}>
                    <TableCell className="font-mono text-sm">{String(o.code || o.id || "").slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{String(o.description || "")}</TableCell>
                    <TableCell className="font-semibold">{formatBRL(o.total_value)}</TableCell>
                    <TableCell className="text-sm">{formatDateBR(o.created_at as string)}</TableCell>
                    <TableCell><StatusBadge status={String(o.status || "pendente")} /></TableCell>
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
