"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/services/api"
import { formatBRL, formatDateBR } from "@/lib/utils"
import { ArrowLeft, ExternalLink, Plus, Save } from "lucide-react"

interface Historico {
  id: number
  tipo: string
  descricao: string | null
  pessoa_contatada: string | null
  telefone: string | null
  email: string | null
  resposta: string | null
  data_proximo_followup: string | null
  valor_proposta: number | null
  usuario: string | null
  created_at: string
}

interface Oportunidade {
  id: number
  nome_obra: string
  resumo: string | null
  cidade: string | null
  uf: string | null
  endereco: string | null
  construtora: string | null
  incorporadora: string | null
  contratante: string | null
  orgao_publico: string | null
  tipo_obra: string | null
  fase_provavel: string | null
  origem_informacao: string | null
  fonte: string | null
  link_fonte: string | null
  data_publicacao: string | null
  data_encontrada: string
  valor_estimado: number | null
  prazo_previsto: string | null
  status: string
  prioridade: string
  score: number
  score_justificativa: string | null
  servicos_sugeridos: string | null
  proxima_acao: string | null
  responsavel_interno: string | null
  observacoes: string | null
  texto_original: string | null
  historico: Historico[]
}

const PRIORIDADE_BADGE: Record<string, string> = {
  alta: "bg-red-100 text-red-700",
  media: "bg-yellow-100 text-yellow-700",
  baixa: "bg-green-100 text-green-700",
}

const STATUS_OPTIONS = [
  "novo", "analisar", "contatar", "contato realizado", "em negociação",
  "proposta enviada", "convertido", "sem interesse", "descartado",
]

