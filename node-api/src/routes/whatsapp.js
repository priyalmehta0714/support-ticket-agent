// src/routes/whatsapp.js
const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const { v4: uuidv4 } = require('uuid');
const db = require('../services/db');
const { addTicketJob } = require('../services/queue');
const { notifyNewTicket } = require('../services/n8n');

function isSupportMessage(message) {
  const text = message.toLowerCase().trim();
  if (isSmallTalkOrClosingMessage(text)) return false;

  return hasNewIssueSignal(text) || text.includes('?') || text.startsWith('how ');
}

function hasNewIssueSignal(message) {
  const text = message.toLowerCase().trim();
  const issueSignals = [
    'issue', 'problem', 'error', 'bug', 'not working', 'broken', 'down', 'failed', 'failure',
    'unable', 'cannot', "can't", 'stuck', 'help', 'urgent', 'complaint', 'refund', 'payment',
    'billing', 'login', 'access', 'data', 'database', 'production', 'slow', 'crash', 'compliment',
    'feedback', 'dashboard', 'report', 'attendance', 'employees'
  ];

  return issueSignals.some(signal => text.includes(signal));
}

function isSmallTalkOrClosingMessage(message) {
  const text = message.toLowerCase().trim().replace(/[!.]+$/g, '');
  return /^(hi|hii|hello|hey|good morning|good afternoon|good evening|namaste|thanks|thank you|okay thanks|ok thanks|okay thank you|ok thank you|got it|great|cool)$/i.test(text);
}

function isFollowUpMessage(message) {
  const text = message.toLowerCase().trim();
  if (hasNewIssueSignal(text)) return false;

  return (
    /^(yes|yes please|yeah|yep|ok|okay|sure|please do|go ahead|do that|proceed)$/i.test(text) ||
    text.includes('ask your team') ||
    text.includes('check further')
  );
}

async function getRecentWhatsappTicket(customerPhone) {
  const result = await db.query(
    `SELECT id, subject, status
     FROM tickets
     WHERE customer_phone = $1
       AND source = 'whatsapp'
       AND created_at > NOW() - INTERVAL '24 hours'
     ORDER BY created_at DESC
     LIMIT 1`,
    [customerPhone]
  );

  return result.rows[0] || null;
}

