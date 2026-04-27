from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete as sa_delete
from typing import Optional
from datetime import datetime, timezone
import csv
import io
import os

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.config import settings
from app.models.models import User, SinapiSource, SinapiItem
from app.schemas.base import PaginatedResponse, MessageResponse
from pydantic import BaseModel


class SinapiSourceCreate(BaseModel):
    name: str
    reference_month: Optional[str] = None
    state: Optional[str] = None
    source_type: str = "upload"
    url: Optional[str] = None
    notes: Optional[str] = None


class SinapiSourceResponse(BaseModel):
    id: str
    name: str
    reference_month: Optional[str] = None
    state: Optional[str] = None
    source_type: str
    url: Optional[str] = None
    total_items: int = 0
    imported_at: Optional[datetime] = None
    status: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SinapiItemResponse(BaseModel):
    id: str
    source_id: str
    code: str
    description: str
    unit: Optional[str] = None
    unit_cost: Optional[float] = None
    category: Optional[str] = None
    origin: Optional[str] = None

    class Config:
        from_attributes = True


router = APIRouter(prefix="/sinapi", tags=["SINAPI"])


@router.get("/sources", response_model=PaginatedResponse[SinapiSourceResponse])
async def list_sources(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(SinapiSource)
    count_query = select(func.count()).select_from(SinapiSource)
    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size).order_by(SinapiSource.created_at.desc()))
    sources = result.scalars().all()
    return PaginatedResponse(
        items=[SinapiSourceResponse.model_validate(s) for s in sources],
        total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size if page_size > 0 else 0,
    )


@router.post("/sources", response_model=SinapiSourceResponse, status_code=status.HTTP_201_CREATED)
async def create_source(data: SinapiSourceCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    source = SinapiSource(**data.model_dump())
    db.add(source)
    await db.flush()
    await db.refresh(source)
    return SinapiSourceResponse.model_validate(source)


@router.post("/sources/{source_id}/import", response_model=MessageResponse)
async def import_sinapi_csv(
    source_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Import SINAPI data from CSV file. Expected columns: code, description, unit, unit_cost, category, origin"""
    result = await db.execute(select(SinapiSource).where(SinapiSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Fonte SINAPI não encontrada")

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    # Clear existing items before reimport to prevent duplicates
    await db.execute(sa_delete(SinapiItem).where(SinapiItem.source_id == source_id))

    reader = csv.DictReader(io.StringIO(text), delimiter=";")
    count = 0
    for row in reader:
        code = (row.get("code") or row.get("CODIGO") or row.get("codigo") or "").strip()
        description = (row.get("description") or row.get("DESCRICAO") or row.get("descricao") or "").strip()
        if not code or not description:
            continue
        unit = (row.get("unit") or row.get("UNIDADE") or row.get("unidade") or "").strip()
        cost_str = (row.get("unit_cost") or row.get("CUSTO") or row.get("preco") or "0").strip().replace(".", "").replace(",", ".")
        try:
            unit_cost = float(cost_str) if cost_str else 0
        except ValueError:
            unit_cost = 0
        category = (row.get("category") or row.get("CATEGORIA") or row.get("classe") or "").strip()
        origin = (row.get("origin") or row.get("TIPO") or row.get("tipo") or "").strip()

        item = SinapiItem(
            source_id=source_id, code=code, description=description,
            unit=unit, unit_cost=unit_cost, category=category, origin=origin,
        )
        db.add(item)
        count += 1

    source.total_items = count
    source.status = "concluido"
    source.imported_at = datetime.now(timezone.utc)
    await db.flush()

    # Save file
    upload_dir = os.path.join(settings.UPLOAD_DIR, "sinapi")
    os.makedirs(upload_dir, exist_ok=True)
    safe_filename = os.path.basename(file.filename or "upload.csv")
    file_path = os.path.join(upload_dir, f"{source_id}_{safe_filename}")
    with open(file_path, "wb") as f:
        f.write(content)
    source.file_path = file_path
    await db.flush()

    return MessageResponse(message=f"Importação concluída: {count} itens importados")


@router.get("/items", response_model=PaginatedResponse[SinapiItemResponse])
async def list_sinapi_items(
    source_id: Optional[str] = None,
    search: Optional[str] = None,
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(SinapiItem)
    count_query = select(func.count()).select_from(SinapiItem)

    if source_id:
        query = query.where(SinapiItem.source_id == source_id)
        count_query = count_query.where(SinapiItem.source_id == source_id)
    if search:
        sf = SinapiItem.description.ilike(f"%{search}%") | SinapiItem.code.ilike(f"%{search}%")
        query = query.where(sf)
        count_query = count_query.where(sf)
    if category:
        query = query.where(SinapiItem.category.ilike(f"%{category}%"))
        count_query = count_query.where(SinapiItem.category.ilike(f"%{category}%"))

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size).order_by(SinapiItem.code))
    items = result.scalars().all()

    return PaginatedResponse(
        items=[SinapiItemResponse(
            id=i.id, source_id=i.source_id, code=i.code, description=i.description,
            unit=i.unit, unit_cost=float(i.unit_cost) if i.unit_cost else None,
            category=i.category, origin=i.origin,
        ) for i in items],
        total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size if page_size > 0 else 0,
    )


@router.delete("/sources/{source_id}", response_model=MessageResponse)
async def delete_source(source_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(SinapiSource).where(SinapiSource.id == source_id))
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Fonte não encontrada")
    await db.execute(sa_delete(SinapiItem).where(SinapiItem.source_id == source_id))
    await db.delete(source)
    await db.flush()
    return MessageResponse(message="Fonte SINAPI removida com sucesso")
