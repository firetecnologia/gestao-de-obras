import asyncio

from sqlalchemy import select

from app.core.database import async_session, init_db
from app.core.security import hash_password
from app.models.user import User
from app.models.cidade import Cidade
from app.models.palavra_chave import PalavraChave
from app.models.fonte_busca import FonteBusca


CIDADES = [
    {"nome": "Araçatuba", "uf": "SP", "codigo_ibge": "3502804", "regiao": "Noroeste Paulista", "prioridade": "alta"},
    {"nome": "Birigui", "uf": "SP", "codigo_ibge": "3506508", "regiao": "Noroeste Paulista", "prioridade": "alta"},
    {"nome": "Lins", "uf": "SP", "codigo_ibge": "3527108", "regiao": "Centro-Oeste Paulista", "prioridade": "media"},
    {"nome": "Bauru", "uf": "SP", "codigo_ibge": "3506003", "regiao": "Centro-Oeste Paulista", "prioridade": "media"},
    {"nome": "São José do Rio Preto", "uf": "SP", "codigo_ibge": "3549805", "regiao": "Noroeste Paulista", "prioridade": "alta"},
    {"nome": "Ribeirão Preto", "uf": "SP", "codigo_ibge": "3543402", "regiao": "Nordeste Paulista", "prioridade": "media"},
    {"nome": "São Paulo", "uf": "SP", "codigo_ibge": "3550308", "regiao": "Metropolitana", "prioridade": "media"},
    {"nome": "Governador Valadares", "uf": "MG", "codigo_ibge": "3127701", "regiao": "Vale do Rio Doce", "prioridade": "media"},
]

PALAVRAS_CHAVE = [
    ("obra", "obra pública", 15),
    ("construção", "construção", 15),
    ("reforma", "reforma", 12),
    ("ampliação", "reforma", 12),
    ("adequação", "reforma", 10),
    ("serviços de engenharia", "obra pública", 20),
    ("construção civil", "construção", 18),
    ("edificação", "construção", 15),
    ("prédio", "condomínio", 15),
    ("condomínio", "condomínio", 15),
    ("residencial", "incorporação", 15),
    ("incorporadora", "incorporação", 12),
    ("construtora", "construção", 12),
    ("galpão", "galpão", 12),
    ("unidade de saúde", "saúde", 15),
    ("escola", "educação", 15),
    ("creche", "educação", 15),
    ("hospital", "saúde", 18),
    ("desempenho", "desempenho", 20),
    ("laudo", "desempenho", 18),
    ("vistoria", "fase de entrega", 18),
    ("manutenção predial", "manutenção", 15),
    ("entrega", "fase de entrega", 18),
    ("habite-se", "fase de entrega", 20),
    ("alvará", "fase de entrega", 12),
    ("fiscalização", "obra pública", 10),
    ("guarda-corpo", "desempenho", 20),
    ("piso", "desempenho", 15),
    ("acústica", "desempenho", 18),
    ("fachada", "desempenho", 15),
    ("impermeabilização", "desempenho", 15),
]

FONTES = [
    {"nome": "PNCP - Portal Nacional de Contratações Públicas", "tipo": "pncp", "url": "https://pncp.gov.br", "frequencia": "diaria"},
]


async def seed():
    await init_db()
    async with async_session() as db:
        # Admin user
        result = await db.execute(select(User).where(User.email == "admin@radardeobras.com"))
        if not result.scalar_one_or_none():
            admin = User(
                nome="Administrador",
                email="admin@radardeobras.com",
                hashed_password=hash_password("radar2024"),
                perfil="admin",
            )
            db.add(admin)

        # Cidades
        for c in CIDADES:
            result = await db.execute(select(Cidade).where(Cidade.nome == c["nome"], Cidade.uf == c["uf"]))
            if not result.scalar_one_or_none():
                db.add(Cidade(**c))

        # Palavras-chave
        for palavra, categoria, peso in PALAVRAS_CHAVE:
            result = await db.execute(select(PalavraChave).where(PalavraChave.palavra == palavra))
            if not result.scalar_one_or_none():
                db.add(PalavraChave(palavra=palavra, categoria=categoria, peso=peso))

        # Fontes
        for f in FONTES:
            result = await db.execute(select(FonteBusca).where(FonteBusca.nome == f["nome"]))
            if not result.scalar_one_or_none():
                db.add(FonteBusca(**f))

        await db.commit()
        print("Seeds executados com sucesso!")


if __name__ == "__main__":
    asyncio.run(seed())
