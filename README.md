# Support Ticket Agent (Aegis AI)

AI-powered support ticket platform that classifies incoming issues, drafts replies, routes critical cases for human approval, and escalates via **Twilio voice calls** and **WhatsApp**.

Built as a portfolio project demonstrating production-style backend architecture: queues, webhooks, multi-service Docker setup, and LLM agent workflows.

---

## Demo

| Resource | Link |
|----------|------|
| **Video demo (MP4)** | [demo/support-ticket-agent-demo.mp4](./demo/support-ticket-agent-demo.mp4) |
| **GitHub** | https://github.com/priyalmehta0714/support-ticket-agent |

---

## Features

- **Ticket ingestion** via web form or WhatsApp (Twilio)
- **Async processing** with BullMQ + Redis background workers
- **AI classification** (Bug / Billing / Feature / General) with urgency (Critical → Low)
- **Draft reply generation** with reasoning and confidence score
- **Human approval flow** for sensitive or critical tickets
- **Voice escalation** — Twilio calls owner; press 1 to approve, 2 for manual handling
- **Knowledge base** ingestion with vector search (Qdrant + OpenAI embeddings)
- **React dashboard** for supervisors to review and approve AI drafts
- **Webhook deduplication** for WhatsApp message retries

---

## Architecture

```text
WhatsApp / Web Form
        │
        ▼
   Node.js API (Express)
        │
        ├── PostgreSQL (tickets, decisions, audit)
        ├── Redis + BullMQ (async jobs)
        │
        ▼
   Python Agent (FastAPI + LangGraph)
        │
        ├── OpenAI (classification + draft reply)
        └── Qdrant (knowledge retrieval)

Critical tickets ──► Twilio Voice Call ──► Approve / Reject
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| `node-api` | 3000 | REST API, webhooks, BullMQ workers |
| `python-agent` | 8000 | LangGraph AI agent |
| `frontend` | 5173 | React supervisor dashboard |
| `postgres` | 5435 | Ticket database |
| `redis` | 6379 | Job queue |
| `qdrant` | 6333 | Vector store |

---

## Tech Stack

**Backend:** Node.js, Express, BullMQ, Redis, PostgreSQL, Twilio  
**AI:** Python, FastAPI, LangGraph, LangChain, OpenAI, Qdrant  
**Frontend:** React, Vite  
**Infra:** Docker Compose  

---

## Prerequisites

- Docker Desktop
- Node.js 20+
- OpenAI API key
- (Optional) Twilio account for WhatsApp + voice
- (Optional) ngrok for local webhook testing

---

## Local Setup

### 1. Clone and configure env

```bash
git clone https://github.com/priyalmehta0714/support-ticket-agent.git
cd support-ticket-agent
```

Create env files (never commit these):

**`node-api/.env`** — copy structure from comments in repo or use:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5435/tickets
REDIS_HOST=localhost
REDIS_PORT=6379
PYTHON_SERVICE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
BASE_URL=http://localhost:3000
OPENAI_API_KEY=sk-...
# Optional Twilio
# TWILIO_ACCOUNT_SID=
# TWILIO_AUTH_TOKEN=
# TWILIO_WHATSAPP_NUMBER=
# TWILIO_VOICE_NUMBER=
# OWNER_PHONE_NUMBER=
```

**`python-agent/.env`:**

```env
OPENAI_API_KEY=sk-...
QDRANT_URL=http://localhost:6333
```

### 2. Start backend (Docker)

```bash
docker compose up -d --build
```

Verify:

```bash
curl http://localhost:3000/health
curl http://localhost:8000/health
```

### 3. Start frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## API Quick Test

Create a ticket:

```bash
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d "{\"subject\":\"Production database is down\",\"body\":\"Database not responding. All users affected.\",\"customer_email\":\"demo@example.com\",\"customer_tier\":\"premium\"}"
```

List tickets:

```bash
curl http://localhost:3000/api/tickets
```

---

## Voice Escalation (Local + ngrok)

Twilio needs a public URL to reach your local API.

1. Start ngrok:
   ```bash
   ngrok http 3000
   ```
2. Set `BASE_URL` in `node-api/.env` to your ngrok HTTPS URL
3. Restart API: `docker compose restart node-api`
4. Create a **Critical** ticket — after escalation delay, your phone rings
5. Press **1** to approve and send reply, **2** for manual handling

Voice TwiML preview (local):

```
http://localhost:3000/api/voice/twiml?ticketId=<TICKET_ID>
```

---

## Project Structure

```text
support-ticket-agent/
├── node-api/          # Express API + BullMQ workers
├── python-agent/      # FastAPI + LangGraph AI agent
├── frontend/          # React dashboard
├── demo/              # Demo video + assets
├── docker-compose.yml
└── README.md
```

---

## Ticket Lifecycle

```text
pending → processing → awaiting_approval → sent
                    ↘ auto_approved → sent
                    ↘ rejected
                    ↘ escalated → sent (voice approved)
                    ↘ manual_required
                    ↘ failed
```

---

## Author

**Priyal Mehta**  
Backend Engineer | Node.js · TypeScript · NestJS · PostgreSQL · Redis · AI  

- GitHub: https://github.com/priyalmehta0714  
- LinkedIn: https://www.linkedin.com/in/priyal-shah-969101228  

---

## License

MIT
