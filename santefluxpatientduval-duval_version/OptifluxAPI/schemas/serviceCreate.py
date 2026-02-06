from pydantic import BaseModel
from datetime import datetime
from typing import List

class ServiceCreate(BaseModel):
    name: str
    head: str
    created_at: datetime = None
    updated_at: datetime = None
    matricule: str = None

class RoomCreate(BaseModel):
    name: str
    localisation: str = None
    description: str = None
    created_at: datetime = None
    updated_at: datetime = None
    matricule: str = None
    status: str = "Disponible"
    phone_number: str = None

class SpecialitéCreate(BaseModel):
    name: str
    created_at: datetime = None
    updated_at: datetime = None
    matricule: str = None

class PoleCreate(BaseModel):
    name: str
    head: str = None
    specialities: List[str] = None
    created_at: datetime = None
    updated_at: datetime = None
    matricule: str = None