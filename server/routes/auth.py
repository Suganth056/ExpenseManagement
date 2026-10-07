# routes/auth_router.py

from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse, JSONResponse
import secrets
from urllib.parse import urlencode

import os
import httpx
from dotenv import load_dotenv
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from config.db_config import get_connection
from config.settings import USER_TABLE

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")  # must point at THIS backend's /auth/google/callback

# Where to send the browser back to once login succeeds — your Next.js app.
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Long random string used to sign the short-lived handoff token below.
# Generate one with: python -c "import secrets; print(secrets.token_urlsafe(48))"
AUTH_TOKEN_SECRET = os.getenv("AUTH_TOKEN_SECRET")
if not AUTH_TOKEN_SECRET:
    raise RuntimeError("AUTH_TOKEN_SECRET is missing in .env")

# Signs a small payload (email/name/picture) into an opaque token that's
# only valid for a couple of minutes — just long enough for the browser to
# bounce from this callback to the frontend and for the frontend's server
# to call /verify. It never carries the Google access_token, so the
# browser never sees it.
serializer = URLSafeTimedSerializer(AUTH_TOKEN_SECRET)
HANDOFF_TOKEN_MAX_AGE_SECONDS = 120

authRouter = APIRouter()

def createUser(google_user):
    if not google_user:
        return None
    conn = None

    email = google_user.get("email")
    name = google_user.get("name")
    try:
        conn = get_connection()
        cursor = conn.cursor()
        # Check if the user already exists
        cursor.execute(f"SELECT * FROM {USER_TABLE} WHERE email = %s", (email,))
        existing_user = cursor.fetchone()
    
        print("Existing User : ", existing_user)

        if existing_user:
            # User already exists, return the existing user
            return {"message": "User already exists", "user": existing_user}
    
        cursor.execute(
            f"INSERT INTO {USER_TABLE} (email, user_name) VALUES (%s, %s) RETURNING *",
            (email, name),
        )
        new_user = cursor.fetchone()
        conn.commit()
        return {"message": "User created successfully", "user": new_user}
        
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

@authRouter.get('/')
def getPath():
    return {
        'code': 200,
        'Message': "Welcome from the Auth Router"
    }

@authRouter.get("/google")
async def google_login():
    state = secrets.token_urlsafe(32)

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    }

    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        + urlencode(params)
    )

    response = RedirectResponse(google_auth_url)


    # print("Respnse : from Google ",response)

    # Same caveat as before: this cookie is scoped to whatever host this
    # request came in on, which must match GOOGLE_REDIRECT_URI's host.
    response.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=600,
    )

    return response

@authRouter.get("/google/callback")
async def google_callback(request: Request, code: str, state: str):
    stored_state = request.cookies.get("oauth_state")

    if not stored_state or stored_state != state:
        # Send the user back to the frontend's login page with an error
        # flag instead of returning raw JSON — there's no SPA route at
        # this backend URL for them to land on.
        error_response = RedirectResponse(f"{FRONTEND_URL}/login?error=invalid_state")
        error_response.delete_cookie("oauth_state")
        return error_response

    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "code": code,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        token_result = token_response.json()
        
        if "error" in token_result or not token_result.get("access_token"):
            error_response = RedirectResponse(f"{FRONTEND_URL}/login?error=token_exchange_failed")
            error_response.delete_cookie("oauth_state")
            return error_response

        access_token = token_result["access_token"]

        user_response = await client.get(
            "https://openidconnect.googleapis.com/v1/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        # print("User Response : ",user_response.json())

        if user_response.status_code != 200:
            error_response = RedirectResponse(f"{FRONTEND_URL}/login?error=userinfo_failed")
            error_response.delete_cookie("oauth_state")
            return error_response

        google_user = user_response.json()

    # Only pass along what the frontend actually needs to display/identify
    # the user — never the Google access token itself.
    res = createUser(google_user)  # Create user in the database if not exists
    if res is None:
        error_response = RedirectResponse(f"{FRONTEND_URL}/login?error=user_creation_failed")
        error_response.delete_cookie("oauth_state")
        return error_response
    print("User Creation Result : ", res)
    session_payload = {
        "email": google_user.get("email"),
        "name": google_user.get("name"),
        "picture": google_user.get("picture"),
    }
    handoff_token = serializer.dumps(session_payload)

    redirect_response = RedirectResponse(f"{FRONTEND_URL}/auth/callback?token={handoff_token}")
    redirect_response.delete_cookie("oauth_state")
    return redirect_response

@authRouter.get("/verify")
async def verify_handoff_token(token: str):
    """
    Called by the Next.js SERVER (not the browser) right after the user
    lands back on /auth/callback, to exchange the short-lived handoff
    token for the actual user info. Keeps AUTH_TOKEN_SECRET only ever on
    the backend.
    """
    try:
        data = serializer.loads(token, max_age=HANDOFF_TOKEN_MAX_AGE_SECONDS)
    except SignatureExpired:
        return JSONResponse(status_code=401, content={"error": "Login link expired, please sign in again."})
    except BadSignature:
        return JSONResponse(status_code=400, content={"error": "Invalid login token."})

    return {"user": data}