import { useState } from "react"
import { useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { clientsApi, clientBankDataApi } from "@/services/api"
import { formatDateBR } from "@/lib/format"
import { useToast } from "@/components/ui/toast"
import { DetailPageHeader } from "@/components/shared/DetailPageHeader"

type Tab = "resumo" | "contatos" | "bancario" | "obras" | "contratos"

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>("resumo")

  const { data } = useQuery({ queryKey: ["client", id], queryFn: () => clientsApi.get(id!) })
  const { data: bankData } = useQuery({ queryKey: ["client-bank", id], queryFn: () => clientBankDataApi.list(id!), enabled: tab === "bancario" })
  const client = data?.data
  const bankItems = bankData?.data || []

  const [bankForm, setBankForm] = useState({ bank_name: "", bank_agency: "", bank_account: "", bank_account_type: "corrente", pix_key: "", pix_key_type: "cpf", holder_name: "", holder_cpf_cnpj: "" })
  const [showBankForm, setShowBankForm] = useState(false)

  const addBankMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => clientBankDataApi.create(id!, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["client-bank", id] }); setShowBankForm(false); toast({ title: "Dados bancários adicionados" }) },
  })
  const delBankMut = useMutation({
    mutationFn: (bankId: string) => clientBankDataApi.delete(id!, bankId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["client-bank", id] }); toast({ title: "Dados bancários removidos" }) },
  })

  if (!client) return <div className="p-6">Carregando...</div>

  const tabs: { key: Tab; label: string }[] = [
    { key: "resumo", label: "Resumo" },
    { key: "contatos", label: "Contatos" },
    { key: "bancario", label: "Dados Bancários" },
    { key: "obras", label: "Obras" },
    { key: "contratos", label: "Contratos" },
  ]

  return (
    <div className="p-6">
      <DetailPageHeader title={client.name} backTo="/clients" backLabel="Clientes" />
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
            <h3 className="font-semibold">Informações</h3>
            <p><span className="text-gray-500">Email:</span> {client.email || "-"}</p>
            <p><span className="text-gray-500">Telefone:</span> {client.phone || "-"}</p>
            <p><span className="text-gray-500">CPF/CNPJ:</span> {client.cpf_cnpj || "-"}</p>
            <p><span className="text-gray-500">Tipo:</span> {client.person_type === "juridica" ? "Pessoa Jurídica" : "Pessoa Física"}</p>
            <p><span className="text-gray-500">Empresa:</span> {client.company_name || "-"}</p>
            <p><span className="text-gray-500">Criado em:</span> {formatDateBR(client.created_at)}</p>
          </div>
          <div className="bg-white border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold">Endereço</h3>
            <p><span className="text-gray-500">Logradouro:</span> {client.address_street || "-"}</p>
            <p><span className="text-gray-500">Número:</span> {client.address_number || "-"}</p>
            <p><span className="text-gray-500">Complemento:</span> {client.address_complement || "-"}</p>
            <p><span className="text-gray-500">Bairro:</span> {client.address_neighborhood || "-"}</p>
            <p><span className="text-gray-500">Cidade:</span> {client.address_city || "-"}</p>
            <p><span className="text-gray-500">Estado:</span> {client.address_state || "-"}</p>
            <p><span className="text-gray-500">CEP:</span> {client.address_zip || "-"}</p>
          </div>
        </div>
      )}

      {tab === "contatos" && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Contatos</h3>
          {(client.contacts || []).length === 0 ? <p className="text-gray-500">Nenhum contato cadastrado</p> : (
            <div className="space-y-2">
              {(client.contacts || []).map((c: Record<string, unknown>) => (
                <div key={c.id as string} className="flex items-center justify-between border rounded p-3">
                  <div><span className="font-medium">{c.name as string}</span> - {c.email as string} / {c.phone as string}</div>
                  <span className="text-sm text-gray-400">{c.role as string}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "bancario" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Dados Bancários</h3>
            <button onClick={() => setShowBankForm(!showBankForm)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">+ Adicionar</button>
          </div>
          {showBankForm && (
            <div className="bg-gray-50 p-4 rounded mb-4 grid grid-cols-2 gap-3">
              <input placeholder="Banco" value={bankForm.bank_name} onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })} className="border rounded px-3 py-2" />
              <input placeholder="Agência" value={bankForm.bank_agency} onChange={(e) => setBankForm({ ...bankForm, bank_agency: e.target.value })} className="border rounded px-3 py-2" />
              <input placeholder="Conta" value={bankForm.bank_account} onChange={(e) => setBankForm({ ...bankForm, bank_account: e.target.value })} className="border rounded px-3 py-2" />
              <select value={bankForm.bank_account_type} onChange={(e) => setBankForm({ ...bankForm, bank_account_type: e.target.value })} className="border rounded px-3 py-2">
                <option value="corrente">Corrente</option>
                <option value="poupanca">Poupança</option>
              </select>
              <input placeholder="Chave PIX" value={bankForm.pix_key} onChange={(e) => setBankForm({ ...bankForm, pix_key: e.target.value })} className="border rounded px-3 py-2" />
              <select value={bankForm.pix_key_type} onChange={(e) => setBankForm({ ...bankForm, pix_key_type: e.target.value })} className="border rounded px-3 py-2">
                <option value="cpf">CPF</option>
                <option value="cnpj">CNPJ</option>
                <option value="email">Email</option>
                <option value="telefone">Telefone</option>
                <option value="aleatoria">Aleatória</option>
              </select>
              <input placeholder="Favorecido" value={bankForm.holder_name} onChange={(e) => setBankForm({ ...bankForm, holder_name: e.target.value })} className="border rounded px-3 py-2" />
              <input placeholder="CPF/CNPJ Favorecido" value={bankForm.holder_cpf_cnpj} onChange={(e) => setBankForm({ ...bankForm, holder_cpf_cnpj: e.target.value })} className="border rounded px-3 py-2" />
              <button onClick={() => addBankMut.mutate(bankForm)} className="px-4 py-2 bg-green-600 text-white rounded col-span-2">Salvar</button>
            </div>
          )}
          {bankItems.length === 0 ? <p className="text-gray-500">Nenhum dado bancário cadastrado</p> : (
            <div className="space-y-3">
              {bankItems.map((b: Record<string, unknown>) => (
                <div key={b.id as string} className="bg-white border rounded-lg p-4 flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="font-medium">{b.bank_name as string} - Ag: {b.bank_agency as string} / Cc: {b.bank_account as string}</p>
                    <p className="text-sm text-gray-500">PIX ({b.pix_key_type as string}): {b.pix_key as string}</p>
                    <p className="text-sm text-gray-500">Favorecido: {b.holder_name as string}</p>
                  </div>
                  <button onClick={() => delBankMut.mutate(b.id as string)} className="text-red-600 text-sm hover:underline">Remover</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "obras" && <div className="text-gray-500">Obras vinculadas ao cliente aparecerão aqui.</div>}
      {tab === "contratos" && <div className="text-gray-500">Contratos vinculados ao cliente aparecerão aqui.</div>}
    </div>
  )
}
