from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
import os
import uuid

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.config import settings
from app.models.models import User, WorkDiary, DiaryPhoto, Project
from app.schemas.diary import WorkDiaryCreate, WorkDiaryUpdate, WorkDiaryResponse, DiaryPhotoResponse
from app.schemas.base import PaginatedResponse, MessageResponse

router = APIRouter(prefix="/diary", tags=["Diário de Obra"])


@router.get("", response_model=PaginatedResponse[WorkDiaryResponse])
async def list_diaries(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(WorkDiary).where(WorkDiary.is_deleted.is_(False)).options(
        selectinload(WorkDiary.photos), selectinload(WorkDiary.created_by_user)
    )
    count_query = select(func.count()).select_from(WorkDiary).where(WorkDiary.is_deleted.is_(False))

    if project_id:
        query = query.where(WorkDiary.project_id == project_id)
        count_query = count_query.where(WorkDiary.project_id == project_id)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size).order_by(WorkDiary.date.desc()))
    diaries = result.scalars().all()

    items = []
    for d in diaries:
        photos = [DiaryPhotoResponse(id=p.id, diary_id=p.diary_id, file_path=p.file_path, file_name=p.file_name, description=p.description) for p in (d.photos or [])]
        items.append(WorkDiaryResponse(
            id=d.id, project_id=d.project_id, date=d.date, weather=d.weather,
            team_present=d.team_present, activities=d.activities,
            materials_received=d.materials_received, issues=d.issues,
            occurrences=d.occurrences, notes=d.notes,
            created_by=d.created_by,
            created_by_name=d.created_by_user.name if d.created_by_user else None,
            created_at=d.created_at, photos=photos,
        ))

    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size,
        pages=(total + page_size - 1) // page_size if page_size > 0 else 0,
    )


@router.post("", response_model=WorkDiaryResponse, status_code=status.HTTP_201_CREATED)
async def create_diary(data: WorkDiaryCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Project).where(Project.id == data.project_id, Project.is_deleted.is_(False)))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Obra não encontrada")

    diary = WorkDiary(**data.model_dump(), created_by=current_user.id)
    db.add(diary)
    await db.flush()
    await db.refresh(diary)
    return WorkDiaryResponse(
        id=diary.id, project_id=diary.project_id, date=diary.date,
        weather=diary.weather, team_present=diary.team_present,
        activities=diary.activities, materials_received=diary.materials_received,
        issues=diary.issues, occurrences=diary.occurrences, notes=diary.notes,
        created_by=diary.created_by, created_at=diary.created_at, photos=[],
    )


@router.get("/{diary_id}", response_model=WorkDiaryResponse)
async def get_diary(diary_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(WorkDiary).where(WorkDiary.id == diary_id, WorkDiary.is_deleted.is_(False))
        .options(selectinload(WorkDiary.photos), selectinload(WorkDiary.created_by_user))
    )
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    photos = [DiaryPhotoResponse(id=p.id, diary_id=p.diary_id, file_path=p.file_path, file_name=p.file_name, description=p.description) for p in (d.photos or [])]
    return WorkDiaryResponse(
        id=d.id, project_id=d.project_id, date=d.date, weather=d.weather,
        team_present=d.team_present, activities=d.activities,
        materials_received=d.materials_received, issues=d.issues,
        occurrences=d.occurrences, notes=d.notes,
        created_by=d.created_by,
        created_by_name=d.created_by_user.name if d.created_by_user else None,
        created_at=d.created_at, photos=photos,
    )


@router.put("/{diary_id}", response_model=WorkDiaryResponse)
async def update_diary(diary_id: str, data: WorkDiaryUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(WorkDiary).where(WorkDiary.id == diary_id, WorkDiary.is_deleted.is_(False)))
    diary = result.scalar_one_or_none()
    if not diary:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(diary, field, value)
    await db.flush()
    await db.refresh(diary)
    return WorkDiaryResponse(
        id=diary.id, project_id=diary.project_id, date=diary.date,
        weather=diary.weather, team_present=diary.team_present,
        activities=diary.activities, notes=diary.notes,
        created_by=diary.created_by, created_at=diary.created_at, photos=[],
    )


@router.delete("/{diary_id}", response_model=MessageResponse)
async def delete_diary(diary_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from datetime import datetime, timezone
    result = await db.execute(select(WorkDiary).where(WorkDiary.id == diary_id, WorkDiary.is_deleted.is_(False)))
    diary = result.scalar_one_or_none()
    if not diary:
        raise HTTPException(status_code=404, detail="Registro não encontrado")
    diary.is_deleted = True
    diary.deleted_at = datetime.now(timezone.utc)
    await db.flush()
    return MessageResponse(message="Registro removido com sucesso")


@router.post("/{diary_id}/photos", response_model=DiaryPhotoResponse, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    diary_id: str,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(WorkDiary).where(WorkDiary.id == diary_id, WorkDiary.is_deleted.is_(False)))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Registro não encontrado")

    upload_dir = os.path.join(settings.UPLOAD_DIR, "diary", diary_id)
    os.makedirs(upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1]
    file_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(upload_dir, file_name)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    photo = DiaryPhoto(
        diary_id=diary_id,
        file_path=file_path,
        file_name=file.filename or file_name,
        description=description,
    )
    db.add(photo)
    await db.flush()
    await db.refresh(photo)
    return DiaryPhotoResponse(id=photo.id, diary_id=photo.diary_id, file_path=photo.file_path, file_name=photo.file_name, description=photo.description)
