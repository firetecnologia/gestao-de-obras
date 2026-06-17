import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { v4 } from './uuid';
import { listObras, addObra, getUploadsDir } from '@/lib/db';
import { processSheets } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

// GET /api/obras - list all obras
export async function GET() {
  try {
    const obras = listObras();
    return Response.json({ obras });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return Response.json(
      { error: `Erro ao listar obras: ${error.message || 'erro desconhecido'}` },
      { status: 500 }
    );
  }
}

// POST /api/obras - upload new obra file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const nome = (formData.get('nome') as string) || '';

    if (!file) {
      return Response.json(
        { error: 'Nenhum arquivo enviado.' },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
      return Response.json(
        { error: 'Formato não suportado. Envie um arquivo .xlsx, .xls ou .csv.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate the file can be parsed
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetsData = workbook.SheetNames.map(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(sheet, {
        header: 1,
        defval: '',
      });
      return { title: sheetName, rows };
    });

    if (sheetsData.length === 0) {
      return Response.json(
        { error: 'O arquivo não contém nenhuma aba/planilha.' },
        { status: 400 }
      );
    }

    // Try to extract obra name from data if not provided
    const result = processSheets(sheetsData);
    const obraName = nome || (result.obras.length > 0 ? result.obras[0].cliente : file.name.replace(/\.(xlsx|xls|csv)$/i, ''));

    // Save file to uploads directory
    const uniqueName = `${v4()}_${file.name}`;
    const filePath = path.join(getUploadsDir(), uniqueName);
    fs.writeFileSync(filePath, buffer);

    // Save to database
    const obra = addObra(obraName, uniqueName, file.name, buffer.length);

    return Response.json({
      obra,
      message: `Obra "${obraName}" cadastrada com sucesso.`,
    }, { status: 201 });
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('Upload error:', error.message);
    return Response.json(
      { error: `Erro ao processar o arquivo: ${error.message || 'erro desconhecido'}` },
      { status: 500 }
    );
  }
}
