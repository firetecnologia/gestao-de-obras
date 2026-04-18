import { Card, CardContent } from "@/components/ui/card"

interface InfoCardProps {
  label: string
  value: string | React.ReactNode
  className?: string
}

export function InfoCard({ label, value, className }: InfoCardProps) {
  return (
    <Card className={className}>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-lg font-semibold text-slate-800 mt-1">{typeof value === "string" ? value || "-" : value}</p>
      </CardContent>
    </Card>
  )
}
