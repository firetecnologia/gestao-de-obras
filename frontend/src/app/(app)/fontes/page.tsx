"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import { Plus, Pencil, Trash2, X, Save, ExternalLink } from "lucide-react"

interface FonteBusca {
  id: number
  nome: string
  tipo: string
  url: string | null
  cidade: string | null
  uf: string | null
  frequencia: string
  observacoes: string | null
  ativo: boolean
}

const TIPOS = ["pncp", "diario_oficial", "prefeitura", "portal_transparencia", "construtora", "incorporadora", "noticia", "manual"]
const FREQUENCIAS = ["diaria", "semanal", "quinzenal", "manual"]

const EMPTY = { nome: "", tipo: "manual", url: "", cidade: "", uf: "", frequencia: "manual", observacoes: "" }

export default function FontesPage() {
  const [items, setItems] = useState<FonteBusca[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY)

  const loadData = () => {
    setLoading(true)
    api.getFontes().then((d) => setItems(d as FonteBusca[])).finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const handleSave = async () => {
    if (editId) {
      await api.updateFonte(editId, form)
    } else {
      await api.createFonte(form)
    }
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY)
    loadData()
  }

  const handleEdit = (item: FonteBusca) => {
    setEditId(item.id)
    setForm({ nome: item.nome, tipo: item.tipo, url: item.url || "", cidade: item.cidade || "", uf: item.uf || "", frequencia: item.frequencia, observacoes: item.observacoes || "" })
    setShowForm(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Fontes de Busca</h1>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY) }} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Nova Fonte
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{editId ? "Editar" : "Nova Fonte"}</h3>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input placeholder="Nome *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm" />
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm">
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm" />
            <input placeholder="Cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm" />
            <input placeholder="UF" value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value })} maxLength={2} className="px-3 py-2 border border-border rounded-lg text-sm" />
            <select value={form.frequencia} onChange={(e) => setForm({ ...form, frequencia: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm">
              {FREQUENCIAS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <div className="sm:col-span-2">
              <textarea placeholder="Observações" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="w-full px-3 py-2 border border-border rounded-lg text-sm" rows={2} />
            </div>
            <button onClick={handleSave} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
              <Save className="w-4 h-4" /> Salvar
            </button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3 font-medium">Nome</th>
              <th className="text-left p-3 font-medium">Tipo</th>
              <th className="text-left p-3 font-medium">Cidade/UF</th>
              <th className="text-left p-3 font-medium">Frequência</th>
              <th className="text-left p-3 font-medium">URL</th>
              <th className="text-left p-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="border-b border-border hover:bg-muted/30">
                <td className="p-3 font-medium">{item.nome}</td>
                <td className="p-3"><span className="px-2 py-1 bg-muted rounded text-xs">{item.tipo}</span></td>
                <td className="p-3">{item.cidade ? `${item.cidade}/${item.uf}` : item.uf || "-"}</td>
                <td className="p-3">{item.frequencia}</td>
                <td className="p-3">{item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" />Link</a> : "-"}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(item)} className="p-1.5 hover:bg-muted rounded-lg"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => { api.deleteFonte(item.id); loadData() }} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
