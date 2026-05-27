# app/agent/state.py
from typing import TypedDict, Optional, List

class TicketState(TypedDict):
    ticket_id: str
    subject: str
    body: str
    customer_tier: str
    customer_name: Optional[str]
    classification: Optional[str]
    urgency: Optional[str]
    reasoning: Optional[str]
    retrieved_docs: Optional[List[dict]]
    draft_reply: Optional[str]
    confidence: Optional[float]
    langfuse_trace_id: Optional[str]
    error: Optional[str]