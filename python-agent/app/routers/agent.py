# app/routers/agent.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..agent.graph import agent

router = APIRouter()

class ProcessRequest(BaseModel):
    ticketId: str
    subject: str
    body: str
    customer_tier: str = "free"
    customer_name: str | None = None

@router.post("/process")
async def process_ticket(req: ProcessRequest):
    try:
        final_state = agent.invoke({
            "ticket_id": req.ticketId,
            "subject": req.subject,
            "body": req.body,
            "customer_tier": req.customer_tier,
            "customer_name": req.customer_name,
            "classification": None,
            "urgency": None,
            "reasoning": None,
            "retrieved_docs": None,
            "draft_reply": None,
            "confidence": None,
            "langfuse_trace_id": None,
            "error": None
        })
        return {
            "classification":    final_state["classification"],
            "urgency":           final_state["urgency"],
            "reasoning":         final_state["reasoning"],
            "draft_reply":       final_state["draft_reply"],
            "retrieved_docs":    final_state["retrieved_docs"] or [],
            "confidence":        final_state["confidence"],
            "langfuse_trace_id": final_state["langfuse_trace_id"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))