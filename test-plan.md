# Test Plan: Dashboard de Obras — Núcleo 377

## Context
Testing the complete dashboard platform running locally with mock data at http://localhost:3000.
No Google credentials are configured, so we test with mock data mode and verify error handling for connection attempts.

## Test 1: Dashboard loads with all mandatory components (mock data)

**Steps:**
1. Navigate to http://localhost:3000
2. Wait for page to fully load

**Assertions:**
- Page title contains "Dashboard de Obras — Núcleo 377"
- Header shows "Dashboard de Obras" branding with "NÚCLEO 377"
- Header has input field with placeholder "Cole o link ou ID da planilha Google Sheets..."
- Header has "Conectar" button
- Header shows "Desconectado" status (gray)
- 10 KPI cards visible: Receita Prevista (R$ 1.130.000,00), Receita Realizada (R$ 430.000,00), Custo Previsto (R$ 800.000,00), Custo Realizado (R$ 365.000,00), Lucro Previsto (R$ 330.000,00), Lucro Realizado (R$ 65.000,00), Margem Prevista (29.2%), Margem Realizada (15.1%), Desvio de Custo (-54.4%), Status (Em andamento)
- Alerts section shows "Alertas (6)" with specific alerts
- Footer text: "Dados de demonstração. Cole o link de uma planilha Google Sheets acima para carregar dados reais."

## Test 2: Filters change displayed data

**Steps:**
1. Select "OBR-001 - Jairo e Ana" from the Obra filter dropdown
2. Observe KPI cards update

**Assertions:**
- After filtering to OBR-001: Receita Prevista changes to R$ 430.000,00 (single obra)
- Custo Previsto changes to R$ 300.000,00
- Lucro Previsto changes to R$ 130.000,00
- Charts update to show only "Jairo e Ana" data

## Test 3: Connection error handling (invalid link)

**Steps:**
1. Type "invalid-link-test" into the spreadsheet link input
2. Click "Conectar" button
3. Observe error message

**Assertions:**
- Status changes from "Desconectado" to error state (red dot)
- Error message banner appears with text containing "Credenciais do Google não configuradas" (since no env vars set, it will hit the 500 error)
- Dashboard continues showing mock data (doesn't break)

## Test 4: Connection error handling (valid Google Sheets URL format but no credentials)

**Steps:**
1. Clear input, type "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit"
2. Click "Conectar" button

**Assertions:**
- Status shows error (red dot)
- Error message: "Credenciais do Google não configuradas. Verifique as variáveis de ambiente."
- KPI cards still show mock data values (dashboard doesn't crash)

## Test 5: Search functionality

**Steps:**
1. Click on search input
2. Type "Porcelanato"
3. Observe search results dropdown

**Assertions:**
- Dropdown appears with results containing "Porcelanato 60x60"
- Results grouped by type (compra, material)
- Shows value associated with result

## Test 6: Scroll to verify charts and tables render

**Steps:**
1. Scroll down past alerts section
2. Verify charts are rendered

**Assertions:**
- "Receita e Custo: Previsto × Realizado" chart visible with bars
- "Lucro: Previsto × Realizado" chart visible with bars
- After more scrolling: tables visible (Últimas Compras, Maiores Compras, etc.)
- "Resumo Executivo" section visible at bottom with generated text
