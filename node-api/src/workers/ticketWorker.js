// src/workers/ticketWorker.js
require('dotenv').config();
// dotenv must be first — workers run as separate processes
// They don't inherit env vars from index.js

const { Worker } = require('bullmq');
const axios = require('axios');
const db = require('../services/db');
const { scheduleEscalation } = require('../services/queue');
const { sendSlackNotification } = require('../services/slack');
const { notifyTicketProcessed } = require('../services/n8n');

// Auto-send decision function
// Returns true if safe to send without human approval
const shouldAutoSend = (classification, urgency, confidence) => {
  if (urgency === 'Critical') return false;
  // Never auto-send critical. Always needs human eyes.
  
  if (urgency === 'High') return false;
  // High urgency = significant impact. Don't risk wrong auto-reply.
  
  if (classification === 'Billing') return false;
  // Money topics = always human reviewed. Non-negotiable.
  
  if (confidence < 0.85) return false;
  // Agent is less than 85% sure = don't send automatically
  // This threshold is the key tuning parameter of the whole system
  
  return true;
  // Only Medium/Low, non-Billing, high-confidence tickets auto-send
};

const worker = new Worker('ticket-processing', async (job) => {
  const { ticketId, subject, body, customer_tier, source, customerPhone, customerName } = job.data;
  
  console.log(`[WORKER] Processing ticket ${ticketId}`);

  // Step 1: Mark as processing so dashboard shows progress
  await db.query(
    `UPDATE tickets SET status = 'processing', updated_at = NOW() WHERE id = $1`,
    [ticketId]
  );

  // Step 2: Call Python AI agent
  const response = await axios.post(
    `${process.env.PYTHON_SERVICE_URL}/agent/process`,
    { ticketId, subject, body, customer_tier, customer_name: customerName },
    {
      timeout: 90000,
      // 90 seconds: LLM calls can be slow on free-tier servers
      // If you're getting timeout errors, increase this
      headers: { 'Content-Type': 'application/json' }
    }
  );

  const {
    classification,
    urgency,
    reasoning,
    draft_reply,
    retrieved_docs,
    confidence,
    langfuse_trace_id
  } = response.data;

  // Step 3: Save agent decision to database
  await db.query(
    `INSERT INTO agent_decisions
       (ticket_id, classification, urgency, reasoning, draft_reply,
        retrieved_docs, confidence, langfuse_trace_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      ticketId,
      classification,
      urgency,
      reasoning,
      draft_reply,
      JSON.stringify(retrieved_docs || []),
      // JSON.stringify because retrieved_docs is an array
      // pg driver needs plain JS object for JSONB column
      confidence,
      langfuse_trace_id
    ]
  );

  const autoSent = shouldAutoSend(classification, urgency, confidence);
  let finalStatus;

  // Step 4: Decide — auto-send or human approval?
  if (autoSent) {
    // ── AUTO-SEND PATH ─────────────────────────────────────────────
    console.log(`[WORKER] Auto-sending ticket ${ticketId} (${classification}/${urgency}/${confidence})`);

    if (source === 'whatsapp' && customerPhone) {
      await axios.post(
        `${process.env.BASE_URL}/api/whatsapp/send-reply`,
        { customerPhone, message: draft_reply, ticketId }
      );
    }

    await db.query(
      `UPDATE agent_decisions
       SET human_action = 'auto_approved', final_reply = $2, decided_at = NOW()
       WHERE ticket_id = $1`,
      [ticketId, draft_reply]
    );

    await db.query(
      `UPDATE tickets SET status = 'sent', updated_at = NOW() WHERE id = $1`,
      [ticketId]
    );
    finalStatus = 'sent';

  } else {
    // ── HUMAN APPROVAL PATH ────────────────────────────────────────
    await db.query(
      `UPDATE tickets SET status = 'awaiting_approval', updated_at = NOW() WHERE id = $1`,
      [ticketId]
    );
    finalStatus = 'awaiting_approval';

    // Schedule escalation — fires if nobody approves within 15-30 minutes
    await scheduleEscalation(ticketId, urgency, subject, customerPhone);

    // Notify Slack for Critical tickets immediately
    if (urgency === 'Critical' || urgency === 'High') {
      await sendSlackNotification({
        text: `🎫 *New ticket needs approval*\n` +
              `*Priority:* ${urgency} | *Type:* ${classification}\n` +
              `*Issue:* ${subject}\n` +
              `*Confidence:* ${(confidence * 100).toFixed(0)}%\n` +
              `*Auto-send:* Blocked (${urgency === 'Critical' ? 'Critical ticket' : confidence < 0.85 ? 'Low confidence' : 'Billing topic'})\n` +
              `👉 <${process.env.FRONTEND_URL}/tickets/${ticketId}|Review & Approve>`
      });
    }
  }

  const ticketMeta = await db.query(
    `SELECT customer_name, customer_phone FROM tickets WHERE id = $1`,
    [ticketId]
  );
  const { customer_name, customer_phone } = ticketMeta.rows[0] || {};

  await notifyTicketProcessed(
    {
      ticketId,
      subject,
      body,
      source,
      customer_tier,
      customer_phone: customer_phone || customerPhone || null,
      customer_name: customer_name || null
    },
    {
      classification,
      urgency,
      reasoning,
      draft_reply,
      confidence,
      status: finalStatus,
      auto_sent: autoSent
    }
  ).catch(() => {});

  console.log(`[WORKER] Ticket ${ticketId} processed: ${classification}/${urgency}`);

}, {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD })
  },
  concurrency: 3
  // Process 3 tickets simultaneously
  // With 1: if a ticket takes 30s, the next waits 30s
  // With 3: three tickets process in parallel
  // Don't set too high — you'll hit OpenAI rate limits
});

worker.on('completed', (job) => {
  console.log(`[WORKER] Job ${job.id} completed`);
});

worker.on('failed', async (job, err) => {
  console.error(`[WORKER] Job ${job.id} failed: ${err.message}`);
  
  await db.query(
    `UPDATE tickets SET status = 'failed', updated_at = NOW() WHERE id = $1`,
    [job.data.ticketId]
  ).catch(() => {});
});

console.log('[WORKER] Ticket worker started');
module.exports = worker;