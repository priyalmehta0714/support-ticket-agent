// src/workers/escalationWorker.js
require('dotenv').config();

const { Worker } = require('bullmq');
const db = require('../services/db');
const { makeVoiceCall } = require('../services/voice');
const { sendSlackNotification } = require('../services/slack');

const worker = new Worker('ticket-escalation', async (job) => {
  const { ticketId, urgency, subject, customerPhone } = job.data;
  
  console.log(`[ESCALATION] Checking ticket ${ticketId}`);

  // Check current status — ticket might have been approved already
  const result = await db.query(
    `SELECT status FROM tickets WHERE id = $1`,
    [ticketId]
  );

  if (!result.rows.length) {
    console.log(`[ESCALATION] Ticket ${ticketId} not found — skipping`);
    return;
  }

  if (result.rows[0].status !== 'awaiting_approval') {
    console.log(`[ESCALATION] Ticket ${ticketId} already ${result.rows[0].status} — no escalation needed`);
    return;
    // This is the most common case
    // Human approved in time — escalation fires but does nothing
    // This is correct behavior — better to schedule unnecessarily than miss an escalation
  }

  // Ticket still waiting — escalate
  console.log(`[ESCALATION] Ticket ${ticketId} still pending — escalating`);

  await db.query(
    `UPDATE tickets SET status = 'escalated', updated_at = NOW() WHERE id = $1`,
    [ticketId]
  );

  // Make voice call first — most effective at getting attention at night
  const callMade = await makeVoiceCall({ ticketId, urgency, subject, customerPhone });

  // Always also send Slack (in case call fails or phone is off)
  await sendSlackNotification({
    text: `🚨 *ESCALATION — Ticket not approved in time!*\n` +
          `*ID:* ${ticketId}\n` +
          `*Priority:* ${urgency}\n` +
          `*Issue:* ${subject}\n` +
          `*Voice call made:* ${callMade ? '✅ Yes' : '❌ Failed'}\n` +
          `🔴 *Immediate action required:* ${process.env.FRONTEND_URL}/tickets/${ticketId}`
  });

}, {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD })
  }
});

worker.on('failed', (job, err) => {
  console.error(`[ESCALATION WORKER FAILED] ${err.message}`);
});

console.log('[WORKER] Escalation worker started');
module.exports = worker;