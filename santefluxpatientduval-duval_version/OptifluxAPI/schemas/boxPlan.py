from pydantic import BaseModel
from datetime import date, time, datetime
from typing import List

class BoxPlanCreate(BaseModel):
    staff_id: str
    doctors_id: List[str]
    poll: str
    room: str 
    period: str
    date: str   
    comment: str
    consultation_number: str
    consultation_time: str = None
    created_at: datetime = None
    updated_at: datetime = None
    matricule: str = None
    status: str = "Réservé"
