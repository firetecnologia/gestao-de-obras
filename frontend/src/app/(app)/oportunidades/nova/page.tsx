"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/services/api"
import { ArrowLeft, Save } from "lucide-react"

const TIPOS_OBRA = [
  "residencial multifamiliar", "residencial unifamiliar", "comercial", "industrial",
  "galpão", "saúde", "educação", "infraestrutura", "reforma", "manutenção",
  "loteamento", "outro",
]

const FASES = [
  "planejamento", "licitação", "contratação", "alvará/aprovação", "início de obra",
  "execução", "fase final", "entrega", "entregue", "desconhecida",
]

const ORIGENS = [
  "indicação", "visita presencial", "Instagram", "site da construtora",
  "conversa comercial", "placa de obra", "notícia", "PNCP", "diário oficial", "outro",
]

export default function NovaOportunidadePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    nome_obra: "",
    resumo: "",
    cidade: "",
    uf: "",
    endereco: "",
    construtora: "",
    incorporadora: "",
    contratante: "",
    orgao_publico: "",
    tipo_obra: "",
    fase_provavel: "desconhecida",
    origem_informacao: "",
    fonte: "",
    link_fonte: "",
    data_publicacao: "",
    valor_estimado: "",
    prazo_previsto: "",
    observacoes: "",
  })

  const update = (field: string, value: string) => setForm({ ...form, [field]: value })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const payload = {
        ...form,
        valor_estimado: form.valor_estimado ? parseFloat(form.valor_estimado) : null,
        data_publicacao: form.data_publicacao || null,
      }
      const result = await api.createOportunidade(payload) as { id: number }
      router.push(`/oportunidades/${result.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Nova Oportunidade Manual</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

        <Section title="Dados da Obra">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Nome / Descrição da Obra *</Label>
              <input value={form.nome_obra} onChange={(e) => update("nome_obra", e.target.value)} required className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <Label>Resumo</Label>
              <textarea value={form.resumo} onChange={(e) => update("resumo", e.target.value)} className="input-field" rows={3} />
            </div>
            <div>
              <Label>Cidade</Label>
              <input value={form.cidade} onChange={(e) => update("cidade", e.target.value)} className="input-field" />
            </div>
            <div>
              <Label>UF</Label>
              <input value={form.uf} onChange={(e) => update("uf", e.target.value)} maxLength={2} className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <Label>Endereço</Label>
              <input value={form.endereco} onChange={(e) => update("endereco", e.target.value)} className="input-field" />
            </div>
            <div>
              <Label>Tipo de Obra</Label>
              <select value={form.tipo_obra} onChange={(e) => update("tipo_obra", e.target.value)} className="input-field">
                <option value="">Selecione</option>
                {TIPOS_OBRA.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label>Fase Provável</Label>
              <select value={form.fase_provavel} onChange={(e) => update("fase_provavel", e.target.value)} className="input-field">
                {FASES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <Label>Valor Estimado (R$)</Label>
              <input type="number" step="0.01" value={form.valor_estimado} onChange={(e) => update("valor_estimado", e.target.value)} className="input-field" />
            </div>
            <div>
              <Label>Prazo Previsto</Label>
              <input value={form.prazo_previsto} onChange={(e) => update("prazo_previsto", e.target.value)} className="input-field" placeholder="Ex: 12 meses" />
            </div>
          </div>
        </Section>

        <Section title="Contratante / Construtora">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Construtora</Label>
              <input value={form.construtora} onChange={(e) => update("construtora", e.target.value)} className="input-field" />
            </div>
            <div>
              <Label>Incorporadora</Label>
              <input value={form.incorporadora} onChange={(e) => update("incorporadora", e.target.value)} className="input-field" />
            </div>
            <div>
              <Label>Contratante</Label>
              <input value={form.contratante} onChange={(e) => update("contratante", e.target.value)} className="input-field" />
            </div>
            <div>
              <Label>Órgão Público</Label>
              <input value={form.orgao_publico} onChange={(e) => update("orgao_publico", e.target.value)} className="input-field" />
            </div>
          </div>
        </Section>

        <Section title="Origem">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Origem da Informação</Label>
              <select value={form.origem_informacao} onChange={(e) => update("origem_informacao", e.target.value)} className="input-field">
                <option value="">Selecione</option>
                {ORIGENS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <Label>Fonte</Label>
              <input value={form.fonte} onChange={(e) => update("fonte", e.target.value)} className="input-field" placeholder="Nome da fonte" />
            </div>
            <div>
              <Label>Link da Fonte</Label>
              <input value={form.link_fonte} onChange={(e) => update("link_fonte", e.target.value)} className="input-field" placeholder="https://..." />
            </div>
            <div>
              <Label>Data da Publicação</Label>
              <input type="date" value={form.data_publicacao} onChange={(e) => update("data_publicacao", e.target.value)} className="input-field" />
            </div>
          </div>
        </Section>

        <Section title="Observações">
          <textarea value={form.observacoes} onChange={(e) => update("observacoes", e.target.value)} className="input-field" rows={4} placeholder="Informações adicionais..." />
        </Section>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50">
            <Save className="w-4 h-4" />
            {loading ? "Salvando..." : "Salvar Oportunidade"}
          </button>
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 border border-border rounded-lg">
            Cancelar
          </button>
        </div>
      </form>

      <style jsx>{`
        .input-field {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          font-size: 0.875rem;
          outline: none;
          margin-top: 0.25rem;
        }
        .input-field:focus {
          ring: 2px;
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
        }
      `}</style>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="font-semibold mb-4">{title}</h3>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-foreground">{children}</label>
}
