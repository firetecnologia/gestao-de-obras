# Radar de Obras

Sistema de prospecção de oportunidades comerciais em obras públicas e privadas, com foco em venda de serviços técnicos de engenharia.

## Stack

- **Frontend**: Next.js + React + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Banco de dados**: PostgreSQL + SQLAlchemy (async)
- **Integração**: API do PNCP (Portal Nacional de Contratações Públicas)

## Funcionalidades

- Dashboard com métricas e gráficos
- Busca automática no PNCP por oportunidades
- Cadastro de cidades-alvo, palavras-chave, construtoras e fontes de busca
- Score automático de oportunidades comerciais
- Sugestão automática de serviços técnicos
- Gestão do funil comercial
- Relatório semanal com exportação CSV/Excel
- Importação manual de oportunidades
- Histórico comercial por oportunidade
- Autenticação com JWT (admin, comercial, leitura)

## Como rodar localmente

### Pré-requisitos

- Python 3.11+
- Node.js 20+
- PostgreSQL 14+
- Poetry (gerenciador de pacotes Python)

### 1. Banco de dados

```bash
# Usando Docker
docker-compose up -d db

# Ou manualmente
createdb radar_obras
```

### 2. Backend

```bash
cd backend
cp .env.example .env
poetry install
poetry run python -m app.seeds  # Criar tabelas e dados iniciais
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend

```bash
cd frontend
cp ../.env.example .env.local  # ou crie manualmente
npm install
npm run dev
```

Acesse: http://localhost:3000

### Login padrão

- E-mail: `admin@radardeobras.com`
- Senha: `radar2024`

## Rotas da API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Usuário atual |
| GET/POST | `/api/cidades` | CRUD de cidades-alvo |
| GET/POST | `/api/palavras-chave` | CRUD de palavras-chave |
| GET/POST | `/api/construtoras` | CRUD de construtoras |
| GET/POST | `/api/fontes` | CRUD de fontes de busca |
| GET/POST | `/api/oportunidades` | CRUD de oportunidades |
| PATCH | `/api/oportunidades/{id}/status` | Alterar status |
| POST | `/api/oportunidades/{id}/historico` | Adicionar histórico |
| POST | `/api/pncp/buscar` | Buscar no PNCP |
| GET | `/api/dashboard` | Dados do dashboard |
| GET | `/api/relatorio/semanal` | Relatório semanal |
| GET | `/api/relatorio/semanal/csv` | Exportar CSV |
| GET | `/api/relatorio/semanal/excel` | Exportar Excel |
| GET | `/api/health` | Health check |

## Deploy

### Com Docker Compose

```bash
docker-compose up -d
```

### Manual

Consulte as instruções de cada componente acima.

## Estrutura do Projeto

```
radar-de-obras/
├── backend/
│   ├── app/
│   │   ├── api/routes/     # Rotas REST
│   │   ├── core/           # Config, DB, segurança
│   │   ├── models/         # Modelos SQLAlchemy
│   │   ├── schemas/        # Schemas Pydantic
│   │   ├── services/       # PNCP, scoring, sugestões
│   │   ├── seeds.py        # Dados iniciais
│   │   └── main.py         # App FastAPI
│   └── pyproject.toml
├── frontend/
│   └── src/
│       ├── app/            # Páginas Next.js
│       ├── components/     # Componentes React
│       ├── contexts/       # AuthContext
│       ├── services/       # API client
│       └── lib/            # Utilitários
├── docker-compose.yml
├── .env.example
└── README.md
```
