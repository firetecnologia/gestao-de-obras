from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.core.config import settings
from app.core.database import init_db
from app.api.routes import (
    auth, users, clients, suppliers, projects, leads,
    proposals, contracts, planning, purchases, diary,
    financial, documents, dashboard, closing,
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


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/api")
async def api_root():
    return {"name": settings.APP_NAME, "version": settings.APP_VERSION, "docs": "/docs"}
