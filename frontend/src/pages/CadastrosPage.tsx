import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { catalogApi, contractTemplatesApi, sinapiApi } from "@/services/api"
import { formatBRL } from "@/lib/format"
import { useToast } from "@/components/ui/toast"

type Tab = "services" | "materials" | "compositions" | "templates" | "sinapi"

export default function CadastrosPage() {
  const [tab, setTab] = useState<Tab>("services")

  const tabs: { key: Tab; label: string }[] = [
    { key: "services", label: "Serviços" },
    { key: "materials", label: "Materiais" },
    { key: "compositions", label: "Composições" },
    { key: "templates", label: "Modelos de Contrato" },
    { key: "sinapi", label: "SINAPI" },
  ]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Cadastros</h1>
      <div className="flex gap-2 mb-6 border-b">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "services" && <ServicesTab />}
      {tab === "materials" && <MaterialsTab />}
      {tab === "compositions" && <CompositionsTab />}
      {tab === "templates" && <TemplatesTab />}
      {tab === "sinapi" && <SinapiTab />}
    </div>
  )
}

function ServicesTab() {
  const { data, isLoading } = useQuery({ queryKey: ["catalog-services"], queryFn: () => catalogApi.listServices() })
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", description: "", unit: "", cost_price: "", sale_price: "", category: "" })

  const createMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => catalogApi.createService(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["catalog-services"] }); setShowForm(false); showToast("Serviço criado") },
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => catalogApi.deleteService(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["catalog-services"] }); showToast("Serviço removido") },
  })

  const items = data?.data || []
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Catálogo de Serviços</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">+ Novo Serviço</button>
      </div>
      {showForm && (
        <div className="bg-gray-50 p-4 rounded mb-4 grid grid-cols-3 gap-3">
          <input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded px-3 py-2" />
          <input placeholder="Unidade" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="border rounded px-3 py-2" />
          <input placeholder="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="border rounded px-3 py-2" />
          <input placeholder="Preço Custo" type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} className="border rounded px-3 py-2" />
          <input placeholder="Preço Venda" type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} className="border rounded px-3 py-2" />
          <input placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border rounded px-3 py-2" />
          <button onClick={() => createMut.mutate({ ...form, cost_price: Number(form.cost_price) || 0, sale_price: Number(form.sale_price) || 0 })} className="px-4 py-2 bg-green-600 text-white rounded">Salvar</button>
        </div>
      )}
      {isLoading ? <p>Carregando...</p> : (
        <table className="w-full border-collapse">
          <thead><tr className="bg-gray-100"><th className="p-2 text-left">Nome</th><th className="p-2 text-left">Unidade</th><th className="p-2 text-left">Categoria</th><th className="p-2 text-right">Custo</th><th className="p-2 text-right">Venda</th><th className="p-2"></th></tr></thead>
          <tbody>
            {items.map((s: Record<string, unknown>) => (
              <tr key={s.id as string} className="border-b hover:bg-gray-50">
                <td className="p-2">{s.name as string}</td>
                <td className="p-2">{s.unit as string}</td>
                <td className="p-2">{s.category as string}</td>
                <td className="p-2 text-right">{formatBRL(s.cost_price as number)}</td>
                <td className="p-2 text-right">{formatBRL(s.sale_price as number)}</td>
                <td className="p-2 text-right"><button onClick={(e) => { e.stopPropagation(); deleteMut.mutate(s.id as string) }} className="text-red-600 hover:underline text-sm">Excluir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function MaterialsTab() {
  const { data, isLoading } = useQuery({ queryKey: ["catalog-materials"], queryFn: () => catalogApi.listMaterials() })
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", description: "", unit: "", cost_price: "", sale_price: "", category: "", brand: "" })

  const createMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => catalogApi.createMaterial(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["catalog-materials"] }); setShowForm(false); showToast("Material criado") },
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => catalogApi.deleteMaterial(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["catalog-materials"] }); showToast("Material removido") },
  })

  const items = data?.data || []
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Catálogo de Materiais</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">+ Novo Material</button>
      </div>
      {showForm && (
        <div className="bg-gray-50 p-4 rounded mb-4 grid grid-cols-3 gap-3">
          <input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded px-3 py-2" />
          <input placeholder="Unidade" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="border rounded px-3 py-2" />
          <input placeholder="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="border rounded px-3 py-2" />
          <input placeholder="Marca" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="border rounded px-3 py-2" />
          <input placeholder="Preço Custo" type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} className="border rounded px-3 py-2" />
          <input placeholder="Preço Venda" type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} className="border rounded px-3 py-2" />
          <input placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border rounded px-3 py-2" />
          <button onClick={() => createMut.mutate({ ...form, cost_price: Number(form.cost_price) || 0, sale_price: Number(form.sale_price) || 0 })} className="px-4 py-2 bg-green-600 text-white rounded">Salvar</button>
        </div>
      )}
      {isLoading ? <p>Carregando...</p> : (
        <table className="w-full border-collapse">
          <thead><tr className="bg-gray-100"><th className="p-2 text-left">Nome</th><th className="p-2 text-left">Unidade</th><th className="p-2 text-left">Marca</th><th className="p-2 text-right">Custo</th><th className="p-2 text-right">Venda</th><th className="p-2"></th></tr></thead>
          <tbody>
            {items.map((m: Record<string, unknown>) => (
              <tr key={m.id as string} className="border-b hover:bg-gray-50">
                <td className="p-2">{m.name as string}</td>
                <td className="p-2">{m.unit as string}</td>
                <td className="p-2">{(m.brand as string) || "-"}</td>
                <td className="p-2 text-right">{formatBRL(m.cost_price as number)}</td>
                <td className="p-2 text-right">{formatBRL(m.sale_price as number)}</td>
                <td className="p-2 text-right"><button onClick={(e) => { e.stopPropagation(); deleteMut.mutate(m.id as string) }} className="text-red-600 hover:underline text-sm">Excluir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function CompositionsTab() {
  const { data, isLoading } = useQuery({ queryKey: ["catalog-compositions"], queryFn: () => catalogApi.listCompositions() })
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", description: "", unit: "", category: "" })

  const createMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => catalogApi.createComposition(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["catalog-compositions"] }); setShowForm(false); showToast("Composição criada") },
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => catalogApi.deleteComposition(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["catalog-compositions"] }); showToast("Composição removida") },
  })

  const items = data?.data || []
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Composições</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">+ Nova Composição</button>
      </div>
      {showForm && (
        <div className="bg-gray-50 p-4 rounded mb-4 grid grid-cols-3 gap-3">
          <input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded px-3 py-2" />
          <input placeholder="Unidade" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="border rounded px-3 py-2" />
          <input placeholder="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="border rounded px-3 py-2" />
          <input placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border rounded px-3 py-2" />
          <button onClick={() => createMut.mutate(form)} className="px-4 py-2 bg-green-600 text-white rounded">Salvar</button>
        </div>
      )}
      {isLoading ? <p>Carregando...</p> : (
        <table className="w-full border-collapse">
          <thead><tr className="bg-gray-100"><th className="p-2 text-left">Nome</th><th className="p-2 text-left">Unidade</th><th className="p-2 text-left">Categoria</th><th className="p-2 text-left">Descrição</th><th className="p-2"></th></tr></thead>
          <tbody>
            {items.map((c: Record<string, unknown>) => (
              <tr key={c.id as string} className="border-b hover:bg-gray-50">
                <td className="p-2">{c.name as string}</td>
                <td className="p-2">{c.unit as string}</td>
                <td className="p-2">{(c.category as string) || "-"}</td>
                <td className="p-2">{(c.description as string) || "-"}</td>
                <td className="p-2 text-right"><button onClick={(e) => { e.stopPropagation(); deleteMut.mutate(c.id as string) }} className="text-red-600 hover:underline text-sm">Excluir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function TemplatesTab() {
  const { data, isLoading } = useQuery({ queryKey: ["contract-templates"], queryFn: () => contractTemplatesApi.list() })
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", description: "", content: "" })

  const createMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => contractTemplatesApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contract-templates"] }); setShowForm(false); showToast("Modelo criado") },
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => contractTemplatesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contract-templates"] }); showToast("Modelo removido") },
  })

  const items = data?.data || []
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Modelos de Contrato</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">+ Novo Modelo</button>
      </div>
      {showForm && (
        <div className="bg-gray-50 p-4 rounded mb-4 space-y-3">
          <input placeholder="Nome do modelo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded px-3 py-2 w-full" />
          <input placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="border rounded px-3 py-2 w-full" />
          <textarea placeholder="Conteúdo do contrato (use {{cliente_nome}}, {{valor_total}}, etc.)" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="border rounded px-3 py-2 w-full h-40" />
          <p className="text-xs text-gray-500">Placeholders: {"{{cliente_nome}}, {{cliente_cpf_cnpj}}, {{cliente_endereco}}, {{obra_endereco}}, {{valor_total}}, {{entrada}}, {{saldo}}, {{prazo}}, {{escopo}}"}</p>
          <button onClick={() => createMut.mutate(form)} className="px-4 py-2 bg-green-600 text-white rounded">Salvar</button>
        </div>
      )}
      {isLoading ? <p>Carregando...</p> : (
        <table className="w-full border-collapse">
          <thead><tr className="bg-gray-100"><th className="p-2 text-left">Nome</th><th className="p-2 text-left">Descrição</th><th className="p-2"></th></tr></thead>
          <tbody>
            {items.map((t: Record<string, unknown>) => (
              <tr key={t.id as string} className="border-b hover:bg-gray-50">
                <td className="p-2 font-medium">{t.name as string}</td>
                <td className="p-2 text-gray-600">{(t.description as string) || "-"}</td>
                <td className="p-2 text-right"><button onClick={(e) => { e.stopPropagation(); deleteMut.mutate(t.id as string) }} className="text-red-600 hover:underline text-sm">Excluir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function SinapiTab() {
  const { data: sourcesData, isLoading } = useQuery({ queryKey: ["sinapi-sources"], queryFn: () => sinapiApi.listSources() })
  const [search, setSearch] = useState("")
  const { data: itemsData } = useQuery({ queryKey: ["sinapi-items", search], queryFn: () => sinapiApi.searchItems({ search, limit: 50 }), enabled: search.length > 2 })
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", reference_date: "", url: "" })

  const createMut = useMutation({
    mutationFn: (d: Record<string, unknown>) => sinapiApi.createSource(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sinapi-sources"] }); setShowForm(false); showToast("Fonte criada") },
  })

  const sources = sourcesData?.data || []
  const items = itemsData?.data || []

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">SINAPI - Fontes e Itens</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">+ Nova Fonte</button>
      </div>
      {showForm && (
        <div className="bg-gray-50 p-4 rounded mb-4 grid grid-cols-3 gap-3">
          <input placeholder="Nome da fonte" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded px-3 py-2" />
          <input placeholder="Data referência (ex: 01/2025)" value={form.reference_date} onChange={(e) => setForm({ ...form, reference_date: e.target.value })} className="border rounded px-3 py-2" />
          <input placeholder="URL (opcional)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="border rounded px-3 py-2" />
          <button onClick={() => createMut.mutate(form)} className="px-4 py-2 bg-green-600 text-white rounded">Salvar</button>
        </div>
      )}
      {isLoading ? <p>Carregando...</p> : (
        <div className="mb-6">
          <h3 className="font-medium mb-2">Fontes cadastradas ({sources.length})</h3>
          {sources.length === 0 ? <p className="text-gray-500 text-sm">Nenhuma fonte cadastrada</p> : (
            <div className="space-y-2">
              {sources.map((s: Record<string, unknown>) => (
                <div key={s.id as string} className="flex items-center justify-between bg-white border rounded p-3">
                  <div><span className="font-medium">{s.name as string}</span> <span className="text-gray-500 text-sm ml-2">{s.reference_date as string}</span></div>
                  <span className="text-sm text-gray-400">{(s.item_count as number) || 0} itens</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div>
        <h3 className="font-medium mb-2">Buscar itens SINAPI</h3>
        <input placeholder="Buscar por código ou descrição (mín. 3 caracteres)" value={search} onChange={(e) => setSearch(e.target.value)} className="border rounded px-3 py-2 w-full mb-3" />
        {items.length > 0 && (
          <table className="w-full border-collapse">
            <thead><tr className="bg-gray-100"><th className="p-2 text-left">Código</th><th className="p-2 text-left">Descrição</th><th className="p-2 text-left">Unidade</th><th className="p-2 text-right">Custo Unit.</th></tr></thead>
            <tbody>
              {items.map((i: Record<string, unknown>) => (
                <tr key={i.id as string} className="border-b hover:bg-gray-50">
                  <td className="p-2 font-mono text-sm">{i.code as string}</td>
                  <td className="p-2 text-sm">{i.description as string}</td>
                  <td className="p-2">{i.unit as string}</td>
                  <td className="p-2 text-right">{formatBRL(i.unit_cost as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
