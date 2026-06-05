# Support Ticket Agent — 2-Minute Demo Video Script

## Before recording (5 min setup)

1. Start backend:
   ```powershell
   cd "D:\Priyal work\Projects\support-ticket-agent"
   docker compose up -d
   ```

2. Start frontend:
   ```powershell
   cd "D:\Priyal work\Projects\support-ticket-agent\frontend"
   npm run dev
   ```

3. Start ngrok (separate terminal):
   ```powershell
   ngrok http 3000
   ```

4. Open tabs:
   - Dashboard: http://localhost:5173
   - Ngrok inspector: http://127.0.0.1:4040

5. Install Loom (free): https://www.loom.com

---

## Record in 2 minutes

### Option A — Automated (easiest)

1. Open **Loom** → Start screen recording
2. Run:
   ```powershell
   cd "D:\Priyal work\Projects\support-ticket-agent"
   powershell -ExecutionPolicy Bypass -File .\scripts\record-demo.ps1
```
3. Switch to **dashboard** when script says "show dashboard"
4. Click **Approve** on the critical ticket
5. Stop Loom

### Option B — Manual (more polished)

| Time | Show | Say |
|------|------|-----|
| 0:00 | Dashboard | "AI support ticket agent with Node.js, BullMQ, Python LangGraph, and Twilio." |
| 0:20 | Create ticket: "Production database is down" | "Ticket enters Redis queue for AI processing." |
| 0:40 | Ticket detail: Bug / Critical / draft reply | "AI classifies urgency and drafts a reply." |
| 1:00 | Click Approve | "Critical tickets need human approval before sending." |
| 1:20 | ngrok inspector OR TwiML URL in browser | "Webhooks and voice calls use ngrok in local dev." |
| 1:40 | VS Code folder structure | "Node API, Python agent, React dashboard, Docker." |
| 2:00 | GitHub repo | "Link in description." |

---

## Voice call in video (pick one)

**Without real call:** Open in browser:
```
https://charred-pork-cricket.ngrok-free.dev/api/voice/twiml?ticketId=<TICKET_ID>
```
Show XML — say Twilio reads this when your phone rings.

**With real call:** Create Critical ticket → wait 1 min → phone rings → press 1.

---

## Do NOT show on screen

- `.env` files
- API keys, Twilio tokens, Slack webhooks

---

## After upload

- Title: **Support Ticket Agent — AI Ticket Automation (Local Demo)**
- Add Loom link to GitHub README and resume
