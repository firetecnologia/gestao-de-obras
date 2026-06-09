'use client';

import type { Alerta, DashboardData } from '@/types';
import { formatCurrency } from '@/lib/financial';

export function generateAlerts(data: DashboardData): Alerta[] {
  const alerts: Alerta[] = [];

  for (const obra of data.obras) {
    if (obra.custoRealizado > obra.custoPrevisto) {
      alerts.push({
        tipo: 'erro',
        mensagem: `Custo realizado acima do previsto em ${obra.cliente}`,
        detalhe: `Previsto: ${formatCurrency(obra.custoPrevisto)} | Realizado: ${formatCurrency(obra.custoRealizado)}`,
      });
    }
    if (obra.lucroRealizado < obra.lucroPrevisto * 0.5) {
      alerts.push({
        tipo: 'aviso',
        mensagem: `Lucro realizado abaixo da meta em ${obra.cliente}`,
        detalhe: `Previsto: ${formatCurrency(obra.lucroPrevisto)} | Realizado: ${formatCurrency(obra.lucroRealizado)}`,
      });
    }
  }

  const semFornecedor = data.comprasReais.filter(c => !c.fornecedor);
  if (semFornecedor.length > 0) {
    alerts.push({
      tipo: 'aviso',
      mensagem: `${semFornecedor.length} compra(s) sem fornecedor informado`,
    });
  }

  const semCC = data.comprasReais.filter(c => !c.centroCusto);
  if (semCC.length > 0) {
    alerts.push({
      tipo: 'aviso',
      mensagem: `${semCC.length} compra(s) sem centro de custo`,
    });
  }

  const pendentes = data.orcamentoServicos.filter(s => s.status.toLowerCase().includes('pendente'));
  if (pendentes.length > 0) {
    alerts.push({
      tipo: 'info',
      mensagem: `${pendentes.length} serviço(s) pendente(s)`,
    });
  }

  const maoDeObraPendente = data.maoDeObraReal.filter(m => m.status.toLowerCase().includes('pendente'));
  if (maoDeObraPendente.length > 0) {
    alerts.push({
      tipo: 'info',
      mensagem: `${maoDeObraPendente.length} pagamento(s) de mão de obra pendente(s)`,
    });
  }

  return alerts;
}

interface AlertsProps {
  data: DashboardData;
}

export function Alerts({ data }: AlertsProps) {
  const alerts = generateAlerts(data);

  if (alerts.length === 0) return null;

  const bgMap = { erro: 'bg-red-50 border-red-200', aviso: 'bg-amber-50 border-amber-200', info: 'bg-blue-50 border-blue-200' };
  const iconMap = { erro: '🔴', aviso: '🟡', info: '🔵' };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-[var(--color-grafite)]">Alertas ({alerts.length})</h3>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {alerts.map((a, i) => (
          <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${bgMap[a.tipo]}`}>
            <span>{iconMap[a.tipo]}</span>
            <div>
              <p className="font-medium">{a.mensagem}</p>
              {a.detalhe && <p className="text-[var(--color-text-muted)] mt-0.5">{a.detalhe}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
