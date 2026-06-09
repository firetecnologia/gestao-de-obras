'use client';

import { useState, useMemo } from 'react';
import type { DashboardData, SearchResult } from '@/types';
import { formatCurrency } from '@/lib/financial';

interface SearchProps {
  data: DashboardData;
}

export function Search({ data }: SearchProps) {
  const [query, setQuery] = useState('');

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim() || query.length < 2) return [];
    const q = query.toLowerCase();
    const items: SearchResult[] = [];

    data.comprasReais.forEach(c => {
      if (c.material.toLowerCase().includes(q) || c.fornecedor.toLowerCase().includes(q)) {
        items.push({ tipo: 'compra', titulo: c.material, detalhe: `${c.fornecedor} | ${c.data}`, valor: c.valorTotal });
      }
    });

    data.orcamentoMateriais.forEach(m => {
      if (m.material.toLowerCase().includes(q) || m.categoria.toLowerCase().includes(q)) {
        items.push({ tipo: 'material', titulo: m.material, detalhe: `${m.categoria} | ${m.unidade}`, valor: m.custoTotal });
      }
    });

    data.orcamentoServicos.forEach(s => {
      if (s.servico.toLowerCase().includes(q) || s.ambiente.toLowerCase().includes(q)) {
        items.push({ tipo: 'servico', titulo: s.servico, detalhe: `${s.ambiente} | ${s.etapa}`, valor: s.custoTotal });
      }
    });

    data.medicoes.forEach(m => {
      if (m.servico.toLowerCase().includes(q)) {
        items.push({ tipo: 'medicao', titulo: m.servico, detalhe: `${m.medicao} | ${m.status}`, valor: m.valorMedido });
      }
    });

    return items.slice(0, 20);
  }, [query, data]);

  const grouped = useMemo(() => {
    const g: Record<string, SearchResult[]> = {};
    results.forEach(r => {
      if (!g[r.tipo]) g[r.tipo] = [];
      g[r.tipo].push(r);
    });
    return g;
  }, [results]);

  const typeLabels: Record<string, string> = {
    compra: 'Compras',
    material: 'Materiais Previstos',
    servico: 'Serviços',
    fornecedor: 'Fornecedores',
    medicao: 'Medições',
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Busque por material, fornecedor, serviço, centro de custo ou obra..."
        className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-light)] focus:border-transparent"
      />
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 max-h-80 overflow-y-auto z-40">
          {Object.entries(grouped).map(([tipo, items]) => (
            <div key={tipo} className="p-3 border-b border-gray-50 last:border-0">
              <h4 className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)] mb-1.5">
                {typeLabels[tipo] || tipo}
              </h4>
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1 text-xs">
                  <div>
                    <span className="font-medium">{item.titulo}</span>
                    <span className="text-[var(--color-text-muted)] ml-2">{item.detalhe}</span>
                  </div>
                  {item.valor !== undefined && (
                    <span className="font-semibold text-[var(--color-primary)]">
                      {formatCurrency(item.valor)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
