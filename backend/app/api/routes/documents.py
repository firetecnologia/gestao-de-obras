from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
import os
import uuid

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.config import settings
from app.models.models import User, Document
from app.schemas.financial import DocumentResponse
from app.schemas.base import PaginatedResponse, MessageResponse

router = APIRouter(prefix="/documents", tags=["Documentos"])


@router.get("", response_model=PaginatedResponse[DocumentResponse])
async def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    project_id: Optional[str] = None,
    client_id: Optional[str] = None,
    contract_id: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Document).where(Document.is_deleted.is_(False))
    count_query = select(func.count()).select_from(Document).where(Document.is_deleted.is_(False))

    if project_id:
        query = query.where(Document.project_id == project_id)
        count_query = count_query.where(Document.project_id == project_id)
    if client_id:
        query = query.where(Document.client_id == client_id)
        count_query = count_query.where(Document.client_id == client_id)
    if contract_id:
        query = query.where(Document.contract_id == contract_id)
        count_query = count_query.where(Document.contract_id == contract_id)
    if category:
        query = query.where(Document.category == category)
        count_query = count_query.where(Document.category == category)
    if search:
        sf = Document.title.ilike(f"%{search}%")
        query = query.where(sf)
        count_query = count_query.where(sf)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size).order_by(Document.created_at.desc()))
    documents = result.scalars().all()

    return PaginatedResponse(
        items=[DocumentResponse.model_validate(d) for d in documents],
        total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size if page_size > 0 else 0,
    )


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    category: str = Form("outro"),
    project_id: Optional[str] = Form(None),
    client_id: Optional[str] = Form(None),
    contract_id: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    upload_dir = os.path.join(settings.UPLOAD_DIR, "documents")
    os.makedirs(upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1]
    file_name_stored = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(upload_dir, file_name_stored)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    doc = Document(
        project_id=project_id,
        client_id=client_id,
        contract_id=contract_id,
        category=category,
        title=title,
        file_path=file_path,
        file_name=file.filename or file_name_stored,
        file_size=len(content),
        mime_type=file.content_type,
        notes=notes,
        uploaded_by=current_user.id,
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)
    return DocumentResponse.model_validate(doc)


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Document).where(Document.id == document_id, Document.is_deleted.is_(False)))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    return DocumentResponse.model_validate(doc)


@router.get("/{document_id}/download")
async def download_document(document_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Document).where(Document.id == document_id, Document.is_deleted.is_(False)))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado no servidor")
    return FileResponse(doc.file_path, filename=doc.file_name, media_type=doc.mime_type)


@router.delete("/{document_id}", response_model=MessageResponse)
async def delete_document(document_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import datetime, timezone
    result = await db.execute(select(Document).where(Document.id == document_id, Document.is_deleted.is_(False)))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    doc.is_deleted = True
    doc.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return MessageResponse(message="Documento removido com sucesso")
