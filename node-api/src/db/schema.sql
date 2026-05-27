-- This file runs automatically when Docker starts Postgres for the first time
-- It creates all your tables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- This extension gives us uuid_generate_v4() function
-- Without it, DEFAULT uuid_generate_v4() below would throw an error

CREATE TABLE IF NOT EXISTS tickets (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- UUID = random unique ID like "a3f9b2c1-..."
  -- Much better than 1,2,3 because it doesn't leak how many tickets you have
  
  subject        TEXT NOT NULL,
  body           TEXT NOT NULL,
  customer_phone TEXT,
  -- Stores WhatsApp number like "whatsapp:+919876543210"
  -- The "whatsapp:" prefix comes from Twilio — we keep it so we can reply back
  
  customer_name  TEXT,
  customer_tier  TEXT DEFAULT 'free',
  -- free / pro / enterprise
  -- Affects urgency assessment — enterprise critical = wake someone up
  
  source         TEXT DEFAULT 'web',
  -- 'whatsapp' or 'web'
  -- Important: WhatsApp tickets need reply sent via Twilio
  -- Web tickets just show in dashboard
  
  status         TEXT DEFAULT 'pending',
  -- Full lifecycle:
  -- pending → processing → awaiting_approval → sent
  --                     ↘ auto_approved → sent
  --                     ↘ rejected
  --                     ↘ escalated → sent (via voice approval)
  --                     ↘ manual_required
  --                     ↘ failed
  
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_decisions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id         UUID REFERENCES tickets(id) ON DELETE CASCADE,
  -- ON DELETE CASCADE means: if ticket is deleted, this row is also deleted
  -- Keeps your DB clean — no orphaned rows
  
  classification    TEXT,
  -- Bug / Billing / Feature Request / General
  
  urgency           TEXT,
  -- Critical / High / Medium / Low
  
  reasoning         TEXT,
  -- The WHY behind classification
  -- This is what builds human trust in the system
  -- When reviewer sees the reasoning, they can evaluate the decision
  
  draft_reply       TEXT,
  retrieved_docs    JSONB,
  -- JSONB = stored as binary JSON, queryable and indexable
  -- Stores array of KB chunks that were used to write the reply
  
  confidence        FLOAT,
  -- 0.0 to 1.0
  -- Used by auto-send logic: < 0.85 = don't auto-send
  
  langfuse_trace_id TEXT,
  -- Links to Langfuse dashboard for full decision audit
  -- When client asks "why did AI say this?" — show them the trace
  
  human_action      TEXT,
  -- approved / rejected / auto_approved / voice_approved / edited
  
  final_reply       TEXT,
  -- What was actually sent — may differ from draft_reply if human edited it
  
  decided_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_base (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  category   TEXT,
  -- Bug / Billing / Feature Request / General
  -- Matches ticket classification so we only search relevant entries
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes make queries fast
-- Without index: Postgres reads every row to find matches (full table scan)
-- With index: Postgres jumps directly to matching rows (like a book index)
CREATE INDEX IF NOT EXISTS idx_tickets_status 
  ON tickets(status);
-- Used constantly: "show me all awaiting_approval tickets"

CREATE INDEX IF NOT EXISTS idx_tickets_phone  
  ON tickets(customer_phone);
-- Used when customer messages again: "find tickets from this number"

CREATE INDEX IF NOT EXISTS idx_decisions_ticket 
  ON agent_decisions(ticket_id);
-- Used in JOIN queries to get ticket + decision together

-- Insert sample knowledge base entries so agent has something to search
-- Replace these with your actual FAQs
INSERT INTO knowledge_base (title, content, category) VALUES
(
  'Payment failed but money deducted',
  'If a payment fails but money was deducted, this is typically a bank hold that reverses within 3-5 business days. Ask the customer to check their bank statement after 5 days. If the amount does not reverse, collect their transaction ID and escalate to the billing team at billing@yourcompany.com',
  'Billing'
),
(
  'Account access issues',
  'For account access problems: 1) Clear browser cache and cookies 2) Try incognito/private window 3) Reset password via forgot password link 4) If issue persists, collect the account email and error message for engineering team',
  'Bug'  
),
(
  'Refund policy',
  'We offer full refunds within 14 days of purchase for annual plans and within 7 days for monthly plans. To process a refund, collect the customer email and order ID. Refunds process within 5-7 business days back to the original payment method.',
  'Billing'
),
(
  'How to export data',
  'Data export is available under Settings → Account → Export Data. The export includes all records in CSV format. Large exports may take up to 30 minutes and will be emailed when ready.',
  'General'
);