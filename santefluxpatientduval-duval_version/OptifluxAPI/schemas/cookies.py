# Modèle Pydantic pour la création d'une session utilisateur
from pydantic import BaseModel


class SessionData(BaseModel):
    first_Name: str
    last_Name: str
    phoneNumber : int
    role: str