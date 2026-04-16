import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { clientsApi } from "@/services/api"
import { Plus, Search, Pencil, Trash2, Building2, User } from "lucide-react"

interface Client {
  id: string
  person_type: string
  name: string
  company_name?: string
  cpf_cnpj?: string
  email?: string
  phone?: string
  address_city?: string
  address_state?: string
  notes?: string
  created_at?: string
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState({ person_type: "fisica", name: "", company_name: "", cpf_cnpj: "", email: "", phone: "", address_street: "", address_number: "", address_city: "", address_state: "", address_zip: "", notes: "" })

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await clientsApi.list({ search, page_size: 50 })
      setClients(res.data.items)
    } catch { /* empty */ } finally { setLoading(false) }
  }, [search])

  useEffect(() => { fetchClients() }, [fetchClients])

  const handleSave = async () => {
    try {
      if (editing) {
        await clientsApi.update(editing.id, form)
      } else {
        await clientsApi.create(form)
      }
      setShowForm(false)
      setEditing(null)
      setForm({ person_type: "fisica", name: "", company_name: "", cpf_cnpj: "", email: "", phone: "", address_street: "", address_number: "", address_city: "", address_state: "", address_zip: "", notes: "" })
      fetchClients()
    } catch { /* empty */ }
  }

  const handleEdit = (client: Client) => {
    setEditing(client)
    setForm({ person_type: client.person_type, name: client.name, company_name: client.company_name || "", cpf_cnpj: client.cpf_cnpj || "", email: client.email || "", phone: client.phone || "", address_street: "", address_number: "", address_city: client.address_city || "", address_state: client.address_state || "", address_zip: "", notes: client.notes || "" })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Deseja realmente excluir este cliente?")) {
      await clientsApi.delete(id)
      fetchClients()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
        <Button onClick={() => { setEditing(null); setForm({ person_type: "fisica", name: "", company_name: "", cpf_cnpj: "", email: "", phone: "", address_street: "", address_number: "", address_city: "", address_state: "", address_zip: "", notes: "" }); setShowForm(true) }} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" /> Novo Cliente
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input placeholder="Buscar clientes..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : clients.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Nenhum cliente encontrado</TableCell></TableRow>
              ) : clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Badge variant={c.person_type === "fisica" ? "info" : "secondary"}>
                      {c.person_type === "fisica" ? <User className="h-3 w-3 mr-1" /> : <Building2 className="h-3 w-3 mr-1" />}
                      {c.person_type === "fisica" ? "PF" : "PJ"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.cpf_cnpj}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell>{c.address_city}{c.address_state ? `/${c.address_state}` : ""}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.person_type} onChange={(e) => setForm({ ...form, person_type: e.target.value })}>
                  <option value="fisica">Pessoa Física</option>
                  <option value="juridica">Pessoa Jurídica</option>
                </Select>
              </div>
              <div>
                <Label>CPF/CNPJ</Label>
                <Input value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            {form.person_type === "juridica" && (
              <div>
                <Label>Razão Social</Label>
                <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              </div>
            )}
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
