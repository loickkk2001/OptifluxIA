from pydantic import BaseModel
from typing import List

class WorkDay(BaseModel):
    day: str
    start_time: str  # Format: "HH:MM", ex. "09:00"
    end_time: str    # Format: "HH:MM", ex. "17:00"

class ContratCreate(BaseModel):
    user_id: str
    speciality: str
    contrat_type: str
    contrat_hours: str
    work_days: List[WorkDay]  # Liste d'objets WorkDay
    created_at: str = None
    updated_at: str = None
    matricule: str = None