import { Badge } from "@/components/ui/badge"

const STATUS_CONFIGS: Record<string, { label: string; variant: "default" | "success" | "warning" | "destructive" | "secondary" | "info" }> = {
  novo: { label: "Novo", variant: "info" },
  em_contato: { label: "Em Contato", variant: "warning" },
  reuniao_agendada: { label: "Reuniao Agendada", variant: "secondary" },
  visita_tecnica: { label: "Visita Tecnica", variant: "secondary" },
  proposta_elaboracao: { label: "Proposta em Elaboracao", variant: "info" },
  proposta_enviada: { label: "Proposta Enviada", variant: "default" },
  em_negociacao: { label: "Em Negociacao", variant: "warning" },
  fechado_ganho: { label: "Fechado Ganho", variant: "success" },
  fechado_perdido: { label: "Fechado Perdido", variant: "destructive" },
  rascunho: { label: "Rascunho", variant: "secondary" },
  em_revisao: { label: "Em Revisao", variant: "info" },
  aprovada_interna: { label: "Aprovada Int.", variant: "info" },
  enviada: { label: "Enviada", variant: "warning" },
  aprovada: { label: "Aprovada", variant: "success" },
  rejeitada: { label: "Rejeitada", variant: "destructive" },
  aguardando_assinatura: { label: "Aguardando Assinatura", variant: "warning" },
  ativo: { label: "Ativo", variant: "success" },
  suspenso: { label: "Suspenso", variant: "warning" },
  concluido: { label: "Concluido", variant: "info" },
  cancelado: { label: "Cancelado", variant: "destructive" },
  encerrada: { label: "Encerrada", variant: "default" },
  pendente: { label: "Pendente", variant: "warning" },
  pago: { label: "Pago", variant: "success" },
  recebido: { label: "Recebido", variant: "success" },
  atrasado: { label: "Atrasado", variant: "destructive" },
  parcial: { label: "Parcial", variant: "info" },
  planejamento: { label: "Planejamento", variant: "info" },
  em_andamento: { label: "Em Andamento", variant: "warning" },
  pausada: { label: "Pausada", variant: "secondary" },
  concluida: { label: "Concluida", variant: "success" },
  cancelada: { label: "Cancelada", variant: "destructive" },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIGS[status]
  return (
    <Badge variant={config?.variant || "secondary"} className={className}>
      {config?.label || status}
    </Badge>
  )
}
