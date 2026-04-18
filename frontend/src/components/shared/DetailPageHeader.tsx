import { useNavigate } from "react-router-dom"
import { ChevronRight, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Breadcrumb {
  label: string
  href?: string
}

interface DetailPageHeaderProps {
  title: string
  subtitle?: string
  breadcrumbs: Breadcrumb[]
  actions?: React.ReactNode
}

export function DetailPageHeader({ title, subtitle, breadcrumbs, actions }: DetailPageHeaderProps) {
  const navigate = useNavigate()
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 text-sm text-slate-500">
        {breadcrumbs.map((b, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            {b.href ? (
              <button onClick={() => navigate(b.href!)} className="hover:text-orange-600 hover:underline">
                {b.label}
              </button>
            ) : (
              <span className="text-slate-700 font-medium">{b.label}</span>
            )}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
    </div>
  )
}