// POST /api/whatsapp/incoming
// Twilio calls this URL every time a customer sends a WhatsApp message
// Configure this URL in: Twilio Console → Messaging → Sandbox → Webhook
router.post('/incoming', async (req, res, next) => {
  try {
    // ── SECURITY: Verify request came from Twilio ──────────────────
    // Without this check, anyone who knows your URL can send fake tickets
    // Twilio signs every request using your Auth Token
    // We verify that signature to confirm it's really Twilio
    
    const twilioSignature = req.headers['x-twilio-signature'];
    const webhookUrl = `${process.env.BASE_URL}/api/whatsapp/incoming`;
    
    const isValidRequest = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      twilioSignature,
      webhookUrl,
      req.body
      // req.body must be the EXACT body Twilio sent
      // That's why we have express.urlencoded() in index.js
      // Twilio sends form-encoded data, not JSON
    );

    if (!isValidRequest && process.env.NODE_ENV === 'production') {
      console.warn('[WHATSAPP] Invalid Twilio signature — rejecting request');
      return res.status(403).send('Forbidden');
    }
    // We skip validation in development because ngrok URLs change
    // and validation sometimes fails. In production, always enforce.

    // ── Extract message data from Twilio payload ───────────────────
    const customerPhone = req.body.From;
    // Example: "whatsapp:+919876543210"
    // The "whatsapp:" prefix tells Twilio this is WhatsApp not SMS
    // We store it with prefix so we can reply to WhatsApp specifically

    const messageText = req.body.Body?.trim();
    const customerName = req.body.ProfileName || 'Customer';
    // ProfileName comes from WhatsApp profile
    // Not always available — depends on customer's privacy settings

    // ── Handle empty messages ──────────────────────────────────────
    if (!messageText) {
      // Customer sent image, audio, sticker — no text
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message(
        'Hi! Please describe your issue in a text message and we\'ll help you right away. 😊'
      );
      return res.type('text/xml').send(twiml.toString());
      // We MUST return TwiML XML — not JSON
      // Twilio only understands its own markup language for responses
    }

    const recentTicket = await getRecentWhatsappTicket(customerPhone);

    if (recentTicket && isFollowUpMessage(messageText)) {
      await db.query(
        `UPDATE tickets
         SET body = body || $2,
             status = CASE
               WHEN status IN ('sent', 'awaiting_approval', 'escalated') THEN 'awaiting_approval'
               ELSE status
             END,
             updated_at = NOW()
         WHERE id = $1`,
        [
          recentTicket.id,
          `\n\nCustomer follow-up (${new Date().toISOString()}): ${messageText}`
        ]
      );

      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message(
        `Sure ${customerName}, I have added this to your existing request. The team will check further and get back to you.`
      );
      return res.type('text/xml').send(twiml.toString());
    }

    if (isSmallTalkOrClosingMessage(messageText)) {
      const twiml = new twilio.twiml.MessagingResponse();
      const greetingOnly = /^(hi|hii|hello|hey|good morning|good afternoon|good evening|namaste)[!.]*$/i
        .test(messageText.trim());
      twiml.message(
        greetingOnly
          ? `Hi ${customerName}, how can we help you today? Please share the issue or feedback in a little more detail.`
          : `You're welcome ${customerName}.`
      );
      return res.type('text/xml').send(twiml.toString());
    }

    if (!isSupportMessage(messageText)) {
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message(
        `Hi ${customerName}, how can we help you today? Please share the issue or feedback in a little more detail.`
      );
      return res.type('text/xml').send(twiml.toString());
    }

    // ── Create ticket in database ──────────────────────────────────
    const ticketId = uuidv4();
    
    // Auto-generate subject from first 60 characters
    // WhatsApp users don't write subjects — they just type their problem
    const subject = messageText.length > 60
      ? messageText.substring(0, 60) + '...'
      : messageText;

    await db.query(
      `INSERT INTO tickets
         (id, subject, body, customer_phone, customer_name, customer_tier, source)
       VALUES ($1, $2, $3, $4, $5, 'free', 'whatsapp')`,
      [ticketId, subject, messageText, customerPhone, customerName]
    );

    // ── Queue for AI processing ────────────────────────────────────
    await addTicketJob({
      ticketId,
      subject,
      body: messageText,
      customer_tier: 'free',
      source: 'whatsapp',
      customerPhone,
      customerName
      // We pass customerPhone so the worker can send the reply back
    });

    notifyNewTicket({
      ticketId,
      subject,
      body: messageText,
      customer_tier: 'free',
      source: 'whatsapp',
      customer_phone: customerPhone,
      customer_name: customerName,
      status: 'pending'
    }).catch(() => {});

    // Return empty TwiML. The worker sends the actual reply if it can auto-resolve.
    // This avoids sending a generic "ticket opened" message right before the answer.
    const twiml = new twilio.twiml.MessagingResponse();
    res.type('text/xml').send(twiml.toString());

  } catch (err) {
    // Even on error, respond to Twilio — otherwise it retries the webhook 3 times
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Sorry, we encountered an issue. Please try again in a moment.');
    res.type('text/xml').send(twiml.toString());
    
    // Also log the real error
    console.error('[WHATSAPP INCOMING ERROR]', err.message);
  }
});

// POST /api/whatsapp/send-reply
// Called internally (by decisions.js or voice.js) when reply is approved
// NOT called by Twilio — called by YOUR OWN code
router.post('/send-reply', async (req, res, next) => {
  try {
    const { customerPhone, message, ticketId } = req.body;

    if (!customerPhone || !message) {
      return res.status(400).json({ error: 'customerPhone and message required' });
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      // Your Twilio sandbox number with whatsapp: prefix
      // Example: "whatsapp:+14155238886"
      
      to: customerPhone,
      // Customer's number — already has "whatsapp:" prefix from when they messaged
      
      body: message
    });

    // Log the send for audit purposes
    console.log(`[WHATSAPP] Reply sent to ${customerPhone} for ticket ${ticketId}`);

    res.json({ success: true });

  } catch (err) {
    next(err);
  }
});

module.exports = router;