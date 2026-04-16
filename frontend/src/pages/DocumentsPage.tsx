import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { documentsApi, projectsApi, clientsApi } from "@/services/api"
import { Plus, Download, Trash2, FileText } from "lucide-react"

const CATEGORY_LABELS: Record<string, string> = {
  contrato: "Contrato", projeto: "Projeto", memorial: "Memorial", nota_fiscal: "Nota Fiscal",
  laudo: "Laudo", relatorio: "Relatório", art_rrt: "ART/RRT", foto: "Foto", termo_final: "Termo Final", outro: "Outro",
}

interface Document { id: string; name: string; category: string; file_type?: string; file_size?: number; project_id?: string; project_name?: string; client_id?: string; client_name?: string; uploaded_by_name?: string; created_at?: string }
interface Project { id: string; name: string }
interface Client { id: string; name: string }

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState("")
  const [filterProject, setFilterProject] = useState("")
  const [showUpload, setShowUpload] = useState(false)
  const [uploadForm, setUploadForm] = useState({ name: "", category: "outro", project_id: "", client_id: "" })
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page_size: 50 }
      if (filterCategory) params.category = filterCategory
      if (filterProject) params.project_id = filterProject
      const [dRes, pRes, cRes] = await Promise.all([documentsApi.list(params), projectsApi.list({ page_size: 100 }), clientsApi.list({ page_size: 100 })])
      setDocuments(dRes.data.items); setProjects(pRes.data.items); setClients(cRes.data.items)
    } catch { /* empty */ } finally { setLoading(false) }
  }, [filterCategory, filterProject])

  useEffect(() => { fetchData() }, [fetchData])

  const handleUpload = async () => {
    if (!uploadFile) return
    try {
      const formData = new FormData()
      formData.append("file", uploadFile)
      formData.append("name", uploadForm.name || uploadFile.name)
      formData.append("category", uploadForm.category)
      if (uploadForm.project_id) formData.append("project_id", uploadForm.project_id)
      if (uploadForm.client_id) formData.append("client_id", uploadForm.client_id)
      await documentsApi.upload(formData)
      setShowUpload(false); setUploadFile(null); fetchData()
    } catch { /* empty */ }
  }

  const handleDownload = async (id: string, name: string) => {
    try {
      const res = await documentsApi.download(id)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement("a"); a.href = url; a.download = name; a.click()
      window.URL.revokeObjectURL(url)
    } catch { /* empty */ }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Excluir este documento?")) { await documentsApi.delete(id); fetchData() }
  }

  const formatSize = (bytes?: number) => {
    if (!bytes) return "-"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Documentos</h1>
        <Button onClick={() => { setUploadForm({ name: "", category: "outro", project_id: "", client_id: "" }); setUploadFile(null); setShowUpload(true) }} className="bg-orange-500 hover:bg-orange-600"><Plus className="h-4 w-4 mr-2" /> Upload</Button>
      </div>

      <div className="flex gap-4">
        <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-48">
          <option value="">Todas categorias</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="w-48">
          <option value="">Todas obras</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead>Obra</TableHead><TableHead>Cliente</TableHead><TableHead>Tamanho</TableHead><TableHead>Enviado por</TableHead><TableHead className="w-20">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell></TableRow>
            : documents.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Nenhum documento</TableCell></TableRow>
            : documents.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-slate-400" />{d.name}</div></TableCell>
                <TableCell><Badge variant="secondary">{CATEGORY_LABELS[d.category] || d.category}</Badge></TableCell>
                <TableCell className="text-sm">{d.project_name || "-"}</TableCell>
                <TableCell className="text-sm">{d.client_name || "-"}</TableCell>
                <TableCell className="text-sm">{formatSize(d.file_size)}</TableCell>
                <TableCell className="text-sm">{d.uploaded_by_name || "-"}</TableCell>
                <TableCell><div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleDownload(d.id, d.name)}><Download className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload de Documento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Arquivo</Label><Input type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setUploadFile(f); if (!uploadForm.name) setUploadForm({ ...uploadForm, name: f.name }) } }} /></div>
            <div><Label>Nome</Label><Input value={uploadForm.name} onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })} /></div>
            <div><Label>Categoria</Label><Select value={uploadForm.category} onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Obra</Label><Select value={uploadForm.project_id} onChange={(e) => setUploadForm({ ...uploadForm, project_id: e.target.value })}>
                <option value="">Nenhuma</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select></div>
              <div><Label>Cliente</Label><Select value={uploadForm.client_id} onChange={(e) => setUploadForm({ ...uploadForm, client_id: e.target.value })}>
                <option value="">Nenhum</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={!uploadFile} className="bg-orange-500 hover:bg-orange-600">Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
