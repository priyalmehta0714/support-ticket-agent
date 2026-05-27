// src/routes/tickets.js
const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { addTicketJob } = require('../services/queue');
const { notifyNewTicket } = require('../services/n8n');
const { v4: uuidv4 } = require('uuid');

// POST /api/tickets
// Web form submission — for testing without WhatsApp
router.post('/', async (req, res, next) => {
  try {
    const { subject, body, customer_email, customer_tier = 'free' } = req.body;

    if (!subject?.trim() || !body?.trim()) {
      return res.status(400).json({ error: 'subject and body are required' });
    }

    const id = uuidv4();

    await db.query(
      `INSERT INTO tickets (id, subject, body, customer_phone, customer_tier, source)
       VALUES ($1, $2, $3, $4, $5, 'web')`,
      [id, subject.trim(), body.trim(), customer_email || null, customer_tier]
    );

    await addTicketJob({
      ticketId: id,
      subject: subject.trim(),
      body: body.trim(),
      customer_tier,
      source: 'web',
      customerPhone: null
    });

    notifyNewTicket({
      ticketId: id,
      subject: subject.trim(),
      body: body.trim(),
      customer_tier,
      source: 'web',
      customer_email: customer_email || null,
      status: 'pending'
    }).catch(() => {});

    res.status(202).json({
      ticketId: id,
      status: 'pending',
      message: 'Ticket received and queued for processing'
    });

  } catch (err) {
    next(err);
  }
});

// GET /api/tickets
// Returns all tickets — used by React dashboard
router.get('/', async (req, res, next) => {
  try {
    const { status, limit = 50 } = req.query;

    const query = `
      SELECT
        t.id,
        t.subject,
        t.body,
        t.customer_phone,
        t.customer_name,
        t.customer_tier,
        t.source,
        t.status,
        t.created_at,
        t.updated_at,
        ad.classification,
        ad.urgency,
        ad.confidence,
        ad.draft_reply,
        ad.reasoning,
        ad.human_action
      FROM tickets t
      LEFT JOIN agent_decisions ad ON ad.ticket_id = t.id
      ${status ? 'WHERE t.status = $1' : ''}
      ORDER BY t.created_at DESC
      LIMIT ${parseInt(limit)}
    `;
    // LEFT JOIN: show tickets even without agent decision yet
    // The classification/urgency columns will just be null for pending tickets

    const result = status
      ? await db.query(query, [status])
      : await db.query(query);

    res.json(result.rows);

  } catch (err) {
    next(err);
  }
});

// GET /api/tickets/:id
// Single ticket with full details
router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT
        t.*,
        ad.classification,
        ad.urgency,
        ad.reasoning,
        ad.draft_reply,
        ad.retrieved_docs,
        ad.confidence,
        ad.langfuse_trace_id,
        ad.human_action,
        ad.final_reply,
        ad.decided_at
       FROM tickets t
       LEFT JOIN agent_decisions ad ON ad.ticket_id = t.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    next(err);
  }
});

// DELETE /api/tickets/:id
// Removes a ticket and its agent decision (agent_decisions cascades in schema)
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM tickets WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ success: true, deletedTicketId: result.rows[0].id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;