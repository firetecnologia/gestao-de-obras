'use client';

import { useState, useEffect } from 'react';
import type { ConnectionStatus } from '@/types';

interface HeaderProps {
  onConnect: (link: string) => void;
  onUpload: (file: File) => void;
  onRefresh: () => void;
  connectionStatus: ConnectionStatus;
  lastUpdated: string | null;
  currentLink: string;
}

export function Header({ onConnect, onUpload, onRefresh, connectionStatus, lastUpdated, currentLink }: HeaderProps) {
  const [link, setLink] = useState(currentLink);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  useEffect(() => {
    if (currentLink) setLink(currentLink);
  }, [currentLink]);

  const handleConnect = () => {
    if (link.trim()) onConnect(link.trim());
  };

  const statusColors: Record<ConnectionStatus, string> = {
    idle: 'bg-gray-300',
    connecting: 'bg-yellow-400 animate-pulse',
    connected: 'bg-[var(--color-success)]',
    error: 'bg-[var(--color-danger)]',
  };

  const statusLabels: Record<ConnectionStatus, string> = {
    idle: 'Desconectado',
    connecting: 'Conectando...',
    connected: 'Conectado',
    error: 'Erro na conexão',
  };

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
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

          {/* Input + Actions */}
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <input
              type="text"
              value={link}
              onChange={e => setLink(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConnect()}
              placeholder="Cole o link do Google Sheets ou envie um arquivo Excel..."
              className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-light)] focus:border-transparent bg-gray-50"
            />
            <button
              onClick={handleConnect}
              disabled={connectionStatus === 'connecting'}
              className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary-light)] transition-colors disabled:opacity-50 shrink-0"
            >
              Conectar
            </button>
            <label className="px-3 py-2 text-sm font-medium text-white bg-[var(--color-success)] rounded-lg hover:opacity-90 transition-colors cursor-pointer shrink-0">
              📁 Upload Excel
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <button
              onClick={onRefresh}
              disabled={connectionStatus !== 'connected'}
              className="px-3 py-2 text-sm font-medium text-[var(--color-primary)] border border-[var(--color-primary)] rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-30 shrink-0"
            >
              ↻ Atualizar
            </button>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3 shrink-0 text-xs text-[var(--color-text-muted)]">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${statusColors[connectionStatus]}`} />
              <span>{statusLabels[connectionStatus]}</span>
            </div>
            {lastUpdated && (
              <span className="hidden sm:inline">
                Atualizado: {new Date(lastUpdated).toLocaleTimeString('pt-BR')}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
