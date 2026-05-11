"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import { Plus, Pencil, Trash2, X, Save } from "lucide-react"

interface PalavraChave {
  id: number
  palavra: string
  categoria: string | null
  peso: number
  ativo: boolean
}

const CATEGORIAS = [
  "obra pública", "obra privada", "desempenho", "fase de entrega", "reforma",
  "construção", "incorporação", "prédio", "condomínio", "galpão", "escola",
  "saúde", "comercial", "manutenção", "educação",
]

const EMPTY = { palavra: "", categoria: "", peso: "10" }

export default function PalavrasChavePage() {
  const [items, setItems] = useState<PalavraChave[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY)

  const loadData = () => {
    setLoading(true)
    api.getPalavrasChave().then((d) => setItems(d as PalavraChave[])).finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const handleSave = async () => {
    const payload = { palavra: form.palavra, categoria: form.categoria || null, peso: parseInt(form.peso) || 10 }
    if (editId) {
      await api.updatePalavraChave(editId, payload)
    } else {
      await api.createPalavraChave(payload)
    }
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY)
    loadData()
  }

  const handleEdit = (item: PalavraChave) => {
    setEditId(item.id)
    setForm({ palavra: item.palavra, categoria: item.categoria || "", peso: String(item.peso) })
    setShowForm(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Palavras-Chave</h1>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY) }} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Nova Palavra-Chave
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{editId ? "Editar" : "Nova Palavra-Chave"}</h3>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <input placeholder="Palavra-chave" value={form.palavra} onChange={(e) => setForm({ ...form, palavra: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm" />
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm">
              <option value="">Categoria</option>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" placeholder="Peso" value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm" />
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
              <th className="text-left p-3 font-medium">Palavra-Chave</th>
              <th className="text-left p-3 font-medium">Categoria</th>
              <th className="text-left p-3 font-medium">Peso</th>
              <th className="text-left p-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="border-b border-border hover:bg-muted/30">
                <td className="p-3 font-medium">{item.palavra}</td>
                <td className="p-3">{item.categoria || "-"}</td>
                <td className="p-3">{item.peso}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(item)} className="p-1.5 hover:bg-muted rounded-lg"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => { api.deletePalavraChave(item.id); loadData() }} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
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
