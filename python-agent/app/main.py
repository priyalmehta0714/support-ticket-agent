# app/main.py
from fastapi import FastAPI
from .routers import agent, knowledge

app = FastAPI(title="Support Agent AI Service")
app.include_router(agent.router,    prefix="/agent")
app.include_router(knowledge.router, prefix="/knowledge")

@app.get("/health")
def health():
    return {"status": "ok"}