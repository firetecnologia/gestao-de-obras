import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { suppliersApi } from "@/services/api"
import { useToast } from "@/components/ui/toast"
import { useNavigate } from "react-router-dom"
import { Plus, Search, Pencil, Trash2, Star } from "lucide-react"

interface Supplier { id: string; name: string; cpf_cnpj?: string; specialty?: string; email?: string; phone?: string; address_city?: string; address_state?: string; rating?: number }

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [form, setForm] = useState({ name: "", cpf_cnpj: "", specialty: "", email: "", phone: "", address_city: "", address_state: "", notes: "", rating: 0 })
  const { showToast } = useToast()
  const navigate = useNavigate()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try { const res = await suppliersApi.list({ search, page_size: 50 }); setSuppliers(res.data.items) } catch { showToast("Erro ao carregar fornecedores", "error") } finally { setLoading(false) }
  }, [search, showToast])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async () => {
    try {
      if (editing) { await suppliersApi.update(editing.id, form) } else { await suppliersApi.create(form) }
      setShowForm(false); setEditing(null); showToast(editing ? "Fornecedor atualizado" : "Fornecedor criado"); fetchData()
    } catch { showToast("Erro ao salvar fornecedor", "error") }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Excluir este fornecedor?")) { try { await suppliersApi.delete(id); showToast("Fornecedor excluido"); fetchData() } catch { showToast("Erro ao excluir", "error") } }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Fornecedores</h1>
        <Button onClick={() => { setEditing(null); setForm({ name: "", cpf_cnpj: "", specialty: "", email: "", phone: "", address_city: "", address_state: "", notes: "", rating: 0 }); setShowForm(true) }} className="bg-orange-500 hover:bg-orange-600"><Plus className="h-4 w-4 mr-2" /> Novo Fornecedor</Button>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input placeholder="Buscar fornecedores..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Especialidade</TableHead><TableHead>Contato</TableHead><TableHead>Cidade/UF</TableHead><TableHead>Avaliação</TableHead><TableHead className="w-20">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow>
            : suppliers.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Nenhum fornecedor</TableCell></TableRow>
            : suppliers.map((s) => (
              <TableRow key={s.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate("/suppliers/" + s.id)}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.specialty || "-"}</TableCell>
                <TableCell><div className="text-sm">{s.email}</div><div className="text-xs text-slate-500">{s.phone}</div></TableCell>
                <TableCell>{s.address_city}{s.address_state ? `/${s.address_state}` : ""}</TableCell>
                <TableCell><div className="flex">{Array.from({ length: s.rating || 0 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}</div></TableCell>
                <TableCell><div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditing(s); setForm({ name: s.name, cpf_cnpj: s.cpf_cnpj || "", specialty: s.specialty || "", email: s.email || "", phone: s.phone || "", address_city: s.address_city || "", address_state: s.address_state || "", notes: "", rating: s.rating || 0 }); setShowForm(true) }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(s.id) }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>CNPJ</Label><Input value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} /></div>
              <div><Label>Especialidade</Label><Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><Label>Cidade</Label><Input value={form.address_city} onChange={(e) => setForm({ ...form, address_city: e.target.value })} /></div>
              <div><Label>UF</Label><Input maxLength={2} value={form.address_state} onChange={(e) => setForm({ ...form, address_state: e.target.value })} /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-orange-500 hover:bg-orange-600">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
