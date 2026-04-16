from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date


class TaskDependencyCreate(BaseModel):
    depends_on_id: str
    dependency_type: str = "finish_to_start"


class TaskDependencyResponse(BaseModel):
    id: str
    task_id: str
    depends_on_id: str
    dependency_type: str

    class Config:
        from_attributes = True


class WorkTaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    responsible_id: Optional[str] = None
    planned_start: Optional[date] = None
    planned_end: Optional[date] = None
    status: str = "nao_iniciada"
    sort_order: int = 0
    notes: Optional[str] = None


class WorkTaskCreate(WorkTaskBase):
    dependencies: Optional[List[TaskDependencyCreate]] = []


class WorkTaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    responsible_id: Optional[str] = None
    planned_start: Optional[date] = None
    planned_end: Optional[date] = None
    actual_start: Optional[date] = None
    actual_end: Optional[date] = None
    progress_percent: Optional[int] = None
    status: Optional[str] = None
    sort_order: Optional[int] = None
    notes: Optional[str] = None


class WorkTaskResponse(BaseModel):
    id: str
    phase_id: str
    name: str
    description: Optional[str] = None
    responsible_id: Optional[str] = None
    responsible_name: Optional[str] = None
    planned_start: Optional[date] = None
    planned_end: Optional[date] = None
    actual_start: Optional[date] = None
    actual_end: Optional[date] = None
    progress_percent: int = 0
    status: str
    sort_order: int = 0
    notes: Optional[str] = None
    dependencies: Optional[List[TaskDependencyResponse]] = []

    class Config:
        from_attributes = True


class WorkPhaseBase(BaseModel):
    name: str
    description: Optional[str] = None
    sort_order: int = 0
    planned_start: Optional[date] = None
    planned_end: Optional[date] = None
    status: str = "nao_iniciada"


class WorkPhaseCreate(WorkPhaseBase):
    project_id: str


class WorkPhaseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sort_order: Optional[int] = None
    planned_start: Optional[date] = None
    planned_end: Optional[date] = None
    actual_start: Optional[date] = None
    actual_end: Optional[date] = None
    progress_percent: Optional[int] = None
    status: Optional[str] = None


class WorkPhaseResponse(BaseModel):
    id: str
    project_id: str
    name: str
    description: Optional[str] = None
    sort_order: int = 0
    planned_start: Optional[date] = None
    planned_end: Optional[date] = None
    actual_start: Optional[date] = None
    actual_end: Optional[date] = None
    progress_percent: int = 0
    status: str
    tasks: Optional[List[WorkTaskResponse]] = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
