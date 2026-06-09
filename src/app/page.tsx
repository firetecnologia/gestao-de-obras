'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { DashboardData, Filtros, ConnectionStatus } from '@/types';
import { MOCK_DATA } from '@/lib/mockData';
import { formatCurrency, calcularMargem, calcularDesvioCusto, sumBy } from '@/lib/financial';
import { Header } from '@/components/dashboard/Header';
import { Filters } from '@/components/dashboard/Filters';
import { Alerts } from '@/components/dashboard/Alerts';
import { Search } from '@/components/dashboard/Search';
import { ExecutiveSummary } from '@/components/dashboard/ExecutiveSummary';
import { KPICard } from '@/components/ui/Card';
import { CardSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import {
  ReceitaCustoChart,
  LucroChart,
  MateriaisComprasChart,
  ComprasPorCentroCustoChart,
  ServicosPorAmbienteChart,
  RankingFornecedoresChart,
  EvolucaoComprasChart,
  MedicoesPorStatusChart,
} from '@/components/charts/DashboardCharts';
import {
  UltimasComprasTable,
  MaioresComprasTable,
  ServicosPendentesTable,
  ItensAcimaPrevistoTable,
  FornecedoresMaisUsadosTable,
} from '@/components/tables/DashboardTables';

const STORAGE_KEY = 'dashboard-obras-link';
const REFRESH_INTERVAL = 30000;

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(MOCK_DATA);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [currentLink, setCurrentLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>({ obra: '', periodo: '', fornecedor: '', centroCusto: '', categoria: '', status: '' });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load saved link
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setCurrentLink(saved);
  }, []);

  const fetchData = useCallback(async (link: string) => {
    setLoading(true);
    setError(null);
    setStatus('connecting');

    try {
      const res = await fetch(`/api/sheets?link=${encodeURIComponent(link)}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Erro desconhecido ao conectar.');
        setStatus('error');
        return;
      }

      setData({ ...json, connected: true });
      setStatus('connected');
      setLastUpdated(json.lastUpdated);
      localStorage.setItem(STORAGE_KEY, link);
      setCurrentLink(link);
    } catch {
      setError('Erro de rede. Verifique sua conexão.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleConnect = useCallback((link: string) => {
    fetchData(link);
    // Set auto-refresh
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => fetchData(link), REFRESH_INTERVAL);
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    if (currentLink) fetchData(currentLink);
  }, [currentLink, fetchData]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Apply filters
  const filteredData: DashboardData = {
    ...data,
    comprasReais: data.comprasReais.filter(c => {
      if (filtros.obra && !`${c.idObra}`.includes(filtros.obra.split(' - ')[0])) return false;
      if (filtros.fornecedor && c.fornecedor !== filtros.fornecedor) return false;
      if (filtros.centroCusto && c.centroCusto !== filtros.centroCusto) return false;
      if (filtros.status && c.status !== filtros.status) return false;
      return true;
    }),
    orcamentoMateriais: data.orcamentoMateriais.filter(m => {
      if (filtros.obra && !`${m.idObra}`.includes(filtros.obra.split(' - ')[0])) return false;
      if (filtros.categoria && m.categoria !== filtros.categoria) return false;
      return true;
    }),
    orcamentoServicos: data.orcamentoServicos.filter(s => {
      if (filtros.obra && !`${s.idObra}`.includes(filtros.obra.split(' - ')[0])) return false;
      if (filtros.status && s.status !== filtros.status) return false;
      return true;
    }),
    obras: data.obras.filter(o => {
      if (filtros.obra && !`${o.idObra} - ${o.cliente}`.includes(filtros.obra)) return false;
      if (filtros.status && o.status !== filtros.status) return false;
      return true;
    }),
  };

  // KPI calculations
  const totalReceitaPrev = sumBy(filteredData.obras, o => o.receitaPrevista);
  const totalReceitaReal = sumBy(filteredData.obras, o => o.receitaRealizada);
  const totalCustoPrev = sumBy(filteredData.obras, o => o.custoPrevisto);
  const totalCustoReal = sumBy(filteredData.obras, o => o.custoRealizado);
  const totalLucroPrev = sumBy(filteredData.obras, o => o.lucroPrevisto);
  const totalLucroReal = sumBy(filteredData.obras, o => o.lucroRealizado);
  const margemPrev = calcularMargem(totalReceitaPrev, totalCustoPrev);
  const margemReal = calcularMargem(totalReceitaReal, totalCustoReal);
  const desvioCusto = calcularDesvioCusto(totalCustoPrev, totalCustoReal);

  const statusObra = filteredData.obras.length > 0
    ? filteredData.obras.every(o => o.status.toLowerCase().includes('conclu')) ? 'Concluído' : 'Em andamento'
    : 'Sem dados';

  if (loading && !data.connected) {
    return (
      <div className="min-h-screen">
        <Header onConnect={handleConnect} onRefresh={handleRefresh} connectionStatus={status} lastUpdated={lastUpdated} currentLink={currentLink} />
        <main className="max-w-[1600px] mx-auto p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <ChartSkeleton key={i} />)}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header onConnect={handleConnect} onRefresh={handleRefresh} connectionStatus={status} lastUpdated={lastUpdated} currentLink={currentLink} />

      <main className="max-w-[1600px] mx-auto p-4 space-y-5">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Data errors from sheets */}
        {data.errors.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
            <strong>Avisos:</strong> {data.errors.join(' | ')}
          </div>
        )}

        {/* Search + Filters */}
        <div className="flex flex-col md:flex-row gap-3 items-start">
          <div className="flex-1 w-full">
            <Search data={filteredData} />
          </div>
        </div>
        <Filters filtros={filtros} onChange={setFiltros} data={data} />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <KPICard label="Receita Prevista" value={formatCurrency(totalReceitaPrev)} color="default" />
          <KPICard label="Receita Realizada" value={formatCurrency(totalReceitaReal)} sublabel={`${((totalReceitaReal / (totalReceitaPrev || 1)) * 100).toFixed(0)}% do previsto`} color="default" />
          <KPICard label="Custo Previsto" value={formatCurrency(totalCustoPrev)} color="danger" />
          <KPICard label="Custo Realizado" value={formatCurrency(totalCustoReal)} sublabel={desvioCusto > 0 ? `+${desvioCusto.toFixed(1)}% acima` : `${desvioCusto.toFixed(1)}% abaixo`} trend={desvioCusto > 0 ? 'down' : 'up'} color={desvioCusto > 0 ? 'danger' : 'success'} />
          <KPICard label="Lucro Previsto" value={formatCurrency(totalLucroPrev)} color="success" />
          <KPICard label="Lucro Realizado" value={formatCurrency(totalLucroReal)} trend={totalLucroReal >= totalLucroPrev ? 'up' : 'down'} color={totalLucroReal >= totalLucroPrev ? 'success' : 'warning'} />
          <KPICard label="Margem Prevista" value={`${margemPrev.toFixed(1)}%`} color="gold" />
          <KPICard label="Margem Realizada" value={`${margemReal.toFixed(1)}%`} trend={margemReal >= margemPrev ? 'up' : 'down'} color={margemReal >= margemPrev ? 'success' : 'warning'} />
          <KPICard label="Desvio de Custo" value={`${desvioCusto > 0 ? '+' : ''}${desvioCusto.toFixed(1)}%`} color={desvioCusto > 0 ? 'danger' : 'success'} />
          <KPICard label="Status" value={statusObra} color={statusObra === 'Concluído' ? 'success' : 'default'} />
        </div>

        {/* Alerts */}
        <Alerts data={filteredData} />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ReceitaCustoChart data={filteredData} />
          <LucroChart data={filteredData} />
          <MateriaisComprasChart data={filteredData} />
          <ComprasPorCentroCustoChart data={filteredData} />
          <ServicosPorAmbienteChart data={filteredData} />
          <RankingFornecedoresChart data={filteredData} />
          <EvolucaoComprasChart data={filteredData} />
          <MedicoesPorStatusChart data={filteredData} />
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <UltimasComprasTable data={filteredData} />
          <MaioresComprasTable data={filteredData} />
          <ServicosPendentesTable data={filteredData} />
          <ItensAcimaPrevistoTable data={filteredData} />
          <FornecedoresMaisUsadosTable data={filteredData} />
        </div>

        {/* Executive Summary */}
        <ExecutiveSummary data={filteredData} obraFilter={filtros.obra || undefined} />

        {/* Footer info */}
        {!data.connected && (
          <div className="text-center py-6 text-xs text-[var(--color-text-muted)]">
            <p>Dados de demonstração. Cole o link de uma planilha Google Sheets acima para carregar dados reais.</p>
          </div>
        )}
      </main>
    </div>
  );
}
