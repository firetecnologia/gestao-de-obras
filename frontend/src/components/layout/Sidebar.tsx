import { Link, useLocation } from "react-router-dom"
import {
  LayoutDashboard, Users, Building2, Truck,
  Target, FileText, FileSignature, Calendar,
  ShoppingCart, BookOpen, DollarSign, FileArchive,
  ChevronLeft, ChevronRight, LogOut, HardHat
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import { useState } from "react"

const menuItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/leads", label: "CRM / Leads", icon: Target },
  { path: "/clients", label: "Clientes", icon: Building2 },
  { path: "/proposals", label: "Propostas", icon: FileText },
  { path: "/contracts", label: "Contratos", icon: FileSignature },
  { path: "/projects", label: "Obras", icon: HardHat },
  { path: "/planning", label: "Planejamento", icon: Calendar },
  { path: "/purchases", label: "Compras", icon: ShoppingCart },
  { path: "/diary", label: "Diário de Obra", icon: BookOpen },
  { path: "/financial", label: "Financeiro", icon: DollarSign },
  { path: "/documents", label: "Documentos", icon: FileArchive },
  { path: "/suppliers", label: "Fornecedores", icon: Truck },
  { path: "/users", label: "Usuários", icon: Users },
]

export function Sidebar() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={cn(
      "flex flex-col bg-slate-900 text-white transition-all duration-300 h-screen sticky top-0",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <HardHat className="h-6 w-6 text-orange-400" />
            <span className="font-bold text-lg">Gestão Obras</span>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-slate-700">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {menuItems.map((item) => {
          const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                isActive ? "bg-slate-700 text-orange-400 border-r-2 border-orange-400" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-slate-700 p-4">
        {!collapsed && user && (
          <div className="text-xs text-slate-400 mb-2 truncate">{user.name}</div>
        )}
        <button onClick={logout} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white" title="Sair">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  )
}
