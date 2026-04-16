from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date


class DiaryPhotoResponse(BaseModel):
    id: str
    diary_id: str
    file_path: str
    file_name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class WorkDiaryBase(BaseModel):
    project_id: str
    date: date
    weather: Optional[str] = None
    team_present: Optional[str] = None
    activities: Optional[str] = None
    materials_received: Optional[str] = None
    issues: Optional[str] = None
    occurrences: Optional[str] = None
    notes: Optional[str] = None


class WorkDiaryCreate(WorkDiaryBase):
    pass


class WorkDiaryUpdate(BaseModel):
    date: Optional[date] = None
    weather: Optional[str] = None
    team_present: Optional[str] = None
    activities: Optional[str] = None
    materials_received: Optional[str] = None
    issues: Optional[str] = None
    occurrences: Optional[str] = None
    notes: Optional[str] = None


class WorkDiaryResponse(WorkDiaryBase):
    id: str
    created_by: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: Optional[datetime] = None
    photos: Optional[List[DiaryPhotoResponse]] = []

    class Config:
        from_attributes = True
