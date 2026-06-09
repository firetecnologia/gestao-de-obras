'use client';

import type { DashboardData } from '@/types';
import { formatCurrency, topN, groupBy, sumBy } from '@/lib/financial';
import { Card } from '@/components/ui/Card';

interface TablesProps {
  data: DashboardData;
}

function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100">
            {headers.map((h, i) => (
              <th key={i} className="text-left py-2 px-2 font-semibold text-[var(--color-text-muted)] uppercase text-[10px]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
              {row.map((cell, j) => (
                <td key={j} className="py-1.5 px-2">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UltimasComprasTable({ data }: TablesProps) {
  const sorted = [...data.comprasReais].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 8);
  return (
    <Card>
      <h4 className="text-xs font-semibold text-[var(--color-grafite)] mb-3">Últimas Compras</h4>
      <Table
        headers={['Data', 'Material', 'Fornecedor', 'Valor']}
        rows={sorted.map(c => [c.data, c.material, c.fornecedor || '-', formatCurrency(c.valorTotal)])}
      />
    </Card>
  );
}

export function MaioresComprasTable({ data }: TablesProps) {
  const top = topN(data.comprasReais, 8, c => c.valorTotal);
  return (
    <Card>
      <h4 className="text-xs font-semibold text-[var(--color-grafite)] mb-3">Maiores Compras</h4>
      <Table
        headers={['Material', 'Fornecedor', 'Qtd', 'Valor Total']}
        rows={top.map(c => [c.material, c.fornecedor || '-', String(c.quantidade), formatCurrency(c.valorTotal)])}
      />
    </Card>
  );
}

export function ServicosPendentesTable({ data }: TablesProps) {
  const pendentes = data.orcamentoServicos.filter(s => s.status.toLowerCase().includes('pendente')).slice(0, 8);
  return (
    <Card>
      <h4 className="text-xs font-semibold text-[var(--color-grafite)] mb-3">Serviços Pendentes</h4>
      {pendentes.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)]">Nenhum serviço pendente.</p>
      ) : (
        <Table
          headers={['Serviço', 'Ambiente', 'Etapa', 'Custo']}
          rows={pendentes.map(s => [s.servico, s.ambiente, s.etapa, formatCurrency(s.custoTotal)])}
        />
      )}
    </Card>
  );
}

export function ItensAcimaPrevistoTable({ data }: TablesProps) {
  // Compare real purchase prices to budget
  const items: { material: string; previsto: number; realizado: number; desvio: number }[] = [];

  const comprasGrouped = groupBy(data.comprasReais, c => c.material);
  for (const mat of data.orcamentoMateriais) {
    const compras = comprasGrouped[mat.material];
    if (compras) {
      const totalReal = sumBy(compras, c => c.valorTotal);
      if (totalReal > mat.custoTotal) {
        items.push({ material: mat.material, previsto: mat.custoTotal, realizado: totalReal, desvio: totalReal - mat.custoTotal });
      }
    }
  }

  const sorted = items.sort((a, b) => b.desvio - a.desvio).slice(0, 8);

  return (
    <Card>
      <h4 className="text-xs font-semibold text-[var(--color-grafite)] mb-3">Itens com Custo Real &gt; Previsto</h4>
      {sorted.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)]">Todos os itens estão dentro do orçamento.</p>
      ) : (
        <Table
          headers={['Material', 'Previsto', 'Real', 'Desvio']}
          rows={sorted.map(i => [i.material, formatCurrency(i.previsto), formatCurrency(i.realizado), formatCurrency(i.desvio)])}
        />
      )}
    </Card>
  );
}

export function FornecedoresMaisUsadosTable({ data }: TablesProps) {
  const grouped = groupBy(data.comprasReais, c => c.fornecedor || 'Sem fornecedor');
  const ranked = Object.entries(grouped)
    .map(([nome, items]) => ({ nome, compras: items.length, total: sumBy(items, i => i.valorTotal) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return (
    <Card>
      <h4 className="text-xs font-semibold text-[var(--color-grafite)] mb-3">Fornecedores Mais Utilizados</h4>
      <Table
        headers={['Fornecedor', 'Nº Compras', 'Total']}
        rows={ranked.map(f => [f.nome, String(f.compras), formatCurrency(f.total)])}
      />
    </Card>
  );
}
