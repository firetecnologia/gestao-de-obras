"use client"

import { useState } from "react"
import { api } from "@/services/api"
import { Search, Loader2 } from "lucide-react"

interface SearchResult {
  total_encontrados: number
  salvos: number
  duplicados: number
  erros: number
  contratacoes_encontradas: number
  contratos_encontrados: number
  errors_contratacoes: string | null
  errors_contratos: string | null
}

export default function BuscaPNCPPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    data_inicial: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
    data_final: new Date().toISOString().slice(0, 10),
    uf: "SP",
    codigo_ibge: "",
    palavras_chave: "obra, construção, reforma, serviços de engenharia",
  })

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const payload = {
        data_inicial: form.data_inicial,
        data_final: form.data_final,
        uf: form.uf || null,
        codigo_ibge: form.codigo_ibge || null,
        palavras_chave: form.palavras_chave
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
      }
      const data = await api.buscarPNCP(payload) as SearchResult
      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro na busca")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Buscar no PNCP</h1>
      <p className="text-muted-foreground mb-6">
        Portal Nacional de Contratações Públicas - busque contratações e contratos relacionados a obras e serviços de engenharia.
      </p>

      <form onSubmit={handleSearch} className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Data Inicial *</label>
            <input
              type="date"
              value={form.data_inicial}
              onChange={(e) => setForm({ ...form, data_inicial: e.target.value })}
              required
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Data Final *</label>
            <input
              type="date"
              value={form.data_final}
              onChange={(e) => setForm({ ...form, data_final: e.target.value })}
              required
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">UF</label>
            <input
              value={form.uf}
              onChange={(e) => setForm({ ...form, uf: e.target.value })}
              maxLength={2}
              placeholder="Ex: SP"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Código IBGE do Município</label>
            <input
              value={form.codigo_ibge}
              onChange={(e) => setForm({ ...form, codigo_ibge: e.target.value })}
              placeholder="Ex: 3502804"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Palavras-chave (separadas por vírgula)</label>
            <input
              value={form.palavras_chave}
              onChange={(e) => setForm({ ...form, palavras_chave: e.target.value })}
              placeholder="obra, construção, reforma..."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? "Buscando..." : "Buscar Agora"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">{error}</div>
      )}

      {result && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-semibold text-lg mb-4">Resultado da Busca</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ResultCard label="Total Encontrados" value={result.total_encontrados} color="text-primary" />
            <ResultCard label="Novos Salvos" value={result.salvos} color="text-green-600" />
            <ResultCard label="Duplicados (ignorados)" value={result.duplicados} color="text-yellow-600" />
            <ResultCard label="Erros" value={result.erros} color="text-red-600" />
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <p>Contratações encontradas: {result.contratacoes_encontradas}</p>
            <p>Contratos encontrados: {result.contratos_encontrados}</p>
            {result.errors_contratacoes && <p className="text-red-500 mt-1">Erro contratações: {result.errors_contratacoes}</p>}
            {result.errors_contratos && <p className="text-red-500 mt-1">Erro contratos: {result.errors_contratos}</p>}
          </div>
          {result.salvos > 0 && (
            <p className="mt-4 text-sm font-medium text-green-700">
              {result.salvos} nova(s) oportunidade(s) salva(s) com sucesso! Acesse a lista de oportunidades para visualizar.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ResultCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  )
}