export default function OportunidadeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [item, setItem] = useState<Oportunidade | null>(null)
  const [loading, setLoading] = useState(true)
  const [editData, setEditData] = useState<Record<string, string | number | null>>({})
  const [showHistForm, setShowHistForm] = useState(false)
  const [histForm, setHistForm] = useState({ tipo: "contato", descricao: "", pessoa_contatada: "", telefone: "", email: "", resposta: "", valor_proposta: "" })

  const loadData = () => {
    setLoading(true)
    api.getOportunidade(Number(params.id))
      .then((d) => setItem(d as Oportunidade))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [params.id])

  const handleSave = async () => {
    await api.updateOportunidade(Number(params.id), editData)
    loadData()
  }

  const handleStatusChange = async (status: string) => {
    await api.updateStatus(Number(params.id), status)
    loadData()
  }

  const handleAddHistorico = async () => {
    const payload: Record<string, unknown> = {
      oportunidade_id: Number(params.id),
      tipo: histForm.tipo,
      descricao: histForm.descricao || null,
      pessoa_contatada: histForm.pessoa_contatada || null,
      telefone: histForm.telefone || null,
      email: histForm.email || null,
      resposta: histForm.resposta || null,
      valor_proposta: histForm.valor_proposta ? parseFloat(histForm.valor_proposta) : null,
    }
    await api.addHistorico(Number(params.id), payload)
    setShowHistForm(false)
    setHistForm({ tipo: "contato", descricao: "", pessoa_contatada: "", telefone: "", email: "", resposta: "", valor_proposta: "" })
    loadData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!item) return <p>Oportunidade não encontrada.</p>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{item.nome_obra}</h1>
          <p className="text-sm text-muted-foreground">{item.cidade}/{item.uf} - {item.fonte}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${PRIORIDADE_BADGE[item.prioridade]}`}>
          {item.prioridade} ({item.score} pts)
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="Dados da Obra">
            <InfoGrid items={[
              { label: "Resumo", value: item.resumo },
              { label: "Cidade/UF", value: item.cidade ? `${item.cidade}/${item.uf}` : item.uf },
              { label: "Endereço", value: item.endereco },
              { label: "Tipo de Obra", value: item.tipo_obra },
              { label: "Fase Provável", value: item.fase_provavel },
              { label: "Valor Estimado", value: formatBRL(item.valor_estimado) },
              { label: "Prazo Previsto", value: item.prazo_previsto },
              { label: "Data Publicação", value: formatDateBR(item.data_publicacao) },
              { label: "Data Encontrada", value: formatDateBR(item.data_encontrada) },
            ]} />
          </Section>

          <Section title="Contratante / Construtora">
            <InfoGrid items={[
              { label: "Contratante", value: item.contratante },
              { label: "Construtora", value: item.construtora },
              { label: "Incorporadora", value: item.incorporadora },
              { label: "Órgão Público", value: item.orgao_publico },
            ]} />
          </Section>

          <Section title="Fonte Original">
            <p className="text-sm text-muted-foreground mb-2">{item.origem_informacao} - {item.fonte}</p>
            {item.link_fonte && (
              <a href={item.link_fonte} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary text-sm hover:underline">
                <ExternalLink className="w-3 h-3" /> Abrir fonte original
              </a>
            )}
            {item.texto_original && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium">Texto original coletado</summary>
                <pre className="mt-2 text-xs bg-muted p-3 rounded-lg overflow-auto max-h-48 whitespace-pre-wrap">{item.texto_original}</pre>
              </details>
            )}
          </Section>

          <Section title="Score e Justificativa">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl font-bold">{item.score}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${PRIORIDADE_BADGE[item.prioridade]}`}>
                {item.prioridade}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{item.score_justificativa}</p>
          </Section>

          <Section title="Serviços Sugeridos">
            {item.servicos_sugeridos ? (
              <div className="flex flex-wrap gap-2">
                {item.servicos_sugeridos.split("; ").map((s, i) => (
                  <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">{s}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum serviço sugerido automaticamente</p>
            )}
          </Section>

          <Section title="Histórico Comercial">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{item.historico.length} registro(s)</p>
              <button
                onClick={() => setShowHistForm(!showHistForm)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm"
              >
                <Plus className="w-3 h-3" /> Novo registro
              </button>
            </div>

            {showHistForm && (
              <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <select value={histForm.tipo} onChange={(e) => setHistForm({ ...histForm, tipo: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm">
                    <option value="contato">Contato realizado</option>
                    <option value="proposta">Proposta enviada</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="observacao">Observação</option>
                  </select>
                  <input placeholder="Pessoa contatada" value={histForm.pessoa_contatada} onChange={(e) => setHistForm({ ...histForm, pessoa_contatada: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm" />
                  <input placeholder="Telefone" value={histForm.telefone} onChange={(e) => setHistForm({ ...histForm, telefone: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm" />
                  <input placeholder="E-mail" value={histForm.email} onChange={(e) => setHistForm({ ...histForm, email: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm" />
                  <input placeholder="Valor da proposta" type="number" value={histForm.valor_proposta} onChange={(e) => setHistForm({ ...histForm, valor_proposta: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm" />
                </div>
                <textarea placeholder="Descrição / Resposta" value={histForm.descricao} onChange={(e) => setHistForm({ ...histForm, descricao: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" rows={2} />
                <button onClick={handleAddHistorico} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">Salvar</button>
              </div>
            )}

            <div className="space-y-3">
              {item.historico.map((h) => (
                <div key={h.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 bg-muted rounded">{h.tipo}</span>
                    <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                  {h.descricao && <p className="text-sm mt-1">{h.descricao}</p>}
                  {h.pessoa_contatada && <p className="text-xs text-muted-foreground mt-1">Contato: {h.pessoa_contatada} {h.telefone} {h.email}</p>}
                  {h.valor_proposta && <p className="text-xs text-muted-foreground">Valor: {formatBRL(h.valor_proposta)}</p>}
                  {h.usuario && <p className="text-xs text-muted-foreground">Por: {h.usuario}</p>}
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Status Comercial">
            <select
              value={item.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </Section>

          <Section title="Edição Rápida">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium">Próxima Ação</label>
                <input
                  defaultValue={item.proxima_acao || ""}
                  onChange={(e) => setEditData({ ...editData, proxima_acao: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Responsável Interno</label>
                <input
                  defaultValue={item.responsavel_interno || ""}
                  onChange={(e) => setEditData({ ...editData, responsavel_interno: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Observações</label>
                <textarea
                  defaultValue={item.observacoes || ""}
                  onChange={(e) => setEditData({ ...editData, observacoes: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm mt-1"
                  rows={3}
                />
              </div>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
              >
                <Save className="w-3 h-3" /> Salvar
              </button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      {children}
    </div>
  )
}

function InfoGrid({ items }: { items: { label: string; value: string | null | undefined }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="text-sm font-medium">{item.value || "-"}</p>
        </div>
      ))}
    </div>
  )
}
