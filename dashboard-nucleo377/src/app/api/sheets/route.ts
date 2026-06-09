import { NextRequest } from 'next/server';
import { google } from 'googleapis';
import { extractSpreadsheetId, processSheets } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const apiKey = process.env.GOOGLE_API_KEY;

  if (email && key) {
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: key.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  }

  if (apiKey) {
    return apiKey;
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const link = searchParams.get('link');

  if (!link) {
    return Response.json(
      { error: 'O link informado não parece ser uma planilha válida.' },
      { status: 400 }
    );
  }

  const spreadsheetId = extractSpreadsheetId(link);
  if (!spreadsheetId) {
    return Response.json(
      { error: 'O link informado não parece ser uma planilha válida. Verifique o formato do link do Google Sheets.' },
      { status: 400 }
    );
  }

  const auth = getAuth();
  if (!auth) {
    return Response.json(
      { error: 'Credenciais do Google não configuradas. Verifique as variáveis de ambiente.' },
      { status: 500 }
    );
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth: typeof auth === 'string' ? undefined : auth, ...(typeof auth === 'string' ? { key: auth } : {}) });

    // Get spreadsheet metadata
    const meta = await sheets.spreadsheets.get({
      spreadsheetId,
      ...(typeof auth === 'string' ? { key: auth } : {}),
    });

    const sheetTitles = meta.data.sheets?.map(s => s.properties?.title || '') || [];

    if (sheetTitles.length === 0) {
      return Response.json(
        { error: 'Não foi possível localizar as abas esperadas.' },
        { status: 404 }
      );
    }

    // Fetch all sheets data
    const ranges = sheetTitles.map(t => `'${t}'`);
    const batchResult = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
      ...(typeof auth === 'string' ? { key: auth } : {}),
    });

    const sheetsData = (batchResult.data.valueRanges || []).map((vr, idx) => ({
      title: sheetTitles[idx],
      rows: (vr.values || []) as (string | number | null | undefined)[][],
    }));

    const result = processSheets(sheetsData);

    return Response.json({
      ...result,
      spreadsheetId,
      connected: true,
      lastUpdated: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const error = err as { code?: number; message?: string; errors?: Array<{ reason?: string }> };

    if (error.code === 403 || error.code === 404) {
      const reason = error.errors?.[0]?.reason;
      if (reason === 'notFound') {
        return Response.json(
          { error: 'Planilha não encontrada. Verifique se o link está correto.' },
          { status: 404 }
        );
      }
      return Response.json(
        { error: 'A planilha precisa estar compartilhada com a conta de serviço ou publicada para leitura.' },
        { status: 403 }
      );
    }

    console.error('Sheets API error:', error.message);
    return Response.json(
      { error: `Erro ao acessar a planilha: ${error.message || 'erro desconhecido'}` },
      { status: 500 }
    );
  }
}
