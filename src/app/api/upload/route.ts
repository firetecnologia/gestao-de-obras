import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { processSheets } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json(
        { error: 'Nenhum arquivo enviado.' },
        { status: 400 }
      );
    }

    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      return Response.json(
        { error: 'Formato não suportado. Envie um arquivo .xlsx, .xls ou .csv.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
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

    const result = processSheets(sheetsData);

    return Response.json({
      ...result,
      spreadsheetId: null,
      connected: true,
      lastUpdated: new Date().toISOString(),
      source: 'upload',
      fileName: file.name,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('Upload error:', error.message);
    return Response.json(
      { error: `Erro ao processar o arquivo: ${error.message || 'erro desconhecido'}` },
      { status: 500 }
    );
  }
}
