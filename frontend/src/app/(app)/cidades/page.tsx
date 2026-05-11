"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import { Plus, Pencil, Trash2, X, Save } from "lucide-react"

interface Cidade {
  id: number
  nome: string
  uf: string
  codigo_ibge: string | null
  regiao: string | null
  prioridade: string
  ativo: boolean
}

const PRIORIDADE_BADGE: Record<string, string> = {
  alta: "bg-red-100 text-red-700",
  media: "bg-yellow-100 text-yellow-700",
  baixa: "bg-green-100 text-green-700",
}

const EMPTY = { nome: "", uf: "", codigo_ibge: "", regiao: "", prioridade: "media" }

export default function CidadesPage() {
  const [items, setItems] = useState<Cidade[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY)

  const loadData = () => {
    setLoading(true)
    api.getCidades().then((d) => setItems(d as Cidade[])).finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const handleSave = async () => {
    if (editId) {
      await api.updateCidade(editId, form)
    } else {
      await api.createCidade(form)
    }
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY)
    loadData()
  }

  const handleEdit = (item: Cidade) => {
    setEditId(item.id)
    setForm({ nome: item.nome, uf: item.uf, codigo_ibge: item.codigo_ibge || "", regiao: item.regiao || "", prioridade: item.prioridade })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm("Desativar esta cidade?")) {
      await api.deleteCidade(id)
      loadData()
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Cidades-Alvo</h1>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY) }} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Nova Cidade
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{editId ? "Editar Cidade" : "Nova Cidade"}</h3>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input placeholder="Nome da cidade" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm" />
            <input placeholder="UF" value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value })} maxLength={2} className="px-3 py-2 border border-border rounded-lg text-sm" />
            <input placeholder="Código IBGE" value={form.codigo_ibge} onChange={(e) => setForm({ ...form, codigo_ibge: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm" />
            <input placeholder="Região" value={form.regiao} onChange={(e) => setForm({ ...form, regiao: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm" />
            <select value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm">
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
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
              <th className="text-left p-3 font-medium">Cidade</th>
              <th className="text-left p-3 font-medium">UF</th>
              <th className="text-left p-3 font-medium">Código IBGE</th>
              <th className="text-left p-3 font-medium">Região</th>
              <th className="text-left p-3 font-medium">Prioridade</th>
              <th className="text-left p-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma cidade cadastrada</td></tr>
            ) : items.map((item) => (
              <tr key={item.id} className="border-b border-border hover:bg-muted/30">
                <td className="p-3 font-medium">{item.nome}</td>
                <td className="p-3">{item.uf}</td>
                <td className="p-3">{item.codigo_ibge || "-"}</td>
                <td className="p-3">{item.regiao || "-"}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-medium ${PRIORIDADE_BADGE[item.prioridade]}`}>{item.prioridade}</span></td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(item)} className="p-1.5 hover:bg-muted rounded-lg"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
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
