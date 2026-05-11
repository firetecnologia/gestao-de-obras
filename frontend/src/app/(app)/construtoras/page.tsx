"use client"

import { useEffect, useState } from "react"
import { api } from "@/services/api"
import { Plus, Pencil, Trash2, X, Save } from "lucide-react"

interface Construtora {
  id: number
  nome: string
  cnpj: string | null
  cidade: string | null
  uf: string | null
  site: string | null
  instagram: string | null
  telefone: string | null
  email: string | null
  responsavel: string | null
  observacoes: string | null
  relacionamento: string
  ativo: boolean
}

const RELACIONAMENTOS = ["desconhecido", "frio", "morno", "quente", "cliente", "ex-cliente"]

const REL_BADGE: Record<string, string> = {
  desconhecido: "bg-gray-100 text-gray-700",
  frio: "bg-blue-100 text-blue-700",
  morno: "bg-yellow-100 text-yellow-700",
  quente: "bg-orange-100 text-orange-700",
  cliente: "bg-green-100 text-green-700",
  "ex-cliente": "bg-purple-100 text-purple-700",
}

const EMPTY = { nome: "", cnpj: "", cidade: "", uf: "", site: "", instagram: "", telefone: "", email: "", responsavel: "", observacoes: "", relacionamento: "desconhecido" }

export default function ConstrutorasPage() {
  const [items, setItems] = useState<Construtora[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY)

  const loadData = () => {
    setLoading(true)
    api.getConstrutoras().then((d) => setItems(d as Construtora[])).finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const handleSave = async () => {
    const payload = { ...form, cnpj: form.cnpj || null, observacoes: form.observacoes || null }
    if (editId) {
      await api.updateConstrutora(editId, payload)
    } else {
      await api.createConstrutora(payload)
    }
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY)
    loadData()
  }

  const handleEdit = (item: Construtora) => {
    setEditId(item.id)
    setForm({
      nome: item.nome, cnpj: item.cnpj || "", cidade: item.cidade || "", uf: item.uf || "",
      site: item.site || "", instagram: item.instagram || "", telefone: item.telefone || "",
      email: item.email || "", responsavel: item.responsavel || "", observacoes: item.observacoes || "",
      relacionamento: item.relacionamento,
    })
    setShowForm(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Construtoras / Incorporadoras</h1>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY) }} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Nova Construtora
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{editId ? "Editar" : "Nova Construtora"}</h3>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input placeholder="Nome *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm" />
            <input placeholder="CNPJ" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm" />
            <input placeholder="Cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm" />
            <input placeholder="UF" value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value })} maxLength={2} className="px-3 py-2 border border-border rounded-lg text-sm" />
            <input placeholder="Site" value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm" />
            <input placeholder="Instagram" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm" />
            <input placeholder="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm" />
            <input placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm" />
            <input placeholder="Responsável" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm" />
            <select value={form.relacionamento} onChange={(e) => setForm({ ...form, relacionamento: e.target.value })} className="px-3 py-2 border border-border rounded-lg text-sm">
              {RELACIONAMENTOS.map((r) => <option key={r} value={r}>{r}</option>)}
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium">Nome</th>
                <th className="text-left p-3 font-medium">Cidade/UF</th>
                <th className="text-left p-3 font-medium">Telefone</th>
                <th className="text-left p-3 font-medium">E-mail</th>
                <th className="text-left p-3 font-medium">Relacionamento</th>
                <th className="text-left p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : items.map((item) => (
                <tr key={item.id} className="border-b border-border hover:bg-muted/30">
                  <td className="p-3 font-medium">{item.nome}</td>
                  <td className="p-3">{item.cidade ? `${item.cidade}/${item.uf}` : item.uf || "-"}</td>
                  <td className="p-3">{item.telefone || "-"}</td>
                  <td className="p-3">{item.email || "-"}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-medium ${REL_BADGE[item.relacionamento] || ""}`}>{item.relacionamento}</span></td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(item)} className="p-1.5 hover:bg-muted rounded-lg"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => { api.deleteConstrutora(item.id); loadData() }} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
