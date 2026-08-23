from fastapi import FastAPI, UploadFile, File, Depends, Form, HTTPException
from typing import Optional
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from database import get_db, engine, Base
import models
from schemas.artifact import StandardArtifact
from services.ingestion import parse_markdown, parse_pdf, parse_chatgpt_json, parse_claude_json
from services.retrieval import index_artifact, search_and_synthesize
from pydantic import BaseModel

from sqlalchemy import text

# Create tables (for testing, normally use Alembic)
try:
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning: Could not connect to database to create tables. Is PostgreSQL running? Error: {e}")

app = FastAPI(title="Git for Research API", description="Ingestion and Retrieval API")

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/ingest/markdown", response_model=StandardArtifact)
def ingest_markdown(title: str = Form(...), parent_id: Optional[str] = Form(None), file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = file.file.read().decode("utf-8")
    standard_artifact = parse_markdown(content, title)
    index_artifact(db, standard_artifact, parent_id)
    return standard_artifact

@app.post("/api/ingest/pdf", response_model=StandardArtifact)
def ingest_pdf(title: str = Form(...), parent_id: Optional[str] = Form(None), file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_bytes = file.file.read()
    standard_artifact = parse_pdf(file_bytes, title)
    index_artifact(db, standard_artifact, parent_id)
    return standard_artifact

@app.post("/api/ingest/chat/chatgpt", response_model=StandardArtifact)
def ingest_chatgpt(title: str = Form(...), parent_id: Optional[str] = Form(None), file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = file.file.read().decode("utf-8")
    standard_artifact = parse_chatgpt_json(content, title)
    index_artifact(db, standard_artifact, parent_id)
    return standard_artifact

@app.post("/api/ingest/chat/claude", response_model=StandardArtifact)
def ingest_claude(title: str = Form(...), parent_id: Optional[str] = Form(None), file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = file.file.read().decode("utf-8")
    standard_artifact = parse_claude_json(content, title)
    index_artifact(db, standard_artifact, parent_id)
    return standard_artifact

class SearchQuery(BaseModel):
    query: str

@app.post("/api/search")
def search(query: SearchQuery, db: Session = Depends(get_db)):
    result = search_and_synthesize(db, query.query)
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
