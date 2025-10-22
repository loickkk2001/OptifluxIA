from bson import ObjectId
from fastapi import APIRouter, HTTPException
from starlette import status

from database.database import programs, codes

router = APIRouter()

# Route qui récupère tous les patients de la base de donnée
@router.get("/code")
async def get_codes():
    try:
        code_meanings = codes.find({})
        return {"message" : "Codes recupéré avec succès", "data": code_meanings}
    except Exception as e:
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur interne du serveur: {str(e)}",
        )

# Faire un schema avec précisé le type de code (horaire/absence) et le texte du code pour avoir les infos + couleur
@router.get("/code/{code_id}")
async def get_code_by_id(code_id: str):
    try:
        code = codes.find_one({"_id": ObjectId(code_id)})
        if code:
            return {"message" : "Code recupéré avec succès", "data": code}
        else:
            return HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Code non trouvé",
            )
    except Exception as e:
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur interne du serveur: {str(e)}",
        )
