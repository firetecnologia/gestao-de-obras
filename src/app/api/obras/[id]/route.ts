import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { v4 } from '../uuid';
import { getObra, updateObra, deleteObra, renameObra, getUploadsDir } from '@/lib/db';
import { processSheets } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

// GET /api/obras/[id] - get obra data (parsed spreadsheet)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const obraId = parseInt(id, 10);
    if (isNaN(obraId)) {
      return Response.json({ error: 'ID inválido.' }, { status: 400 });
    }

    const obra = getObra(obraId);
    if (!obra) {
      return Response.json({ error: 'Obra não encontrada.' }, { status: 404 });
    }

    // Read and parse the file
    const filePath = path.join(getUploadsDir(), obra.arquivo);
    if (!fs.existsSync(filePath)) {
      return Response.json({ error: 'Arquivo da obra não encontrado no servidor.' }, { status: 404 });
    }

    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheetsData = workbook.SheetNames.map(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(sheet, {
        header: 1,
        defval: '',
      });
      return { title: sheetName, rows };
    });

    const result = processSheets(sheetsData);

    return Response.json({
      ...result,
      obraId: obra.id,
      obraNome: obra.nome,
      fileName: obra.arquivo_original,
      connected: true,
      lastUpdated: obra.ultima_atualizacao,
      source: 'database',
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return Response.json(
      { error: `Erro ao ler dados da obra: ${error.message || 'erro desconhecido'}` },
      { status: 500 }
    );
  }
}

// PUT /api/obras/[id] - update obra file or rename
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const obraId = parseInt(id, 10);
    if (isNaN(obraId)) {
      return Response.json({ error: 'ID inválido.' }, { status: 400 });
    }

    const obra = getObra(obraId);
    if (!obra) {
      return Response.json({ error: 'Obra não encontrada.' }, { status: 404 });
    }

    const contentType = request.headers.get('content-type') || '';

    // JSON body = rename
    if (contentType.includes('application/json')) {
      const body = await request.json();
      if (body.nome) {
        const updated = renameObra(obraId, body.nome);
        return Response.json({ obra: updated, message: 'Obra renomeada com sucesso.' });
      }
      return Response.json({ error: 'Campo "nome" não informado.' }, { status: 400 });
    }

    // FormData = update file
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate file
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    if (workbook.SheetNames.length === 0) {
      return Response.json({ error: 'O arquivo não contém nenhuma aba.' }, { status: 400 });
    }

    // Remove old file
    const oldFilePath = path.join(getUploadsDir(), obra.arquivo);
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
    }

    // Save new file
    const uniqueName = `${v4()}_${file.name}`;
    const filePath = path.join(getUploadsDir(), uniqueName);
    fs.writeFileSync(filePath, buffer);

    const updated = updateObra(obraId, uniqueName, file.name, buffer.length);

    return Response.json({ obra: updated, message: 'Arquivo atualizado com sucesso.' });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return Response.json(
      { error: `Erro ao atualizar obra: ${error.message || 'erro desconhecido'}` },
      { status: 500 }
    );
  }
}

// DELETE /api/obras/[id] - delete obra
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const obraId = parseInt(id, 10);
    if (isNaN(obraId)) {
      return Response.json({ error: 'ID inválido.' }, { status: 400 });
    }

    const success = deleteObra(obraId);
    if (!success) {
      return Response.json({ error: 'Obra não encontrada.' }, { status: 404 });
    }

    return Response.json({ message: 'Obra removida com sucesso.' });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return Response.json(
      { error: `Erro ao remover obra: ${error.message || 'erro desconhecido'}` },
      { status: 500 }
    );
  }
}
