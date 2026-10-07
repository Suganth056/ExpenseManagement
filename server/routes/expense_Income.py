# routes/expense_Income.py
# pip install pyjwt
import os
import datetime as dt
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from psycopg.rows import dict_row

from config.db_config import get_connection
from config.settings import EXPENSE_TABLE

expense_router = APIRouter()
T = f'"{EXPENSE_TABLE}"'  # camelCase table name must be quoted in Postgres
COLS = 'id, "Date" AS date, type, amount, expense_type, "Remarks" AS remarks'


class Entry(BaseModel):
    date: dt.date
    type: str  # "Income" | "Expense"
    amount: float
    expense_type: Optional[str] = None
    remarks: Optional[str] = None


def current_email(request: Request, authorization: Optional[str] = Header(None)) -> str:
    """Verifies the session JWT sent as a bearer token or an HttpOnly cookie."""
    token = request.cookies.get("session")
    if authorization:
        scheme, separator, credentials = authorization.partition(" ")
        if not separator or scheme.lower() != "bearer" or not credentials:
            raise HTTPException(status_code=401, detail="Unauthorized")
        token = credentials
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")

    secret = os.getenv("SESSION_SECRET")
    if not secret:
        raise HTTPException(status_code=500, detail="Session authentication is not configured")

    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        email = payload.get("email")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if not isinstance(email, str) or not email:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return email


def run(sql, params=()):
    with get_connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(sql, params)
        return cur.fetchall() if cur.description else []


@expense_router.get("/")
def list_entries(email: str = Depends(current_email)):
    return run(f'SELECT {COLS} FROM {T} WHERE user_email=%s ORDER BY "Date" DESC, id DESC', (email,))


@expense_router.post("/")
def add_entry(e: Entry, email: str = Depends(current_email)):
    exp = e.expense_type if e.type == "Expense" else None
    rows = run(
        f'INSERT INTO {T} (user_email, "Date", type, amount, expense_type, "Remarks") '
        f"VALUES (%s,%s,%s,%s,%s,%s) RETURNING {COLS}",
        (email, e.date, e.type, e.amount, exp, e.remarks),
    )
    return rows[0]


@expense_router.put("/{entry_id}")
def update_entry(entry_id: int, e: Entry, email: str = Depends(current_email)):
    exp = e.expense_type if e.type == "Expense" else None
    rows = run(
        f'UPDATE {T} SET "Date"=%s, type=%s, amount=%s, expense_type=%s, "Remarks"=%s '
        f"WHERE id=%s AND user_email=%s RETURNING {COLS}",
        (e.date, e.type, e.amount, exp, e.remarks, entry_id, email),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Not found")
    return rows[0]


@expense_router.delete("/{entry_id}")
def delete_entry(entry_id: int, email: str = Depends(current_email)):
    run(f"DELETE FROM {T} WHERE id=%s AND user_email=%s", (entry_id, email))
    return {"deleted": entry_id}