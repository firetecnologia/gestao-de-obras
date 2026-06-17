'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DashboardData, Filtros } from '@/types';
import { MOCK_DATA } from '@/lib/mockData';
import { formatCurrency, calcularMargem, calcularDesvioCusto, sumBy } from '@/lib/financial';
import { Filters } from '@/components/dashboard/Filters';
import { Alerts } from '@/components/dashboard/Alerts';
import { Search } from '@/components/dashboard/Search';
import { ExecutiveSummary } from '@/components/dashboard/ExecutiveSummary';
import { KPICard } from '@/components/ui/Card';
import { CardSkeleton, ChartSkeleton } from '@/components/ui/Skeleton';
import { ObraManager } from '@/components/dashboard/ObraManager';
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

interface ObraFileEntry {
  id: number;
  nome: string;
  arquivo_original: string;
  tamanho: number;
  data_upload: string;
  ultima_atualizacao: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(MOCK_DATA);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>({ obra: '', periodo: '', fornecedor: '', centroCusto: '', categoria: '', status: '' });
  const [obrasList, setObrasList] = useState<ObraFileEntry[]>([]);
  const [selectedObraId, setSelectedObraId] = useState<number | null>(null);
  const [obrasLoading, setObrasLoading] = useState(true);
  const [obraNome, setObraNome] = useState<string | null>(null);

  // Load obras list from database
  const fetchObrasList = useCallback(async () => {
    try {
      setObrasLoading(true);
      const res = await fetch('/api/obras');
      const json = await res.json();
      if (res.ok) {
        setObrasList(json.obras || []);
      }
    } catch {
      // silently fail
    } finally {
      setObrasLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchObrasList();
  }, [fetchObrasList]);

  // Load obra data when selected
  const loadObraData = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    setSelectedObraId(id);

    try {
      const res = await fetch(`/api/obras/${id}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Erro ao carregar dados da obra.');
        return;
      }

      setData({ ...json, connected: true });
      setLastUpdated(json.lastUpdated);
      setObraNome(json.obraNome || null);
    } catch {
      setError('Erro de rede ao carregar dados da obra.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Upload new obra
  const handleUpload = useCallback(async (file: File, nome: string) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (nome) formData.append('nome', nome);

      const res = await fetch('/api/obras', { method: 'POST', body: formData });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Erro ao enviar arquivo.');
        return;
      }

      // Refresh list and select the new obra
      await fetchObrasList();
      if (json.obra?.id) {
        loadObraData(json.obra.id);
      }
    } catch {
      setError('Erro de rede ao enviar arquivo.');
    } finally {
      setLoading(false);
    }
  }, [fetchObrasList, loadObraData]);

  // Update obra file
  const handleUpdate = useCallback(async (id: number, file: File) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/obras/${id}`, { method: 'PUT', body: formData });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Erro ao atualizar arquivo.');
        return;
      }

      await fetchObrasList();
      if (selectedObraId === id) {
        loadObraData(id);
      }
    } catch {
      setError('Erro de rede ao atualizar arquivo.');
    } finally {
      setLoading(false);
    }
  }, [fetchObrasList, loadObraData, selectedObraId]);

  // Delete obra
  const handleDelete = useCallback(async (id: number) => {
    if (!confirm('Tem certeza que deseja remover esta obra?')) return;

    try {
      const res = await fetch(`/api/obras/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchObrasList();
        if (selectedObraId === id) {
          setSelectedObraId(null);
          setData(MOCK_DATA);
          setObraNome(null);
        }
      }
    } catch {
      setError('Erro ao remover obra.');
    }
  }, [fetchObrasList, selectedObraId]);

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
    maoDeObraReal: data.maoDeObraReal.filter(m => {
      if (filtros.obra && !`${m.idObra}`.includes(filtros.obra.split(' - ')[0])) return false;
      if (filtros.status && m.status !== filtros.status) return false;
      return true;
    }),
    medicoes: data.medicoes.filter(m => {
      if (filtros.obra && !`${m.idObra}`.includes(filtros.obra.split(' - ')[0])) return false;
      if (filtros.status && m.status !== filtros.status) return false;
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

  return (
    <div className="min-h-screen">
      {/* Simplified Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
                <span className="text-white font-bold text-sm">N3</span>
              </div>
              <div>
                <h1 className="text-base font-bold text-[var(--color-grafite)] leading-tight">
                  Dashboard de Obras
                </h1>
                <p className="text-[10px] text-[var(--color-text-muted)] font-medium tracking-wider uppercase">
                  Núcleo 377
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
              {obraNome && (
                <span className="px-2 py-1 bg-blue-50 text-[var(--color-primary)] rounded-md font-medium">
                  {obraNome}
                </span>
              )}
              {lastUpdated && (
                <span>Atualizado: {new Date(lastUpdated + 'Z').toLocaleTimeString('pt-BR')}</span>
              )}
              {selectedObraId && (
                <button
                  onClick={() => loadObraData(selectedObraId)}
                  className="px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] border border-[var(--color-primary)] rounded-lg hover:bg-blue-50 transition-colors"
                >
                  ↻ Atualizar
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 space-y-5">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Obra Manager - database panel */}
        <ObraManager
          obras={obrasList}
          selectedObraId={selectedObraId}
          onSelectObra={loadObraData}
          onUpload={handleUpload}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          loading={obrasLoading}
        />

        {/* Loading state */}
        {loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <ChartSkeleton key={i} />)}
            </div>
          </div>
        )}

        {/* Dashboard content (only show when not loading) */}
        {!loading && (
          <>
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
                <p>Dados de demonstração. Faça upload de um arquivo Excel (.xlsx) para carregar dados reais.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
