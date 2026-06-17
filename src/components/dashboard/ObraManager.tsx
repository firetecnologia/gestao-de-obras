'use client';

import { useState } from 'react';

interface ObraFileEntry {
  id: number;
  nome: string;
  arquivo_original: string;
  tamanho: number;
  data_upload: string;
  ultima_atualizacao: string;
}

interface ObraManagerProps {
  obras: ObraFileEntry[];
  selectedObraId: number | null;
  onSelectObra: (id: number) => void;
  onUpload: (file: File, nome: string) => void;
  onDelete: (id: number) => void;
  onUpdate: (id: number, file: File) => void;
  loading: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'Z');
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

export function ObraManager({ obras, selectedObraId, onSelectObra, onUpload, onDelete, onUpdate, loading }: ObraManagerProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [nome, setNome] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (file: File) => {
    onUpload(file, nome);
    setNome('');
    setShowUpload(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-grafite)]">Obras Cadastradas</h2>
          <p className="text-[10px] text-[var(--color-text-muted)]">{obras.length} obra(s) no banco de dados</p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="px-3 py-1.5 text-xs font-medium text-white bg-[var(--color-success)] rounded-lg hover:opacity-90 transition-colors"
        >
          + Nova Obra
        </button>
      </div>

      {/* Upload Area */}
      {showUpload && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="mb-2">
            <label className="text-xs font-medium text-gray-600 block mb-1">Nome da obra (opcional):</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Obra Jairo e Ana (detectado automaticamente se vazio)"
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-light)]"
            />
          </div>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
              dragOver ? 'border-[var(--color-primary)] bg-blue-50' : 'border-gray-300'
            }`}
          >
            <p className="text-xs text-gray-500 mb-2">Arraste um arquivo .xlsx aqui ou</p>
            <label className="px-3 py-1.5 text-xs font-medium text-white bg-[var(--color-primary)] rounded-lg hover:opacity-90 cursor-pointer">
              Selecionar Arquivo
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ''; }}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* Obras List */}
      {loading && obras.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-gray-400">Carregando obras...</div>
      ) : obras.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs text-gray-400 mb-2">Nenhuma obra cadastrada ainda.</p>
          <p className="text-[10px] text-gray-300">Clique em "+ Nova Obra" para enviar sua primeira planilha.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {obras.map(obra => (
            <div
              key={obra.id}
              className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedObraId === obra.id ? 'bg-blue-50 border-l-3 border-l-[var(--color-primary)]' : ''
              }`}
              onClick={() => onSelectObra(obra.id)}
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">{obra.nome.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-grafite)] truncate">{obra.nome}</p>
                <p className="text-[10px] text-[var(--color-text-muted)]">
                  {obra.arquivo_original} • {formatFileSize(obra.tamanho)} • {formatDate(obra.ultima_atualizacao)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <label
                  className="px-2 py-1 text-[10px] text-[var(--color-primary)] border border-[var(--color-primary)] rounded hover:bg-blue-50 cursor-pointer"
                  onClick={e => e.stopPropagation()}
                >
                  Atualizar
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={e => { const f = e.target.files?.[0]; if (f) onUpdate(obra.id, f); e.target.value = ''; }}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={e => { e.stopPropagation(); onDelete(obra.id); }}
                  className="px-2 py-1 text-[10px] text-[var(--color-danger)] border border-[var(--color-danger)] rounded hover:bg-red-50"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
