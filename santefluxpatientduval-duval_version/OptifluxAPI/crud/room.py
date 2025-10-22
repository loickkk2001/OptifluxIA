from bson import ObjectId
from fastapi import HTTPException
import random
import string
from datetime import datetime

from crud.jwt_config import create_token
from database.database import db, rooms

def generate_room_matricule() -> str:
    prefix = "R"
    random_suffix = ''.join(random.choices(string.digits, k=3))
    random_letter = ''.join(random.choices(string.ascii_uppercase, k=3))
    return f"{prefix}{random_suffix}{random_letter}"

async def create_room(room_info):
    try:
        # Vérifier si le nom du room existe déjà
        if rooms.find_one({"name": room_info["name"]}):
            raise HTTPException(status_code=400, detail="Une chambre avec ce nom existe déjà")
        
        # Générer le matricule
        matricule = generate_room_matricule()
        while rooms.find_one({"matricule": matricule}):
            matricule = generate_room_matricule()
        
        # Ajouter les timestamps et le matricule
        now = datetime.now()
        room_info.update({
            "created_at": now,
            "updated_at": now,
            "matricule": matricule,
            "localisation": room_info.get("localisation"),
            "description": room_info.get("description"),
            "status": room_info.get("status", "Disponible")
        })
        
        # Insérer le room
        db_response = rooms.insert_one(room_info)
        room_id = db_response.inserted_id
        
        return {
            "message": "room créé avec succès",
            "room_id": str(room_id),
            "matricule": matricule,
            "created_at": now.isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur interne du serveur: {str(e)}")

async def delete_room(room_id):
    try:
        # Utilisez 'insert_one' sans 'await'
        db_response = rooms.delete_one({"_id": ObjectId(room_id)})

        print("room supprimé avec succès")

        return {"message": "room supprimé avec succès", "room_id": str(room_id)}

    except Exception as e:
        print(f"Erreur lors de la création de l'room : {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
    
async def update_room(room_id: str, room_data: dict):
    try:
        # Ajouter la date de mise à jour
        room_data["updated_at"] = datetime.now()
        
        result = rooms.update_one(
            {"_id": ObjectId(room_id)},
            {"$set": room_data}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="room non trouvé")
        
        updated_room = rooms.find_one({"_id": ObjectId(room_id)})
        return {
            "message": "room mis à jour avec succès",
            "data": {
                "id": str(room_id),
                "matricule": updated_room.get("matricule"),
                "updated_at": room_data["updated_at"]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de la mise à jour: {str(e)}")
    