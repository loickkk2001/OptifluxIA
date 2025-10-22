from fastapi.security import HTTPBearer
from fastapi import HTTPException
from uuid import UUID
from schemas.cookies import SessionData
from schemas.sessions import BasicVerifier

from fastapi_sessions.backends.implementations import InMemoryBackend
from fastapi_sessions.frontends.implementations import SessionCookie, CookieParameters


cookie_params = CookieParameters()

cookie = SessionCookie(
    cookie_name="session_cookie",
    identifier="general_verifier",
    auto_error=True,
    secret_key="0a1b2c3d4e5f6g7h@",
    cookie_params=cookie_params,
)

backend = InMemoryBackend[UUID, SessionData]()

verifier = BasicVerifier(
    identifier="general_verifier",
    auto_error=True,
    backend=backend,
    auth_http_exception=HTTPException(status_code=403, detail="invalid session"),
)

security = HTTPBearer()
