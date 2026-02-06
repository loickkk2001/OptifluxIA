from bson import ObjectId
from fastapi import HTTPException, APIRouter, Body, File, UploadFile
from starlette import status
from crud.box_plan import create_box_plan, delete_box_plan, assign_replacer_to_box_plan, update_box_plan_status
from database.database import box_plans
from schemas.boxPlan import BoxPlanCreate
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from utils.excel_utils import parse_excel
from utils.planning_parser import parse_planning_excel
import pandas as pd

router = APIRouter()
   
@router.post("/box_plans/create")
async def register(box_plan_info: BoxPlanCreate):
    try:
        box_plan_data = {
            "staff_id": box_plan_info.staff_id,
            "doctors_id": box_plan_info.doctors_id or [],
            "poll": box_plan_info.poll,
            "room": box_plan_info.room,
            "period": box_plan_info.period,
            "date": box_plan_info.date,
            "consultation_number": box_plan_info.consultation_number,
            "consultation_time": box_plan_info.consultation_time,
            "comment": box_plan_info.comment,
            "status": box_plan_info.status
        }
        
        result = await create_box_plan(box_plan_data)
        return {
            "message": "box_plan enregistrée avec succès",
            "data": {
                "id": result["box_plan_id"],
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

@router.post("/box_plans/upload")
async def upload_box_plans(
    file: UploadFile = File(...),
    use_colors: bool = False,
    poll_id: Optional[str] = None,
    staff_id: Optional[str] = None,
    week_start_date: Optional[str] = None
):
    """
    Upload de fichier Excel pour créer des box plans.
    
    Deux modes:
    1. use_colors=False (défaut): Format tabulaire avec colonnes (staff_id, doctors_id, poll, room, etc.)
    2. use_colors=True: Format planning avec couleurs (nécessite poll_id, staff_id, week_start_date)
    
    Args:
        file: Fichier Excel à uploader
        use_colors: Si True, parse le planning avec couleurs. Si False, format tabulaire classique.
        poll_id: ID du pôle (requis si use_colors=True)
        staff_id: ID du cadre de santé (requis si use_colors=True)
        week_start_date: Date de début de semaine YYYY-MM-DD (optionnel, utilise la semaine actuelle)
    """
    try:
        file_content = await file.read()
        
        # Mode parsing avec couleurs
        if use_colors:
            if not poll_id or not staff_id:
                raise HTTPException(
                    status_code=400,
                    detail="poll_id et staff_id sont requis lorsque use_colors=True"
                )
            
            # Parser le planning avec couleurs
            data = parse_planning_excel(
                file_content=file_content,
                poll_id=poll_id,
                staff_id=staff_id,
                week_start_date=week_start_date,
                room_mapping=None  # Peut être amélioré pour passer un mapping
            )
        else:
            # Mode format tabulaire classique
            from io import BytesIO
            file_obj = BytesIO(file_content)
            file_obj.name = file.filename
            data = await parse_excel(UploadFile(file=file_obj, filename=file.filename))
        
        inserted_ids = []
        errors = []
        polls = set()
        
        for index, item in enumerate(data):
            try:
                # Gérer doctors_id : peut être une string avec IDs séparés par virgule ou point-virgule
                doctors_id_str = item.get("doctors_id", "")
                if isinstance(doctors_id_str, str):
                    # Séparer par virgule ou point-virgule et nettoyer
                    doctors_id = [d.strip() for d in doctors_id_str.replace(";", ",").split(",") if d.strip()]
                elif isinstance(doctors_id_str, list):
                    doctors_id = doctors_id_str
                else:
                    doctors_id = []
                
                # Convertir la date si nécessaire
                date_value = item.get("date")
                if isinstance(date_value, pd.Timestamp):
                    date_str = date_value.strftime("%Y-%m-%d")
                elif isinstance(date_value, datetime):
                    date_str = date_value.strftime("%Y-%m-%d")
                else:
                    date_str = str(date_value)
                
                poll_id_item = str(item.get("poll", ""))
                polls.add(poll_id_item)  # Collecter les polls pour validation
                
                box_plan_data = {
                    "staff_id": str(item.get("staff_id", "")),
                    "doctors_id": doctors_id,
                    "poll": poll_id_item,
                    "room": str(item.get("room", "")),
                    "period": str(item.get("period", "")),
                    "date": date_str,
                    "consultation_number": str(item.get("consultation_number", "0")),
                    "consultation_time": str(item.get("consultation_time", "30")),
                    "comment": str(item.get("comment", "")),
                    "status": str(item.get("status", "Réservé"))
                }
                
                # Valider les champs requis
                if not box_plan_data["staff_id"] or not box_plan_data["poll"] or not box_plan_data["room"]:
                    errors.append(f"Ligne {index + 2}: Champs requis manquants (staff_id, poll, room)")
                    continue
                
                result = await create_box_plan(box_plan_data)
                inserted_ids.append(str(result["box_plan_id"]))
            except Exception as e:
                errors.append(f"Ligne {index + 2}: {str(e)}")
                continue
        
        message = f"{len(inserted_ids)} réservations créées avec succès"
        if len(polls) > 1:
            message += f" (Attention: {len(polls)} pôles différents détectés)"
        if errors:
            message += f", {len(errors)} erreur(s)"
        
        return {
            "message": message,
            "data": inserted_ids,
            "errors": errors if errors else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Erreur lors de l'upload du fichier: {str(e)}"
        )

@router.delete("/box_plans/delete/{box_plan_id}")
async def delete(box_plan_id: str):
    try:
        result = await delete_box_plan(box_plan_id)
        return {"message": "box_plan deleted successfully", "data": result}
    except Exception as e:
        return HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

class box_planUpdate(BaseModel):
    status: Optional[str] = None  # Status is optional
    
@router.put("/box_plans/update/{box_plan_id}")
async def update_box_plan(
    box_plan_id: str, 
    update_data: box_planUpdate
):
    try:
        # Préparer les données de mise à jour
        update_fields = {
            "updated_at": datetime.now()
        }
        
        # Ajouter seulement les champs qui ont été fournis
        if update_data.status:
            update_fields["status"] = update_data.status
        
        result = box_plans.update_one(
            {"_id": ObjectId(box_plan_id)},
            {"$set": update_fields}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="box_plan non trouvée ou aucune modification")
        
        updated_box_plan = box_plans.find_one({"_id": ObjectId(box_plan_id)})
        return {
            "message": "box_plan mise à jour avec succès",
            "data": {
                "id": str(updated_box_plan["_id"]),
                "status": updated_box_plan["status"],
                "matricule": updated_box_plan.get("matricule", ""),
                "updated_at": update_fields["updated_at"].isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur interne du serveur: {str(e)}"
        )
    
@router.get("/box_plans")
async def get_box_plans():
    try:
        box_plan_l = box_plans.find()
        box_plan_list = [
            {
                "id": str(box_plan["_id"]),
                "staff_id": box_plan["staff_id"],
                "doctors_id": box_plan.get("doctors_id", []), 
                "poll": box_plan["poll"],
                "room": box_plan["room"],
                "period": box_plan["period"],
                "date": box_plan["date"],
                "consultation_number": box_plan["consultation_number"],
                "consultation_time": box_plan["consultation_time"],
                "comment": box_plan["comment"],
                "status": box_plan["status"],
                "matricule": box_plan.get("matricule", ""),
                "created_at": box_plan.get("created_at", "").isoformat() if box_plan.get("created_at") else "",
                "updated_at": box_plan.get("updated_at", "").isoformat() if box_plan.get("updated_at") else ""
            } for box_plan in box_plan_l
        ]
        return {"message": "box_plans récupérées avec succès", "data": box_plan_list}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur interne du serveur: {str(e)}"
        )

@router.get("/box_plans/{box_plan_id}")
async def get_box_plan_by_id(box_plan_id: str):
    try:
        box_plan = box_plans.find_one({"_id": ObjectId(box_plan_id)})
        if box_plan:
            box_plan_details = {
                "id": str(box_plan["_id"]),
                "staff_id": box_plan["staff_id"],
                "doctors_id": box_plan.get("doctors_id", []), 
                "poll": box_plan["poll"],
                "room": box_plan["room"],
                "period": box_plan["period"],
                "date": box_plan["date"],
                "consultation_number": box_plan["consultation_number"],
                "consultation_time": box_plan["consultation_time"],
                "comment": box_plan["comment"],
                "status": box_plan["status"],
                "matricule": box_plan.get("matricule", ""),
                "created_at": box_plan.get("created_at", "").isoformat() if box_plan.get("created_at") else "",
                "updated_at": box_plan.get("updated_at", "").isoformat() if box_plan.get("updated_at") else ""
            }
            return {"message": "box_plan récupérée avec succès", "data": box_plan_details}
        else:
            raise HTTPException(status_code=404, detail="box_plan non trouvée")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur interne du serveur: {str(e)}"
        )
   
@router.post("/box_plans/replace/{box_plan_id}")
async def set_replacement(box_plan_id: str, replacement_id: str):
    try:
        result = await assign_replacer_to_box_plan(box_plan_id, replacement_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error updating replacement: {str(e)}")

@router.get("/box_plans/by-date-range")
async def get_box_plans_by_date_range(startDate: str, endDate: str):
    try:
        # Convertir les dates string en objets datetime
        start_date = datetime.fromisoformat(startDate)
        end_date = datetime.fromisoformat(endDate)
        
        # Requête MongoDB pour les plannings dans cette plage de dates
        box_plan_l = box_plans.find({
            "date": {
                "$gte": start_date,
                "$lte": end_date
            }
        })
        
        box_plan_list = [
            {
                "id": str(box_plan["_id"]),
                "staff_id": box_plan["staff_id"],
                "doctors_id": box_plan.get("doctors_id", []), 
                "poll": box_plan["poll"],
                "room": box_plan["room"],
                "period": box_plan["period"],
                "date": box_plan["date"],
                "consultation_number": box_plan["consultation_number"],
                "consultation_time": box_plan["consultation_time"],
                "comment": box_plan["comment"],
                "status": box_plan["status"],
                "matricule": box_plan.get("matricule", ""),
                "created_at": box_plan.get("created_at", "").isoformat() if box_plan.get("created_at") else "",
                "updated_at": box_plan.get("updated_at", "").isoformat() if box_plan.get("updated_at") else ""
            } for box_plan in box_plan_l
        ]
        return {"message": "box_plans récupérées avec succès", "data": box_plan_list}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur interne du serveur: {str(e)}"
        )

@router.put("/box_plans/update-status/{box_plan_id}")
async def update_box_plans_status(box_plan_id: str, status_data: dict):
    try:
        status = status_data.get('status')
        if not status:
            raise HTTPException(status_code=422, detail="Le champ 'status' est requis")
            
        result = box_plans.update_one(
            {"_id": ObjectId(box_plan_id)},
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