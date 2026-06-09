'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
} from 'recharts';
import type { DashboardData } from '@/types';
import { formatCurrency, sumBy, groupBy } from '@/lib/financial';
import { Card } from '@/components/ui/Card';

const COLORS = ['#1a5276', '#2980b9', '#27ae60', '#f39c12', '#e74c3c', '#8e44ad', '#16a085', '#d35400'];

function ChartTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-xs font-semibold text-[var(--color-grafite)] mb-3">{children}</h4>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const currencyFormatter = (v: any) => {
  if (typeof v === 'number') return formatCurrency(v);
  return String(v ?? '');
};

interface ChartsProps {
  data: DashboardData;
}

export function ReceitaCustoChart({ data }: ChartsProps) {
  const chartData = data.obras.map(o => ({
    name: o.cliente,
    'Receita Prevista': o.receitaPrevista,
    'Receita Realizada': o.receitaRealizada,
    'Custo Previsto': o.custoPrevisto,
    'Custo Realizado': o.custoRealizado,
  }));

  return (
    <Card>
      <ChartTitle>Receita e Custo: Previsto × Realizado</ChartTitle>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={currencyFormatter} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Receita Prevista" fill="#1a5276" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Receita Realizada" fill="#2980b9" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Custo Previsto" fill="#e74c3c" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Custo Realizado" fill="#f39c12" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function LucroChart({ data }: ChartsProps) {
  const chartData = data.obras.map(o => ({
    name: o.cliente,
    'Lucro Previsto': o.lucroPrevisto,
    'Lucro Realizado': o.lucroRealizado,
  }));

  return (
    <Card>
      <ChartTitle>Lucro: Previsto × Realizado</ChartTitle>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={currencyFormatter} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Lucro Previsto" fill="#27ae60" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Lucro Realizado" fill="#16a085" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function MateriaisComprasChart({ data }: ChartsProps) {
  const categoriasOrc = groupBy(data.orcamentoMateriais, m => m.categoria);
  const categoriasCompras = groupBy(data.comprasReais, c => c.centroCusto || 'Outros');

  const allCats = [...new Set([...Object.keys(categoriasOrc), ...Object.keys(categoriasCompras)])];
  const chartData = allCats.map(cat => ({
    name: cat,
    Previsto: sumBy(categoriasOrc[cat] || [], m => m.custoTotal),
    'Compras Reais': sumBy(categoriasCompras[cat] || [], c => c.valorTotal),
  }));

  return (
    <Card>
      <ChartTitle>Materiais Previstos × Compras Reais por Categoria</ChartTitle>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={currencyFormatter} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Previsto" fill="#1a5276" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Compras Reais" fill="#f39c12" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function ComprasPorCentroCustoChart({ data }: ChartsProps) {
  const grouped = groupBy(data.comprasReais, c => c.centroCusto || 'Sem CC');
  const chartData = Object.entries(grouped).map(([name, items]) => ({
    name,
    value: sumBy(items, i => i.valorTotal),
  }));

  return (
    <Card>
      <ChartTitle>Compras Reais por Centro de Custo</ChartTitle>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
            {chartData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={currencyFormatter} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function ServicosPorAmbienteChart({ data }: ChartsProps) {
  const grouped = groupBy(data.orcamentoServicos, s => s.ambiente);
  const chartData = Object.entries(grouped).map(([name, items]) => ({
    name,
    value: sumBy(items, i => i.custoTotal),
  }));

  return (
    <Card>
      <ChartTitle>Serviços por Ambiente</ChartTitle>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
            {chartData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={currencyFormatter} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function RankingFornecedoresChart({ data }: ChartsProps) {
  const grouped = groupBy(data.comprasReais, c => c.fornecedor || 'Sem fornecedor');
  const chartData = Object.entries(grouped)
    .map(([name, items]) => ({ name, total: sumBy(items, i => i.valorTotal) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return (
    <Card>
      <ChartTitle>Ranking de Fornecedores (por valor)</ChartTitle>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
          <Tooltip formatter={currencyFormatter} />
          <Bar dataKey="total" fill="#2980b9" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function EvolucaoComprasChart({ data }: ChartsProps) {
  const sorted = [...data.comprasReais].sort((a, b) => a.data.localeCompare(b.data));
  let accumulated = 0;
  const chartData = sorted.map(c => {
    accumulated += c.valorTotal;
    return { data: c.data, acumulado: accumulated };
  });

  return (
    <Card>
      <ChartTitle>Evolução de Compras (acumulado)</ChartTitle>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="data" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={currencyFormatter} />
          <Line type="monotone" dataKey="acumulado" stroke="#1a5276" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function MedicoesPorStatusChart({ data }: ChartsProps) {
  const grouped = groupBy(data.medicoes, m => m.status);
  const chartData = Object.entries(grouped).map(([name, items]) => ({
    name,
    value: items.length,
  }));

  return (
    <Card>
      <ChartTitle>Medições por Status</ChartTitle>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
            {chartData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
