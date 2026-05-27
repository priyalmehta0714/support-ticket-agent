// src/routes/decisions.js
const express = require('express');
const router = express.Router();
const db = require('../services/db');
const axios = require('axios');
const { sendSlackNotification } = require('../services/slack');

// POST /api/decisions/:ticketId/approve
// Called when human clicks Approve in dashboard
router.post('/:ticketId/approve', async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { final_reply } = req.body;
    // final_reply: human may have edited the draft before approving
    // If not edited, final_reply is undefined — we use the draft

    const decisionResult = await db.query(
      `SELECT ad.draft_reply, t.source, t.customer_phone
       FROM agent_decisions ad
       JOIN tickets t ON t.id = ad.ticket_id
       WHERE ad.ticket_id = $1`,
      [ticketId]
    );

    if (!decisionResult.rows.length) {
      return res.status(404).json({ error: 'No agent decision found' });
    }

    const { draft_reply, source, customer_phone } = decisionResult.rows[0];
    const replyToSend = final_reply?.trim() || draft_reply;

    // Update decision
    await db.query(
      `UPDATE agent_decisions
       SET human_action = $2,
           final_reply  = $3,
           decided_at   = NOW()
       WHERE ticket_id = $1`,
      [ticketId, final_reply ? 'edited' : 'approved', replyToSend]
      // Track whether human approved as-is or edited first
      // 'edited' vs 'approved' tells you how often agent drafts need human correction
    );

    await db.query(
      `UPDATE tickets SET status = 'sent', updated_at = NOW() WHERE id = $1`,
      [ticketId]
    );

    // Send via WhatsApp if ticket came from WhatsApp
    if (source === 'whatsapp' && customer_phone) {
      await axios.post(
        `${process.env.BASE_URL}/api/whatsapp/send-reply`,
        { customerPhone: customer_phone, message: replyToSend, ticketId }
      );
    }
    // If source = 'web', the reply just shows in dashboard
    // In production you'd email it — add SendGrid here

    res.json({ success: true, reply_sent: replyToSend });

  } catch (err) {
    next(err);
  }
});

// POST /api/decisions/:ticketId/reject
// Human rejects the agent's draft entirely
router.post('/:ticketId/reject', async (req, res, next) => {
  try {
    const { reason } = req.body;

    await db.query(
      `UPDATE agent_decisions
       SET human_action = 'rejected', decided_at = NOW()
       WHERE ticket_id = $1`,
      [req.params.ticketId]
    );

    await db.query(
      `UPDATE tickets SET status = 'rejected', updated_at = NOW() WHERE id = $1`,
      [req.params.ticketId]
    );

    await sendSlackNotification({
      text: `⚠️ Agent reply rejected\n` +
            `Ticket: ${req.params.ticketId}\n` +
            `Reason: ${reason || 'Not specified'}\n` +
            `Needs manual reply: ${process.env.FRONTEND_URL}/tickets/${req.params.ticketId}`
    });

    res.json({ success: true });

  } catch (err) {
    next(err);
  }
});

module.exports = router;