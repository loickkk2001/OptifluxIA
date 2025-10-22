from bson import ObjectId
from fastapi import HTTPException, APIRouter
from starlette import status
from crud.room import create_room, delete_room, update_room, generate_room_matricule
from database.database import rooms
from schemas.serviceCreate import RoomCreate
from datetime import datetime
from fastapi import File, UploadFile
from utils.excel_utils import parse_excel

router = APIRouter()
       
@router.post("/rooms/upload")
async def upload_rooms(file: UploadFile = File(...)):
    try:
        data = await parse_excel(file)
        inserted_ids = []
        for item in data:
            room_data = {
                "name": item.get("name"),
                "localisation": item.get("localisation", ""),
                "description": item.get("description", ""),
                "matricule": item.get("matricule", generate_room_matricule),
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            }
            result = await rooms.insert_one(room_data)
            inserted_ids.append(str(result.inserted_id))
        
        return {"message": f"{len(inserted_ids)} chambres créées avec succès", "data": inserted_ids}
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Erreur lors de l'upload du fichier: {str(e)}"
        )
    
@router.post("/rooms/create")
async def register(room_info: RoomCreate):
    try:
        room_data = {
            "name": room_info.name,
            "localisation": room_info.localisation,
            "description": room_info.description,
            "status": room_info.status
        }
        
        result = await create_room(room_data)
        return {
            "message": "room créé avec succès",
            "data": {
                "id": result["room_id"],
                "matricule": result["matricule"],
                "created_at": result["created_at"]
            }
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur interne du serveur: {str(e)}"
        )

@router.delete("/rooms/delete/{room_id}")
async def delete(room_id: str):
    try:
        result = await delete_room(room_id)
        return {"message": "room supprimé avec succès", "data": result}
    except Exception as e:
        return HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur interne du serveur: {str(e)}",
        )

@router.get("/rooms")
async def get_rooms():
    try:
        room_l = rooms.find()
        room_list = [
            {
                "id": str(room["_id"]),
                "name": room["name"],
                "localisation": room["localisation"],
                "description": room["description"],
                "matricule": room.get("matricule", ""),
                "status": room.get("status", ""),
                "created_at": room.get("created_at", "").isoformat() if room.get("created_at") else "",
                "updated_at": room.get("updated_at", "").isoformat() if room.get("updated_at") else ""
            } for room in room_l
        ]
        return {"message": "rooms récupérés avec succès", "data": room_list}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur interne du serveur: {str(e)}"
        )

@router.get("/rooms/{room_id}")
async def get_room_by_id(room_id: str):
    try:
        room = rooms.find_one({"_id": ObjectId(room_id)})
        if room:
            room_details = {
                "id": str(room["_id"]),
                "name": room["name"],
                "localisation": room["localisation"],
                "description": room["description"],
                "matricule": room.get("matricule", ""),
                "status": room.get("status", ""),
                "created_at": room.get("created_at", "").isoformat() if room.get("created_at") else "",
                "updated_at": room.get("updated_at", "").isoformat() if room.get("updated_at") else ""
            }
            return {"message": "room récupéré avec succès", "data": room_details}
        else:
            raise HTTPException(status_code=404, detail="room non trouvé")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur interne du serveur: {str(e)}"
        )
    
@router.put("/rooms/update/{room_id}")
async def update_room(room_id: str, room_info: RoomCreate):
    try:
        room_data = {
            "name": room_info.name,
            "name": room_info.name,
            "localisation": room_info.localisation,
            "description": room_info.description,
            "updated_at": datetime.now()
        }
        
        result = rooms.update_one(
            {"_id": ObjectId(room_id)},
            {"$set": room_data}
        )
        
        if result.modified_count == 1:
            updated_room = rooms.find_one({"_id": ObjectId(room_id)})
            return {
                "message": "room mis à jour avec succès",
                "data": {
                    "id": str(updated_room["_id"]),
                    "name": updated_room["name"],
                    "localisation": updated_room["localisation"],
                    "description": updated_room["description"],
                    "matricule": updated_room.get("matricule", ""),
                    "updated_at": room_data["updated_at"].isoformat()
                }
            }
        else:
            raise HTTPException(status_code=404, detail="room non trouvé")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur interne du serveur: {str(e)}"
        )

@router.put("/rooms/update-status/{room_id}")
async def update_room_status(room_id: str, status_data: dict):
    try:
        status = status_data.get('status')
        if not status:
            raise HTTPException(status_code=422, detail="Le champ 'status' est requis")
            
        result = rooms.update_one(
            {"_id": ObjectId(room_id)},
            {"$set": {"status": status, "updated_at": datetime.now()}}
        )
        
        if result.modified_count == 1:
            return {"message": "Statut de la chambre mis à jour avec succès"}
        else:
            raise HTTPException(status_code=404, detail="Chambre non trouvée")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur interne du serveur: {str(e)}"
        )