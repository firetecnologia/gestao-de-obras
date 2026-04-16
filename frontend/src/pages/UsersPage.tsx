import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { usersApi, rolesApi } from "@/services/api"
import { Plus, Search, Pencil, Trash2 } from "lucide-react"

interface User { id: string; name: string; email: string; phone?: string; role_id?: string; role_name?: string; is_active: boolean; created_at?: string }
interface Role { id: string; name: string }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", role_id: "", is_active: true })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [uRes, rRes] = await Promise.all([usersApi.list({ search, page_size: 50 }), rolesApi.list()])
      setUsers(uRes.data.items); setRoles(rRes.data)
    } catch { /* empty */ } finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async () => {
    try {
      const data: Record<string, unknown> = { name: form.name, email: form.email, phone: form.phone || undefined, role_id: form.role_id || undefined, is_active: form.is_active }
      if (form.password) data.password = form.password
      if (editing) { await usersApi.update(editing.id, data) } else { await usersApi.create({ ...data, password: form.password }) }
      setShowForm(false); setEditing(null); fetchData()
    } catch { /* empty */ }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Desativar este usuário?")) { await usersApi.delete(id); fetchData() }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Usuários</h1>
        <Button onClick={() => { setEditing(null); setForm({ name: "", email: "", phone: "", password: "", role_id: "", is_active: true }); setShowForm(true) }} className="bg-orange-500 hover:bg-orange-600"><Plus className="h-4 w-4 mr-2" /> Novo Usuário</Button>
      </div>
      <div className="relative max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input placeholder="Buscar usuários..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Telefone</TableHead><TableHead>Perfil</TableHead><TableHead>Status</TableHead><TableHead className="w-20">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow>
            : users.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Nenhum usuário</TableCell></TableRow>
            : users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.phone || "-"}</TableCell>
                <TableCell><Badge variant="secondary">{u.role_name || "Sem perfil"}</Badge></TableCell>
                <TableCell><Badge variant={u.is_active ? "success" : "destructive"}>{u.is_active ? "Ativo" : "Inativo"}</Badge></TableCell>
                <TableCell><div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(u); setForm({ name: u.name, email: u.email, phone: u.phone || "", password: "", role_id: u.role_id || "", is_active: u.is_active }); setShowForm(true) }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar Usuário" : "Novo Usuário"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><Label>{editing ? "Nova Senha (deixe vazio para manter)" : "Senha"}</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div><Label>Perfil</Label><Select value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })}>
              <option value="">Selecione...</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select></div>
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
