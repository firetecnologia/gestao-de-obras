import { useState } from "react"
import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { suppliersApi } from "@/services/api"
import { formatDateBR } from "@/lib/format"
import { DetailPageHeader } from "@/components/shared/DetailPageHeader"

type Tab = "resumo" | "bancario" | "endereco" | "compras"

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [tab, setTab] = useState<Tab>("resumo")

  const { data } = useQuery({ queryKey: ["supplier", id], queryFn: () => suppliersApi.get(id!) })
  const supplier = data?.data

  if (!supplier) return <div className="p-6">Carregando...</div>

  const tabs: { key: Tab; label: string }[] = [
    { key: "resumo", label: "Resumo" },
    { key: "bancario", label: "Dados Bancários" },
    { key: "endereco", label: "Endereço" },
    { key: "compras", label: "Compras" },
  ]

  return (
    <div className="p-6">
      <DetailPageHeader title={supplier.name} backTo="/suppliers" backLabel="Fornecedores" />
      <div className="flex gap-2 mb-6 border-b">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 font-medium border-b-2 ${tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "resumo" && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold">Dados Gerais</h3>
            <p><span className="text-gray-500">Razão Social:</span> {supplier.company_name || "-"}</p>
            <p><span className="text-gray-500">CPF/CNPJ:</span> {supplier.cpf_cnpj || "-"}</p>
            <p><span className="text-gray-500">Inscrição Estadual:</span> {supplier.inscricao_estadual || "-"}</p>
            <p><span className="text-gray-500">Tipo Faturamento:</span> {supplier.billing_type || "-"}</p>
            <p><span className="text-gray-500">Especialidade:</span> {supplier.specialty || "-"}</p>
            <p><span className="text-gray-500">Prazo Médio:</span> {supplier.average_deadline_days ? `${supplier.average_deadline_days} dias` : "-"}</p>
            <p><span className="text-gray-500">Criado em:</span> {formatDateBR(supplier.created_at)}</p>
          </div>
          <div className="bg-white border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold">Contato</h3>
            <p><span className="text-gray-500">Contato Principal:</span> {supplier.contact_name || "-"}</p>
            <p><span className="text-gray-500">Email:</span> {supplier.email || "-"}</p>
            <p><span className="text-gray-500">Telefone:</span> {supplier.phone || "-"}</p>
            <p><span className="text-gray-500">Telefone 2:</span> {supplier.phone2 || "-"}</p>
            <p><span className="text-gray-500">Região:</span> {supplier.region || "-"}</p>
            {supplier.notes && <><h4 className="font-medium mt-2">Observações</h4><p className="text-sm">{supplier.notes}</p></>}
          </div>
        </div>
      )}

      {tab === "bancario" && (
        <div className="bg-white border rounded-lg p-4 max-w-lg space-y-3">
          <h3 className="font-semibold">Dados Bancários</h3>
          <p><span className="text-gray-500">Banco:</span> {supplier.bank_name || "-"}</p>
          <p><span className="text-gray-500">Agência:</span> {supplier.bank_agency || "-"}</p>
          <p><span className="text-gray-500">Conta:</span> {supplier.bank_account || "-"}</p>
          <p><span className="text-gray-500">Tipo:</span> {supplier.bank_account_type || "-"}</p>
          <p><span className="text-gray-500">Chave PIX:</span> {supplier.pix_key || "-"}</p>
          <p><span className="text-gray-500">Tipo PIX:</span> {supplier.pix_key_type || "-"}</p>
          <p><span className="text-gray-500">Favorecido:</span> {supplier.bank_holder_name || "-"}</p>
          <p><span className="text-gray-500">CPF/CNPJ Favorecido:</span> {supplier.bank_holder_cpf_cnpj || "-"}</p>
        </div>
      )}

      {tab === "endereco" && (
        <div className="bg-white border rounded-lg p-4 max-w-lg space-y-3">
          <h3 className="font-semibold">Endereço</h3>
          <p><span className="text-gray-500">Logradouro:</span> {supplier.address_street || "-"}</p>
          <p><span className="text-gray-500">Número:</span> {supplier.address_number || "-"}</p>
          <p><span className="text-gray-500">Complemento:</span> {supplier.address_complement || "-"}</p>
          <p><span className="text-gray-500">Bairro:</span> {supplier.address_neighborhood || "-"}</p>
          <p><span className="text-gray-500">Cidade:</span> {supplier.address_city || "-"}</p>
          <p><span className="text-gray-500">Estado:</span> {supplier.address_state || "-"}</p>
          <p><span className="text-gray-500">CEP:</span> {supplier.address_zip || "-"}</p>
        </div>
      )}

      {tab === "compras" && <div className="text-gray-500">Compras vinculadas ao fornecedor aparecerão aqui.</div>}
    </div>
  )
}
