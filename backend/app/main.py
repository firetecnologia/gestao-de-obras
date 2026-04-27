from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.core.config import settings
from app.core.database import init_db
from app.core.deps import get_current_user
from app.models.models import User
from app.api.routes import (
    auth, users, clients, suppliers, projects, leads,
    proposals, contracts, planning, purchases, diary,
    financial, documents, dashboard, closing, budget,
    contract_templates, measurements, sinapi, purchase_receipts,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Sistema de Gestão de Engenharia e Obras",
    lifespan=lifespan,
)

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Mount uploads directory
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(users.roles_router, prefix="/api")
app.include_router(users.permissions_router, prefix="/api")
app.include_router(clients.router, prefix="/api")
app.include_router(suppliers.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(leads.router, prefix="/api")
app.include_router(proposals.router, prefix="/api")
app.include_router(contracts.router, prefix="/api")
app.include_router(planning.router, prefix="/api")
app.include_router(purchases.router, prefix="/api")
app.include_router(diary.router, prefix="/api")
app.include_router(financial.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(closing.router, prefix="/api")
app.include_router(budget.router, prefix="/api")
app.include_router(budget.service_catalog_router, prefix="/api")
app.include_router(budget.material_catalog_router, prefix="/api")
app.include_router(budget.composition_catalog_router, prefix="/api")
app.include_router(budget.budget_router, prefix="/api")
app.include_router(contract_templates.router, prefix="/api")
app.include_router(measurements.router, prefix="/api")
app.include_router(sinapi.router, prefix="/api")
app.include_router(purchase_receipts.router, prefix="/api")


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/api")
async def api_root():
    return {"name": settings.APP_NAME, "version": settings.APP_VERSION, "docs": "/docs"}


@app.post("/api/seed")
async def run_seed(
    current_user: User = Depends(get_current_user),
):
    from app.seeds import seed
    await seed()
    return {"status": "ok", "message": "Seeds executados com sucesso"}


@app.post("/api/reset-db")
async def reset_database(
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "Administrador":
        raise HTTPException(status_code=403, detail="Apenas administradores podem resetar o banco")
    from app.core.database import reset_db
    await reset_db()
    from app.seeds import seed
    await seed()
    return {"status": "ok", "message": "Database reset and seeded"}
