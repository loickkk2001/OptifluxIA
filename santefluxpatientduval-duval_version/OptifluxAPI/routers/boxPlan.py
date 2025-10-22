from bson import ObjectId
from fastapi import HTTPException, APIRouter, Body
from starlette import status
from crud.box_plan import create_box_plan, delete_box_plan, assign_replacer_to_box_plan, update_box_plan_status
from database.database import box_plans
from schemas.boxPlan import BoxPlanCreate
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

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