# Gestao de Obras ERP

Sistema web completo de gestao de engenharia, focado em empresas de construcao, reforma e gestao de obras no Brasil.

## Visao Geral

Plataforma modular e escalavel para controlar toda a operacao da empresa, desde o primeiro contato comercial com o lead ate o encerramento da obra, faturamento, cobranca e entrega da documentacao final.

### Modulos

| Modulo | Descricao |
|--------|-----------|
| **Dashboard** | Visao executiva e operacional da empresa |
| **CRM / Leads** | Pipeline comercial, leads, interacoes, conversao |
| **Clientes** | Cadastro PF/PJ com contatos |
| **Propostas** | Orcamento por etapa/ambiente, itens, versoes, aprovacao |
| **Contratos** | Geracao a partir de proposta, parcelas, status |
| **Obras** | Projetos com tipo, status, cronograma, responsavel |
| **Planejamento** | Fases, etapas, Gantt simplificado, progresso |
| **Compras** | Solicitacoes, cotacoes, pedidos, recebimento |
| **Diario de Obra** | Registro diario, fotos, pendencias, ocorrencias |
| **Financeiro** | Contas a pagar/receber, cobranca, inadimplencia |
| **Documentos** | Upload, categorizacao, vinculo com entidades |
| **Usuarios** | Perfis, permissoes granulares, RBAC |

## Stack Tecnologica

- **Backend:** FastAPI (Python) + SQLAlchemy (async) + PostgreSQL
- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Auth:** JWT + Refresh Token
- **Infra:** Docker + Docker Compose

## Como Rodar

### Pre-requisitos

- Docker e Docker Compose
- (Ou) Python 3.12+ com Poetry e Node.js 20+

### Com Docker Compose (recomendado)

```bash
# Clonar o repositorio
git clone <url-do-repo>
cd gestao-obras

# Subir todos os servicos
docker compose up -d

# Rodar seeds (primeira vez)
docker compose exec backend python -m app.seeds
```

Acesse:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Desenvolvimento Local

#### Backend

```bash
cd backend

# Instalar dependencias
poetry install

# Configurar .env (ja existe um padrao)
# DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/gestao_obras

# Subir apenas o banco
docker compose up db -d

# Rodar o servidor
poetry run fastapi dev app/main.py

# Rodar seeds
poetry run python -m app.seeds
```

#### Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Rodar em desenvolvimento
npm run dev
```

Acesse http://localhost:5173

### Migrations (Alembic)

```bash
cd backend

# Gerar migration inicial
poetry run alembic revision --autogenerate -m "initial"

# Aplicar migrations
poetry run alembic upgrade head
```

## Usuarios de Teste (Seeds)

| Email | Senha | Perfil |
|-------|-------|--------|
| admin@gestaoobras.com | admin123 | Administrador |
| ceo@gestaoobras.com | ceo123 | Direcao / CEO |
| comercial@gestaoobras.com | comercial123 | Comercial |
| engenheiro@gestaoobras.com | eng123 | Engenheiro |
| financeiro@gestaoobras.com | fin123 | Financeiro |

## Estrutura do Projeto

```
gestao-obras/
├── backend/
│   ├── app/
│   │   ├── api/routes/       # Rotas da API (17 modulos)
│   │   ├── core/             # Config, database, security, deps
│   │   ├── models/           # SQLAlchemy models (30+ entidades)
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── main.py           # FastAPI app
│   │   └── seeds.py          # Dados demo
│   ├── alembic/              # Migrations
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/       # UI components (shadcn/ui)
│   │   ├── contexts/         # Auth context
│   │   ├── hooks/            # Custom hooks
│   │   ├── pages/            # Paginas (13 modulos)
│   │   ├── services/         # API client (axios)
│   │   └── App.tsx           # Routing
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Fluxos Principais

1. **Lead > Cliente > Proposta > Contrato > Obra**
   - Criar lead no CRM > Converter em cliente > Criar proposta > Aprovar > Gerar contrato > Gerar obra

2. **Obra > Cronograma > Diario**
   - Criar obra > Cadastrar fases/etapas > Registrar diario com fotos

3. **Contrato > Parcelas > Cobranca**
   - Criar contrato > Parcelas geradas automaticamente > Acompanhar inadimplencia

4. **Compras**
   - Criar solicitacao > Vincular fornecedor > Registrar entrega

5. **Documentos**
   - Upload com categorizacao > Vinculo com obra/cliente/contrato

## API Documentation

Com o backend rodando, acesse: http://localhost:8000/docs

### Principais Endpoints

- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Usuario atual
- `GET /api/clients` - Listar clientes
- `GET /api/leads` - Listar leads
- `POST /api/leads/{id}/convert` - Converter lead em cliente
- `GET /api/proposals` - Listar propostas
- `POST /api/proposals/{id}/approve` - Aprovar proposta
- `POST /api/proposals/{id}/generate-contract` - Gerar contrato
- `GET /api/contracts` - Listar contratos
- `POST /api/contracts/{id}/generate-project` - Gerar obra
- `GET /api/projects` - Listar obras
- `GET /api/planning/projects/{id}/phases` - Fases da obra
- `GET /api/planning/projects/{id}/gantt` - Dados Gantt
- `GET /api/diary` - Listar diarios
- `GET /api/financial/entries` - Lancamentos financeiros
- `GET /api/financial/summary` - Resumo financeiro
- `GET /api/financial/overdue-installments` - Inadimplencia
- `GET /api/dashboard/executive` - Dashboard executivo
- `GET /api/dashboard/operational` - Dashboard operacional
- `GET /api/closing/projects/{id}` - Checklist encerramento

## Regras de Negocio

- Toda obra tem um cliente vinculado
- Proposta aprovada pode gerar contrato
- Contrato ativo pode gerar obra
- Parcelas do contrato alimentam contas a receber
- Obra so encerra com checklist completo
- Exclusao logica (soft delete) em entidades principais
- Timestamps e auditoria (created_at, updated_at, created_by)

## Roadmap

### P1 - Segunda Fase
- Portal do cliente completo
- Medicoes e aditivos
- Replanejamento com historico
- Mapa comparativo de cotacoes
- Checklist tecnico por etapa
- Relatorio fisico-financeiro
- Notificacoes internas

### P2 - Terceira Fase
- Integracao com email e WhatsApp
- Assinatura eletronica
- Conciliacao bancaria
- Portal de fornecedor
- Dashboards avancados
- Motor de workflow
- Recursos de IA

## Pontos de Atencao

- Sistema usa `create_all()` para criar tabelas em dev. Em producao, usar Alembic migrations
- Autenticacao JWT com tokens em localStorage (considerar httpOnly cookies em producao)
- Uploads armazenados localmente (preparado para S3 futuro)
- CORS configurado como `allow_origins=["*"]` para dev (restringir em producao)
