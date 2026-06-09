'use client';

import type { DashboardData } from '@/types';
import { formatCurrency, sumBy, groupBy } from '@/lib/financial';
import { Card } from '@/components/ui/Card';

interface ExecutiveSummaryProps {
  data: DashboardData;
  obraFilter?: string;
}

export function ExecutiveSummary({ data, obraFilter }: ExecutiveSummaryProps) {
  const obras = obraFilter
    ? data.obras.filter(o => o.idObra === obraFilter || `${o.idObra} - ${o.cliente}` === obraFilter)
    : data.obras;

  if (obras.length === 0) return null;

  const obra = obras[0];
  const compras = data.comprasReais.filter(c => !obraFilter || c.idObra === obra.idObra);
  const servicos = data.orcamentoServicos.filter(s => !obraFilter || s.idObra === obra.idObra);

  const totalCompras = sumBy(compras, c => c.valorTotal);
  const fornecedoresGroup = groupBy(compras, c => c.fornecedor || 'Sem fornecedor');
  const topFornecedores = Object.entries(fornecedoresGroup)
    .map(([nome, items]) => ({ nome, total: sumBy(items, i => i.valorTotal) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  const categoriasGroup = groupBy(compras, c => c.centroCusto || 'Sem categoria');
  const topCategorias = Object.entries(categoriasGroup)
    .map(([nome, items]) => ({ nome, total: sumBy(items, i => i.valorTotal) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  const pendentes = servicos.filter(s => s.status.toLowerCase().includes('pendente'));
  const alertasCount = (obra.custoRealizado > obra.custoPrevisto ? 1 : 0)
    + (obra.lucroRealizado < obra.lucroPrevisto * 0.5 ? 1 : 0);

  const receitaPrev = obraFilter ? obra.receitaPrevista : sumBy(obras, o => o.receitaPrevista);
  const custoPrev = obraFilter ? obra.custoPrevisto : sumBy(obras, o => o.custoPrevisto);
  const custoReal = obraFilter ? obra.custoRealizado : sumBy(obras, o => o.custoRealizado);

  const nomeObra = obraFilter ? obra.cliente : `${obras.length} obra(s)`;

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-bold text-[var(--color-grafite)] flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)]" />
        Resumo Executivo
      </h3>
      <div className="text-xs leading-relaxed text-[var(--color-text)] space-y-2">
        <p>
          A obra <strong>{nomeObra}</strong> possui receita prevista de{' '}
          <strong>{formatCurrency(receitaPrev)}</strong>, custo previsto de{' '}
          <strong>{formatCurrency(custoPrev)}</strong> e custo realizado de{' '}
          <strong>{formatCurrency(custoReal)}</strong>.
        </p>
        {topCategorias.length > 0 && (
          <p>
            O maior volume de compras está concentrado em{' '}
            <strong>{topCategorias.map(c => c.nome).join(', ')}</strong>, totalizando{' '}
            <strong>{formatCurrency(totalCompras)}</strong> em compras reais.
          </p>
        )}
        {topFornecedores.length > 0 && (
          <p>
            Principais fornecedores:{' '}
            <strong>{topFornecedores.map(f => `${f.nome} (${formatCurrency(f.total)})`).join(', ')}</strong>.
          </p>
        )}
        <p>
          Existem <strong>{pendentes.length}</strong> serviço(s) pendente(s)
          {alertasCount > 0 && <> e <strong>{alertasCount}</strong> alerta(s) financeiro(s)</>}.
        </p>
        {custoReal > custoPrev && (
          <p className="text-[var(--color-danger)] font-medium">
            ⚠ A situação atual exige atenção: custos realizados acima do previsto.
          </p>
        )}
      </div>
    </Card>
  );
}
