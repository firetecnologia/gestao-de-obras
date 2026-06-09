# Dashboard de Obras — Núcleo 377

Plataforma web profissional para gestão de obras, conectada a planilhas Google Sheets. Interface SaaS moderna com dashboard gráfico, alertas automáticos, resumo executivo e atualização em tempo real.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4-38bdf8)

---

## Funcionalidades

- **Conexão com Google Sheets**: cole o link da planilha e os dados são carregados automaticamente
- **Dashboard gráfico premium**: cards KPI, 8 gráficos interativos, 5 tabelas
- **Atualização automática**: dados atualizados a cada 30 segundos
- **Alertas inteligentes**: detecta desvios de custo, pendências e inconsistências
- **Resumo executivo**: texto gerado automaticamente com análise da obra
- **Busca global**: encontre materiais, fornecedores, serviços
- **Filtros avançados**: por obra, fornecedor, centro de custo, categoria, status
- **Dados de demonstração**: funciona sem planilha conectada (dados mock)
- **Responsivo**: funciona em desktop e tablet
- **Tolerante a variações**: aceita nomes de abas/colunas com ou sem acento

---

## Pré-requisitos

- Node.js 18+ (recomendado: 20+)
- npm ou yarn
- Uma conta Google Cloud (gratuita) para acessar a API do Google Sheets

---

## Instalação (passo a passo)

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd dashboard-obras
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as credenciais do Google

Veja a seção **"Configurar Google Sheets API"** abaixo.

### 4. Crie o arquivo .env.local

```bash
cp .env.example .env.local
```

Edite o arquivo `.env.local` com suas credenciais.

### 5. Rode o projeto localmente

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

---

## Configurar Google Sheets API

### Opção A: Service Account (Recomendado)

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto novo (ou use um existente)
3. Ative a **Google Sheets API**:
   - Menu lateral → APIs & Services → Library
   - Busque "Google Sheets API" → Ativar
4. Crie uma **Service Account**:
   - Menu lateral → APIs & Services → Credentials
   - "Create Credentials" → "Service Account"
   - Dê um nome (ex: "dashboard-obras")
   - Após criar, clique na service account → aba "Keys"
   - "Add Key" → "Create new key" → JSON
   - Um arquivo `.json` será baixado
5. Do arquivo JSON, copie:
   - `client_email` → coloque em `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → coloque em `GOOGLE_PRIVATE_KEY`
6. **Compartilhe a planilha** com o email da service account (permissão de Leitor)

### Opção B: API Key (Planilhas Públicas)

1. No Google Cloud Console, crie uma API Key
2. Coloque em `GOOGLE_API_KEY` no `.env.local`
3. A planilha deve estar **publicada na web** ou compartilhada com "Qualquer pessoa com o link"

---

## Estrutura da Planilha

A plataforma lê automaticamente as seguintes abas (tolerante a variações de nome):

| Aba | Dados |
|-----|-------|
| Obras | ID, Cliente, Endereço, Status, Receita, Custo, Lucro |
| Orçamento Materiais | Categoria, Material, Quantidade, Custos |
| Orçamento Serviços | Ambiente, Etapa, Serviço, Status |
| Compras Reais | Data, Material, Fornecedor, Valores |
| Mão de Obra Real | Prestador, Serviço, Valores, Status |
| Medições | Serviço, Percentual, Valor Medido, Status |

**Dica:** Use a primeira linha de cada aba como cabeçalho.

---

## Deploy na Vercel

### 1. Conecte o repositório

1. Acesse [vercel.com](https://vercel.com)
2. Clique em "New Project"
3. Importe o repositório do GitHub
4. O framework será detectado automaticamente (Next.js)

### 2. Configure as variáveis de ambiente

Na configuração do projeto na Vercel, adicione:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- (Ou `GOOGLE_API_KEY` se usar Opção B)

### 3. Deploy

Clique em "Deploy". Pronto!

A URL gerada pela Vercel é seu link de acesso ao dashboard.

---

## Tecnologias

- **Next.js 16** — Framework React com App Router
- **TypeScript** — Tipagem estática
- **Tailwind CSS 4** — Estilização utilitária
- **Recharts** — Gráficos interativos
- **Google Sheets API** — Integração com planilhas
- **date-fns** — Manipulação de datas

---

## Estrutura do Projeto

```
src/
├── app/
│   ├── api/sheets/route.ts    # API endpoint para ler Google Sheets
│   ├── layout.tsx             # Layout raiz
│   ├── page.tsx               # Dashboard principal
│   └── globals.css            # Estilos globais + tema
├── components/
│   ├── charts/                # Componentes de gráficos
│   ├── dashboard/             # Header, Filtros, Alertas, Busca, Resumo
│   ├── tables/                # Tabelas de dados
│   └── ui/                    # Componentes base (Card, Skeleton)
├── lib/
│   ├── financial.ts           # Funções de cálculo financeiro
│   ├── mockData.ts            # Dados de demonstração
│   ├── normalize.ts           # Normalização de nomes de abas/colunas
│   └── sheets.ts              # Parser e processador de dados do Sheets
└── types/
    └── index.ts               # Tipos TypeScript
```

---

## Licença

Projeto desenvolvido para uso interno da Núcleo 377.
