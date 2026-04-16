from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, Project, ClosingChecklist
from app.schemas.financial import ClosingChecklistUpdate, ClosingChecklistResponse
from app.schemas.base import MessageResponse

router = APIRouter(prefix="/closing", tags=["Encerramento"])


@router.get("/projects/{project_id}", response_model=ClosingChecklistResponse)
async def get_checklist(project_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ClosingChecklist).where(ClosingChecklist.project_id == project_id))
    checklist = result.scalar_one_or_none()
    if not checklist:
        # Auto-create
        checklist = ClosingChecklist(
            project_id=project_id,
            items='[{"item":"Vistoria final","done":false},{"item":"Limpeza","done":false},{"item":"Documentação entregue","done":false},{"item":"ART/RRT recolhida","done":false},{"item":"Fotos finais","done":false}]',
        )
        db.add(checklist)
        await db.flush()
        await db.refresh(checklist)
    return ClosingChecklistResponse.model_validate(checklist)


@router.put("/projects/{project_id}", response_model=ClosingChecklistResponse)
async def update_checklist(project_id: str, data: ClosingChecklistUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ClosingChecklist).where(ClosingChecklist.project_id == project_id))
    checklist = result.scalar_one_or_none()
    if not checklist:
        checklist = ClosingChecklist(project_id=project_id)
        db.add(checklist)
        await db.flush()

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(checklist, field, value)
    await db.flush()
    await db.refresh(checklist)
    return ClosingChecklistResponse.model_validate(checklist)


@router.post("/projects/{project_id}/close", response_model=MessageResponse)
async def close_project(project_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(ClosingChecklist).where(ClosingChecklist.project_id == project_id))
    checklist = result.scalar_one_or_none()
    if not checklist:
        raise HTTPException(status_code=400, detail="Checklist de encerramento não encontrado")

    if not checklist.delivery_term_signed:
        raise HTTPException(status_code=400, detail="Termo de entrega não assinado")
    if not checklist.final_docs_delivered:
        raise HTTPException(status_code=400, detail="Documentos finais não entregues")

    checklist.closed_at = datetime.now(timezone.utc)
    checklist.closed_by = current_user.id

    # Update project status
    project_result = await db.execute(select(Project).where(Project.id == project_id))
    project = project_result.scalar_one_or_none()
    if project:
        project.status = "encerrada"
        project.actual_end = datetime.now(timezone.utc).date()

    await db.flush()
    return MessageResponse(message="Obra encerrada com sucesso")
