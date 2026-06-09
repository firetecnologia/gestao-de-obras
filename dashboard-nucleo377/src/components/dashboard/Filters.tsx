'use client';

import type { Filtros, DashboardData } from '@/types';

interface FiltersProps {
  filtros: Filtros;
  onChange: (f: Filtros) => void;
  data: DashboardData;
}

export function Filters({ filtros, onChange, data }: FiltersProps) {
  const obras = [...new Set(data.obras.map(o => o.idObra + ' - ' + o.cliente))];
  const fornecedores = [...new Set(data.comprasReais.map(c => c.fornecedor).filter(Boolean))];
  const centrosCusto = [...new Set(data.comprasReais.map(c => c.centroCusto).filter(Boolean))];
  const categorias = [...new Set(data.orcamentoMateriais.map(m => m.categoria).filter(Boolean))];
  const statuses = [...new Set([
    ...data.obras.map(o => o.status),
    ...data.comprasReais.map(c => c.status),
    ...data.orcamentoServicos.map(s => s.status),
  ].filter(Boolean))];

  const select = (field: keyof Filtros, options: string[]) => (
    <select
      value={filtros[field]}
      onChange={e => onChange({ ...filtros, [field]: e.target.value })}
      className="px-2 py-1.5 text-xs border border-gray-200 rounded-md bg-white focus:ring-1 focus:ring-[var(--color-primary-light)] focus:outline-none"
    >
      <option value="">{field === 'obra' ? 'Todas as obras' : field === 'fornecedor' ? 'Todos fornecedores' : field === 'centroCusto' ? 'Todos centros' : field === 'categoria' ? 'Todas categorias' : field === 'status' ? 'Todos status' : 'Todos'}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase">Filtros:</span>
      {select('obra', obras)}
      {select('fornecedor', fornecedores)}
      {select('centroCusto', centrosCusto)}
      {select('categoria', categorias)}
      {select('status', statuses)}
    </div>
  );
}
