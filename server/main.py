from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.db_config import get_connection

from routes.auth import authRouter

app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(authRouter,prefix='/auth',tags=['Auth'])

@app.get('/')
def greet():
    return{
        "code":200,
        "Message":"Greeting from FastAPI server"
    }

@app.get('/health')
def health_check():
    try:
        conn = get_connection()
        if conn is None:
            return{
                "code":500,
                "Message":"Database connection failed"
            }
    except Exception as e:
        print(f"Error occurred: {e}")
        return{
            "code":500,
            "Message":"Error occurred while checking health"
        }
    return{
        "code":200,
        "Message":"Health check passed"
    }

