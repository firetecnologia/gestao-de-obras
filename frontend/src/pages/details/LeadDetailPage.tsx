import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { leadsApi } from "@/services/api"
import { formatDateBR } from "@/lib/format"
import { useToast } from "@/components/ui/toast"
import { DetailPageHeader } from "@/components/shared/DetailPageHeader"

type Tab = "resumo" | "endereco" | "interacoes" | "historico"

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>("resumo")
  const [interaction, setInteraction] = useState({ type: "email", notes: "" })

  const { data } = useQuery({ queryKey: ["lead", id], queryFn: () => leadsApi.get(id!) })
  const lead = data?.data

  const convertMut = useMutation({
    mutationFn: () => leadsApi.convert(id!),
    onSuccess: () => { toast({ title: "Lead convertido em cliente!" }); navigate("/clients") },
  })
  const addInteractionMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => leadsApi.addInteraction(id!, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lead", id] }); setInteraction({ type: "email", notes: "" }); toast({ title: "Interação registrada" }) },
  })

  if (!lead) return <div className="p-6">Carregando...</div>

  const tabs: { key: Tab; label: string }[] = [
    { key: "resumo", label: "Resumo" },
    { key: "endereco", label: "Endereço" },
    { key: "interacoes", label: "Interações" },
    { key: "historico", label: "Histórico" },
  ]

  return (
    <div className="p-6">
      <DetailPageHeader title={lead.name} backTo="/leads" backLabel="Leads" />
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
            <h3 className="font-semibold">Dados do Lead</h3>
            <p><span className="text-gray-500">Email:</span> {lead.email || "-"}</p>
            <p><span className="text-gray-500">Telefone:</span> {lead.phone || "-"}</p>
            <p><span className="text-gray-500">Empresa:</span> {lead.company || "-"}</p>
            <p><span className="text-gray-500">Origem:</span> {lead.source || "-"}</p>
            <p><span className="text-gray-500">Status:</span> <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-sm">{lead.status}</span></p>
            <p><span className="text-gray-500">Criado em:</span> {formatDateBR(lead.created_at)}</p>
          </div>
          <div className="bg-white border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold">Ações</h3>
            <button onClick={() => convertMut.mutate()} className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              Converter em Cliente
            </button>
            <p className="text-xs text-gray-500">Ao converter, os dados do lead (incluindo endereço) serão copiados para o novo cliente.</p>
          </div>
        </div>
      )}

      {tab === "endereco" && (
        <div className="bg-white border rounded-lg p-4 max-w-lg">
          <h3 className="font-semibold mb-4">Endereço</h3>
          <div className="space-y-2">
            <p><span className="text-gray-500">Logradouro:</span> {lead.address_street || "-"}</p>
            <p><span className="text-gray-500">Número:</span> {lead.address_number || "-"}</p>
            <p><span className="text-gray-500">Complemento:</span> {lead.address_complement || "-"}</p>
            <p><span className="text-gray-500">Bairro:</span> {lead.address_neighborhood || "-"}</p>
            <p><span className="text-gray-500">Cidade:</span> {lead.address_city || "-"}</p>
            <p><span className="text-gray-500">Estado:</span> {lead.address_state || "-"}</p>
            <p><span className="text-gray-500">CEP:</span> {lead.address_zip || "-"}</p>
          </div>
        </div>
      )}

      {tab === "interacoes" && (
        <div>
          <div className="bg-gray-50 p-4 rounded mb-4">
            <h3 className="font-semibold mb-2">Nova Interação</h3>
            <div className="flex gap-3">
              <select value={interaction.type} onChange={(e) => setInteraction({ ...interaction, type: e.target.value })} className="border rounded px-3 py-2">
                <option value="email">Email</option>
                <option value="phone">Telefone</option>
                <option value="meeting">Reunião</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
              <input placeholder="Notas" value={interaction.notes} onChange={(e) => setInteraction({ ...interaction, notes: e.target.value })} className="flex-1 border rounded px-3 py-2" />
              <button onClick={() => addInteractionMut.mutate(interaction)} className="px-4 py-2 bg-blue-600 text-white rounded">Registrar</button>
            </div>
          </div>
          <div className="space-y-2">
            {(lead.interactions || []).map((i: Record<string, unknown>, idx: number) => (
              <div key={idx} className="bg-white border rounded p-3 flex justify-between">
                <div><span className="font-medium capitalize">{i.type as string}</span> - {i.notes as string}</div>
                <span className="text-sm text-gray-400">{formatDateBR(i.created_at as string)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "historico" && (
        <div className="text-gray-500">Histórico de alterações será implementado em breve.</div>
      )}
    </div>
  )
}
