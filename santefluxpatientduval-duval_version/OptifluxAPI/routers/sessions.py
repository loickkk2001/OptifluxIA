from uuid import uuid4, UUID

from fastapi import APIRouter, Depends
from starlette.responses import Response

from database.database import users
from schemas.cookies import SessionData
from session_config import cookie, backend

router = APIRouter()

@router.post("/create_session/{first_Name}")
async def create_session(
        first_Name: str,
        last_Name: str,
        date_of_birth: str,
        phoneNumber: int,
        response: Response):
    # génère un identifiant de session unique
    session = uuid4()
    data = SessionData(
        first_Name=first_Name,
        last_Name=last_Name,
        date_of_birth=date_of_birth,
        phoneNumber=phoneNumber,
    )
    # Insertion des données dans MongoDB
    users.insert_one({
        'session_id': str(session),
        **data.dict()
    })

    cookie.attach_to_response(response, session)

    return f"created session for {first_Name}"


@router.post("/delete_session")
async def del_session(response: Response, session_id: UUID = Depends(cookie)):
    await backend.delete(session_id)
    cookie.delete_from_response(response)
    return "deleted session"