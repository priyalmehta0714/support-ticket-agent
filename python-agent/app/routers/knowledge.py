# app/routers/knowledge.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..services.retriever import ingest_knowledge

router = APIRouter()

class KnowledgeRequest(BaseModel):
    id: str
    title: str
    content: str
    category: str = "General"

@router.post("/ingest")
async def ingest(req: KnowledgeRequest):
    try:
        ingest_knowledge(req.id, req.title, req.content, req.category)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))