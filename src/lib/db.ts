import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'obras.db');

// Ensure directories exist
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS obras_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    arquivo TEXT NOT NULL,
    arquivo_original TEXT NOT NULL,
    tamanho INTEGER NOT NULL,
    data_upload TEXT NOT NULL DEFAULT (datetime('now')),
    ultima_atualizacao TEXT NOT NULL DEFAULT (datetime('now')),
    ativo INTEGER NOT NULL DEFAULT 1
  );
`);

export interface ObraFile {
  id: number;
  nome: string;
  arquivo: string;
  arquivo_original: string;
  tamanho: number;
  data_upload: string;
  ultima_atualizacao: string;
  ativo: number;
}

export function getUploadsDir(): string {
  return UPLOADS_DIR;
}

export function listObras(): ObraFile[] {
  const stmt = db.prepare('SELECT * FROM obras_files WHERE ativo = 1 ORDER BY ultima_atualizacao DESC');
  return stmt.all() as ObraFile[];
}

export function getObra(id: number): ObraFile | undefined {
  const stmt = db.prepare('SELECT * FROM obras_files WHERE id = ? AND ativo = 1');
  return stmt.get(id) as ObraFile | undefined;
}

export function addObra(nome: string, arquivo: string, arquivoOriginal: string, tamanho: number): ObraFile {
  const stmt = db.prepare(
    'INSERT INTO obras_files (nome, arquivo, arquivo_original, tamanho) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(nome, arquivo, arquivoOriginal, tamanho);
  return getObra(result.lastInsertRowid as number)!;
}

export function updateObra(id: number, arquivo: string, arquivoOriginal: string, tamanho: number): ObraFile | undefined {
  const stmt = db.prepare(
    'UPDATE obras_files SET arquivo = ?, arquivo_original = ?, tamanho = ?, ultima_atualizacao = datetime(\'now\') WHERE id = ? AND ativo = 1'
  );
  stmt.run(arquivo, arquivoOriginal, tamanho, id);
  return getObra(id);
}

export function deleteObra(id: number): boolean {
  const stmt = db.prepare('UPDATE obras_files SET ativo = 0 WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function renameObra(id: number, nome: string): ObraFile | undefined {
  const stmt = db.prepare('UPDATE obras_files SET nome = ?, ultima_atualizacao = datetime(\'now\') WHERE id = ? AND ativo = 1');
  stmt.run(nome, id);
  return getObra(id);
}

export default db;
