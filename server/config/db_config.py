# config/db_config.py

import os
import psycopg
from dotenv import load_dotenv
load_dotenv()


SUPABASE_DB_URL = os.getenv('DB_URL')

def get_connection():
    try:
        conn = psycopg.connect(SUPABASE_DB_URL)
        return conn

    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

