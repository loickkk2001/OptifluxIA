from bson import ObjectId
from fastapi import HTTPException, Depends
from fastapi.params import Header
from jose import JWTError, jwt
from database.database import db
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

SECRET_KEY = "542680"


def create_token(user_id):
    token = jwt.encode({"user_id": user_id}, SECRET_KEY, algorithm="HS256")
    return token


def get_token(authorization: str = Header(...)):
    print(f"Authorization header: {authorization}")
    if not authorization:
        raise HTTPException(status_code=401, detail="Token manquant")
    if "Bearer" not in authorization:
        raise HTTPException(status_code=401, detail="Token invalide")
    return authorization.replace("Bearer ", "")


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])  # Remplacez "your_secret_key" par votre clé secrète
        user_id: str = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

