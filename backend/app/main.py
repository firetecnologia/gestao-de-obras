import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import init_db
from app.api.routes import auth, cidades, palavras_chave, construtoras, fontes, oportunidades, pncp, dashboard, relatorio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database initialized.")
    yield


app = FastAPI(
    title="Radar de Obras",
    description="Sistema de prospecção de oportunidades comerciais em obras públicas e privadas",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(cidades.router, prefix="/api")
app.include_router(palavras_chave.router, prefix="/api")
app.include_router(construtoras.router, prefix="/api")
app.include_router(fontes.router, prefix="/api")
app.include_router(oportunidades.router, prefix="/api")
app.include_router(pncp.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(relatorio.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "Radar de Obras", "version": "0.1.0"}
