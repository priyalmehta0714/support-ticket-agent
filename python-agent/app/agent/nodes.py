# app/agent/nodes.py
import json
from langchain_openai import ChatOpenAI
from langfuse import Langfuse
from .state import TicketState
from ..core.config import settings

llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0,
    openai_api_key=settings.OPENAI_API_KEY
)
if settings.LANGFUSE_PUBLIC_KEY and settings.LANGFUSE_SECRET_KEY:
    langfuse = Langfuse(
        public_key=settings.LANGFUSE_PUBLIC_KEY,
        secret_key=settings.LANGFUSE_SECRET_KEY
    )
else:
    class MockTrace:
        def __init__(self):
            self.id = "mock-trace-id"
        def update(self, *args, **kwargs):
            pass

    class MockLangfuse:
        def trace(self, *args, **kwargs):
            return MockTrace()
        def score(self, *args, **kwargs):
            pass

    langfuse = MockLangfuse()
    print("[LANGFUSE] Missing credentials. Running in mock trace mode.")

def classify_node(state: TicketState) -> TicketState:
    trace = langfuse.trace(
        name="ticket-classification",
        input={"subject": state["subject"], "body": state["body"]},
        metadata={"ticket_id": state["ticket_id"]}
    )

    prompt = f"""You are a customer support classifier. Respond ONLY with JSON.

Subject: {state["subject"]}
Body: {state["body"]}
Customer tier: {state["customer_tier"]}

Urgency rules:
- Critical: system down, production down, production database not working, data loss, security breach, OR enterprise + any blocker
- High: major feature broken, no workaround
- Medium: partial breakage, workaround exists
- Low: questions, feature requests

Respond with ONLY this JSON, nothing else:
{{"classification": "Bug", "urgency": "High", "reasoning": "2-3 sentences explaining why"}}

classification must be exactly one of: Bug, Billing, Feature Request, General
urgency must be exactly one of: Critical, High, Medium, Low"""

    response = llm.invoke(prompt)
    
    try:
        clean = response.content.strip()
        clean = clean.replace("```json", "").replace("```", "").strip()
        result = json.loads(clean)
    except json.JSONDecodeError:
        result = {
            "classification": "General",
            "urgency": "Medium",
            "reasoning": "Classification failed — defaulted for human review"
        }

    trace.update(output=result)

    return {
        **state,
        "classification": result.get("classification", "General"),
        "urgency": result.get("urgency", "Medium"),
        "reasoning": result.get("reasoning", ""),
        "langfuse_trace_id": trace.id
    }


def retrieve_node(state: TicketState) -> TicketState:
    from ..services.retriever import search_knowledge_base
    
    query = f"{state['subject']} {state['body']}"
    docs = search_knowledge_base(
        query=query,
        category=state["classification"],
        limit=3
    )
    return {**state, "retrieved_docs": docs}


def draft_node(state: TicketState) -> TicketState:
    docs = state.get("retrieved_docs") or []
    
    if docs:
        context = "\n\n".join([
            f"KB: {doc['title']}\n{doc['text']}"
            for doc in docs
        ])
    else:
        context = "No matching knowledge base entries found."

    prompt = f"""You are a helpful customer support agent. Write a reply.

Subject: {state["subject"]}
Body: {state["body"]}
Customer name: {state.get("customer_name") or "Customer"}
Type: {state["classification"]} | Priority: {state["urgency"]}

Knowledge base:
{context}

Rules:
- Be warm, concise, professional
- Address the customer by their actual name when available: {state.get("customer_name") or "Customer"}
- Do not write "Dear customer name" or "Dear Customer Name"
- Use KB content if relevant to give a concrete answer
- If no KB match: acknowledge the issue, say team investigates within 24 hours
- Sign off as "Support Team"
- Rate confidence 0.0-1.0 (1.0=KB had exact answer, 0.5=partial, 0.2=no match)

Respond ONLY with this JSON:
{{"draft_reply": "your reply here", "confidence": 0.85}}"""

    response = llm.invoke(prompt)
    
    try:
        clean = response.content.strip().replace("```json", "").replace("```", "").strip()
        result = json.loads(clean)
    except json.JSONDecodeError:
        result = {
            "draft_reply": f"Hi {state.get('customer_name') or 'there'},\n\nThank you for contacting support. Our team will review your message and respond within 24 hours.\n\nBest regards,\nSupport Team",
            "confidence": 0.2
        }

    langfuse.score(
        trace_id=state["langfuse_trace_id"],
        name="reply-confidence",
        value=result.get("confidence", 0.5)
    )

    return {
        **state,
        "draft_reply": result.get("draft_reply", ""),
        "confidence": result.get("confidence", 0.5)
    }