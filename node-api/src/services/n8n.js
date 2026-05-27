// src/services/n8n.js
const axios = require('axios');
const {
  buildNewTicketPayload,
  buildTicketProcessedPayload
} = require('../config/n8nWebhookPayload');

async function postToN8n(payload) {
  if (!process.env.N8N_WEBHOOK_URL) {
    console.log('[N8N SKIPPED] N8N_WEBHOOK_URL not set');
    return false;
  }

  try {
    await axios.post(process.env.N8N_WEBHOOK_URL, payload, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`[N8N] ${payload.event} sent for ticket ${payload.ticketId}`);
    return true;
  } catch (err) {
    const detail = err.response?.data
      ? JSON.stringify(err.response.data)
      : err.message;
    console.error(`[N8N ERROR] ${payload.event}:`, err.response?.status || '', detail);
    return false;
  }
}

async function notifyNewTicket(ticket) {
  return postToN8n(buildNewTicketPayload(ticket));
}

async function notifyTicketProcessed(ticket, agent) {
  return postToN8n(buildTicketProcessedPayload(ticket, agent));
}

module.exports = { notifyNewTicket, notifyTicketProcessed, postToN8n };
