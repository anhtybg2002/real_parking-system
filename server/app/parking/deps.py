# app/parking/deps.py
from app.db import SessionLocal
import json

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def dump_map_data(obj):
    try:
        return json.dumps(obj or {}, ensure_ascii=False)
    except Exception:
        return json.dumps({}, ensure_ascii=False)
