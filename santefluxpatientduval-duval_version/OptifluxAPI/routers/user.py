from json import dumps
from uuid import uuid4
from bson import ObjectId
from fastapi import HTTPException, APIRouter, Depends
from starlette import status
from starlette.responses import JSONResponse, Response
from crud.jwt_config import get_current_user, create_token
from crud.user import create_user, get_user_by_email, delete_user
from database.database import users
from schemas.assignService import AssignService
from schemas.cookies import SessionData
from schemas.passwordChange import PasswordChange
from schemas.userCreate import UserCreate
from schemas.userLogin import UserLogin
from session_config import backend, cookie
from utils.validate_email import is_valid_email
from datetime import datetime

router = APIRouter()

@router.post("/login")
async def login(user_info: UserLogin, response: Response):
    user = get_user_by_email(user_info.email)
    if user is None:
        raise HTTPException(status_code=401, detail="L'utilisateur n'existe pas")
    elif user['password'] != user_info.password:
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    
    # Validation du rôle avec mapping pour compatibilité
    role_mapping = {
        'Cadre de santé': 'cadre',
        'Médecin': 'doctor',
        'admin': 'admin',
        'nurse': 'nurse',
        'cadre': 'cadre',
        'doctor': 'doctor'
    }
    
    # Normaliser les rôles
    user_role = role_mapping.get(user['role'], user['role'])
    expected_role = role_mapping.get(user_info.role, user_info.role)
    
    if user_role != expected_role:
        raise HTTPException(status_code=401, detail=f"Rôle incorrect. Rôle attendu: {expected_role}, rôle de l'utilisateur: {user_role}")
    
    users.update_one({"email": user_info.email}, {"$set": {"logged_in": True}})
    session = uuid4()
    data = SessionData(
        first_Name=user['first_name'],
        last_Name=user['last_name'],
        phoneNumber=user['phoneNumber'],
        role=user_role  # Utiliser le rôle normalisé
    )
    await backend.create(session, data)
    cookie.attach_to_response(response, session)
    token = create_token(str(user['_id']))
    return {
        "token": token,
        "data": {
            "_id": str(user["_id"]),
            "first_name": user["first_name"],
            "last_name": user["last_name"],
            "email": user["email"],
            "phoneNumber": user["phoneNumber"],
            "role": user_role,  # Retourner le rôle normalisé
            "service_id": user["service_id"]
        },
        "message": "Utilisateur connecté avec succès"
    }

"""@router.post("/users/register")
async def register(user_info: UserCreate):
    try:
        if not is_valid_email(user_info.email):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email address")
        user = await create_user({
            "first_name": user_info.first_name,
            "last_name": user_info.last_name,
            "phoneNumber": user_info.phoneNumber,
            "email": user_info.email,
            "password": user_info.password,
            "role": user_info.role,
            "logged_in": user_info.logged_in,
            "service_id": user_info.service_id
        })
        return {"message": "Utilisateur enregistré avec succès", "data": user}
    except Exception as e:
        if isinstance(e, HTTPException):
            return e
        return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur interne du serveur: {str(e)}")"""
    

