// src/config/n8nWebhookPayload.js
// JSON bodies sent to n8n — keep in sync with n8n-payload.example.json

const N8N_EVENTS = {
  NEW_TICKET: 'new_ticket',
  TICKET_PROCESSED: 'ticket_processed'
};

function dashboardUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

function buildNewTicketPayload(ticket) {
  return {
    event: N8N_EVENTS.NEW_TICKET,
    timestamp: new Date().toISOString(),
    ticketId: ticket.ticketId,
    subject: ticket.subject,
    body: ticket.body,
    source: ticket.source,
    status: ticket.status || 'pending',
    customer_tier: ticket.customer_tier || 'free',
    customer_phone: ticket.customer_phone || null,
    customer_name: ticket.customer_name || null,
    customer_email: ticket.customer_email || null,
    dashboard_url: dashboardUrl()
  };
}

function buildTicketProcessedPayload(ticket, agent) {
  return {
    event: N8N_EVENTS.TICKET_PROCESSED,
    timestamp: new Date().toISOString(),
    ticketId: ticket.ticketId,
    subject: ticket.subject,
    body: ticket.body,
    source: ticket.source,
    status: agent.status,
    customer_tier: ticket.customer_tier || 'free',
    customer_phone: ticket.customer_phone || null,
    customer_name: ticket.customer_name || null,
    customer_email: ticket.customer_email || null,
    classification: agent.classification,
    urgency: agent.urgency,
    confidence: agent.confidence,
    reasoning: agent.reasoning,
    draft_reply: agent.draft_reply,
    auto_sent: agent.auto_sent,
    dashboard_url: dashboardUrl()
  };
}

module.exports = {
  N8N_EVENTS,
  buildNewTicketPayload,
  buildTicketProcessedPayload
};
