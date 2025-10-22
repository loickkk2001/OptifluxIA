from pydantic import BaseModel
from typing import Optional


class UserLogin(BaseModel):
    email: str
    password: str
    role: Optional[str] = None  # Rendre le rôle optionnel