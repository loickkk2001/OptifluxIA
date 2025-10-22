from bson import ObjectId
from fastapi import HTTPException
from database.database import box_plans
import random
import string
from datetime import datetime


def generate_box_plan_matricule() -> str:
    """Génère un matricule unique pour un box_plan"""
    prefix = "PLAN"
    random_suffix = ''.join(random.choices(string.digits, k=6))  # 6 chiffres
    random_letter = ''.join(random.choices(string.ascii_uppercase, k=3))  # 2 lettres
    return f"{prefix}{random_suffix}{random_letter}"
    
async def create_box_plan(box_plan_info):
    try:
        # Générer le matricule
        matricule = generate_box_plan_matricule()
        while box_plans.find_one({"matricule": matricule}):
            matricule = generate_box_plan_matricule()
        
        # Ajouter les timestamps et le matricule
        now = datetime.now()
        box_plan_info.update({
            "created_at": now,
            "updated_at": now,
            "matricule": matricule,
            "status": box_plan_info.get("status", "Réservé")  # Valeur par défaut
        })
        
        # Insérer l'box_plan
        db_response = box_plans.insert_one(box_plan_info)
        box_plan_id = db_response.inserted_id
        
        return {
            "message": "box_plan enregistrée avec succès",
            "box_plan_id": str(box_plan_id),
            "matricule": matricule,
            "created_at": now.isoformat()
        }

    except Exception as e:
        print(f"Erreur lors de la création de l'box_plan : {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur interne du serveur: {str(e)}")

async def delete_box_plan(box_plan_id):
    try:
        db_response = box_plans.delete_one({"_id": ObjectId(box_plan_id)})
        print("box_plan deleted successfully")
        return {"message": "box_plan deleted successfully", "box_plan_id": str(box_plan_id)}
    except Exception as e:
        print(f"Error deleting box_plan: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

async def assign_replacer_to_box_plan(box_plan_id: str, replacement_id: str):
    try:
        result = box_plans.update_one(
            {"_id": ObjectId(box_plan_id)},
            {"$set": {"replacement_id": replacement_id}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="box_plan not found")
        return {"message": "Replacement assigned successfully"}
    except Exception as e:
        print(f"Error assigning replacer: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

async def update_box_plan_status(box_plan_id: str, status: str):
    try:
        # Vérifier que le statut est valide
        allowed_statuses = ['En cours','Validé', 'Refusé']
        if status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Statut invalide. Valeurs autorisées: {allowed_statuses}"
            )
        
        # Mettre à jour avec la nouvelle date
        update_data = {
            "status": status,
            "updated_at": datetime.now()
        }
        
        result = box_plans.update_one(
            {"_id": ObjectId(box_plan_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="box_plan non trouvée")
        
        updated_box_plan = box_plans.find_one({"_id": ObjectId(box_plan_id)})
        return {
            "message": "Statut de l'box_plan mis à jour",
            "data": {
                "id": str(updated_box_plan["_id"]),
                "matricule": updated_box_plan.get("matricule"),
                "status": updated_box_plan["status"],
                "updated_at": update_data["updated_at"].isoformat()
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur interne du serveur: {str(e)}")

async def get_box_plans_by_date_range(start_date: datetime, end_date: datetime):
    return box_plans.find({
        "date": {
            "$gte": start_date,
            "$lte": end_date
        }
    })