@router.post("/users/register")
async def register(user_info: UserCreate):
    try:
        if not is_valid_email(user_info.email):
            raise HTTPException(status_code=400, detail="Invalid email address")
        
        user_data = {
            "first_name": user_info.first_name,
            "last_name": user_info.last_name,
            "phoneNumber": user_info.phoneNumber,
            "email": user_info.email,
            "password": user_info.password,
            "role": user_info.role,
            "logged_in": user_info.logged_in,
            "service_id": user_info.service_id
        }
        
        user = await create_user(user_data)
        return {
            "message": "Utilisateur enregistré avec succès",
            "data": {
                "id": user["user_id"],
                "matricule": user["matricule"],
                "created_at": datetime.now().isoformat()
            }
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur interne du serveur: {str(e)}")

"""@router.put("/users/update/{user_id}")
async def update_user(user_id: str, user_data: dict):
    try:
        result = users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": user_data}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")
        return {"message": "Utilisateur mis à jour avec succès", "data": {"modified_count": result.modified_count}}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Erreur lors de la mise à jour: {str(e)}")"""
    

@router.put("/users/update/{user_id}")
async def update_user(user_id: str, user_data: dict):
    try:
        # Ajouter la date de mise à jour
        user_data["updated_at"] = datetime.now()
        
        result = users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": user_data}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        return {
            "message": "Utilisateur mis à jour avec succès",
            "data": {
                "modified_count": result.modified_count,
                "updated_at": user_data["updated_at"]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur lors de la mise à jour: {str(e)}")

@router.delete("/users/delete/{user_id}")
async def delete_user_route(user_id: str):
    try:
        result = users.delete_one({"_id": ObjectId(user_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")
        response_data = {"deleted_count": result.deleted_count}
        return {"message": "Utilisateur supprimé avec succès", "data": response_data}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Erreur lors de la suppression: {str(e)}")

@router.post("/users/changePassword/{user_id}")
async def change_password(user_id: str, password: PasswordChange):
    try:
        result = users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password": password.new_password}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")
        return {"message": "Mot de passe modifié avec succès", "data": {"modified_count": result.modified_count}}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Erreur lors de la mise à jour du mot de passe: {str(e)}")

@router.get("/user-info")
async def get_user_info(current_user: str = Depends(get_current_user)):
    try:
        # Ensure current_user is a valid ObjectId
        if not ObjectId.is_valid(current_user):
            raise HTTPException(status_code=400, detail="Invalid user ID format")
        
        user = await users.find_one({"_id": ObjectId(current_user)})
        if user is None:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
        user_data = {
            "id": str(user["_id"]),  # Match frontend's expected field name
            "first_name": user["first_name"],
            "last_name": user["last_name"],
            "email": user["email"],
            "phoneNumber": user["phoneNumber"],
            "role": user["role"],
            "service_id": user.get("service_id", None)
        }
        return {"message": "Utilisateur récupéré avec succès", "data": user_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur interne du serveur: {str(e)}")

        
@router.get("/users/nurse")  # Moved before /users/{user_id}
async def get_nurses():
    try:
        user_l = users.find({"role": "nurse"})
        users_list = [
            {"id": str(user["_id"]), "first_name": user["first_name"], "last_name": user["last_name"], "phoneNumber": user["phoneNumber"], "role": user["role"], "email": user["email"]}
            for user in user_l
        ]
        if not users_list:  # Check if the list is empty
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateurs non trouvés")
        return {"message": "Infirmiers récupérés avec succès", "data": users_list}
    except Exception as e:
        return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur interne du serveur: {str(e)}")

"""@router.get("/users")
async def get_users():
    try:
        user_l = users.find()
        users_list = [
            {
                "id": str(user["_id"]), 
                "first_name": user["first_name"], 
                "last_name": user["last_name"], 
                "email": user["email"], 
                "phoneNumber": user["phoneNumber"],
                "role": user.get("role", ""),
                "service_id": user.get("service_id", None)
            } for user in user_l
        ]
        print(users_list)
        return {"message": "Utilisateurs récupérés avec succès", "data": users_list}
    except Exception as e:
        return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur interne du serveur: {str(e)}")"""
    
@router.get("/users")
async def get_users():
    try:
        user_l = users.find()
        users_list = [
            {
                "id": str(user["_id"]), 
                "first_name": user["first_name"], 
                "last_name": user["last_name"], 
                "email": user["email"], 
                "phoneNumber": user["phoneNumber"],
                "role": user.get("role", ""),
                "service_id": user.get("service_id", None),
                "matricule": user.get("matricule", ""),
                "created_at": user.get("created_at", "").isoformat() if user.get("created_at") else "",
                "updated_at": user.get("updated_at", "").isoformat() if user.get("updated_at") else ""
            } for user in user_l
        ]
        return {"message": "Utilisateurs récupérés avec succès", "data": users_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur interne du serveur: {str(e)}")

@router.get("/users/{user_id}")
async def get_user_details(user_id: str):
    try:
        user = users.find_one({"_id": ObjectId(user_id)})
        if user:
            user_details = {
                "id": str(user["_id"]),
                "first_name": user["first_name"],
                "last_name": user["last_name"],
                "phoneNumber": user["phoneNumber"],
                "role": user["role"],
                "email": user["email"],
            }
            return {"message": "Utilisateur récupéré avec succès", "data": user_details}
        else:
            return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")
    except Exception as e:
        return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur interne du serveur: {str(e)}")

@router.get("/users/head")
async def get_cadres():
    try:
        user = users.find({"role": "cadre"})
        if user:
            cadre_list = [
                {"id": str(cadre["_id"]), "first_name": cadre["first_name"], "last_name": cadre["last_name"], "phoneNumber": cadre["phoneNumber"], "role": cadre["role"], "email": cadre["email"]}
                for cadre in user
            ]
            return {"message": "Cadres récupérés avec succès", "data": cadre_list}
        else:
            return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateurs non trouvés")
    except Exception as e:
        return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur interne du serveur: {str(e)}")

@router.get("/roles")
async def get_available_roles():
    """Retourne la liste des rôles disponibles avec leur mapping"""
    return {
        "roles": {
            "admin": "Administrateur",
            "cadre": "Cadre de santé", 
            "doctor": "Médecin",
            "nurse": "Infirmier"
        },
        "mapping": {
            "Cadre de santé": "cadre",
            "Médecin": "doctor", 
            "admin": "admin",
            "nurse": "nurse"
        },
        "message": "Rôles disponibles récupérés avec succès"
    }

@router.post("/users/assignService/{user_id}")
async def assign_service(user_id: str, service: AssignService):
    try:
        result = users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"service_id": service.service_id}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable")
        return {"message": "Service ajouté avec succès", "data": {"modified_count": result.modified_count}}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Erreur lors de la mise à jour du mot de passe: {str(e)}")

@router.post("/logout")
async def logout(current_user: int = Depends(get_current_user)):
    try:
        result = users.update_one({"_id": ObjectId(current_user)}, {"$set": {"logged_in": False}})
        return {"message": "Utilisateur déconnecté avec succès", "data": {"modified_count": result.modified_count}}
    except Exception as e:
        return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erreur interne du serveur: {str(e)}")