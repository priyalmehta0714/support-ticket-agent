    // src/routes/voice.js
// Handles the phone call flow when escalation fires
const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const db = require('../services/db');
const axios = require('axios');

function speechSafe(value, maxLength = 280) {
  return String(value || '')
    .replace(/[^\w\s.,!?-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, maxLength);
}

function redirectToPrompt(twiml, ticketId) {
  twiml.redirect(
    { method: 'POST' },
    `${process.env.BASE_URL}/api/voice/twiml?ticketId=${encodeURIComponent(ticketId)}`
  );
}

// GET/POST /api/voice/twiml
// Twilio fetches this URL when you pick up the phone call
// Must return TwiML XML — the script of what Twilio says to you
router.all('/twiml', async (req, res) => {
  const { ticketId } = req.query;
  console.log(`[VOICE TWIML] Serving call prompt for ticket ${ticketId}`);

  const twiml = new twilio.twiml.VoiceResponse();
  // VoiceResponse for calls (MessagingResponse was for WhatsApp/SMS)

  const result = await db.query(
    `SELECT
       t.subject,
       t.body,
       t.customer_name,
       t.customer_phone,
       ad.urgency,
       ad.classification,
       ad.reasoning,
       ad.draft_reply
     FROM tickets t
     LEFT JOIN agent_decisions ad ON ad.ticket_id = t.id
     WHERE t.id = $1`,
    [ticketId]
  );

  if (!result.rows.length) {
    twiml.say(
      { voice: 'Polly.Aditi', language: 'en-IN' },
      'Hello. I could not find this support ticket. Please check the dashboard manually. Goodbye.'
    );
    return res.type('text/xml').send(twiml.toString());
  }

  const ticket = result.rows[0];
  const customerName = speechSafe(ticket.customer_name || ticket.customer_phone || 'the customer', 80);
  const urgency = speechSafe(ticket.urgency || req.query.urgency || 'urgent', 40);
  const classification = speechSafe(ticket.classification || 'support', 40);
  const issueSummary = speechSafe(ticket.reasoning || ticket.subject || ticket.body, 320);

  // Gather = wait for keypad input from you
  const gather = twiml.gather({
    numDigits: 1,
    // Wait for exactly 1 digit press
    
    action: `${process.env.BASE_URL}/api/voice/keypress?ticketId=${encodeURIComponent(ticketId)}`,
    // When you press a key, Twilio POSTs to this URL
    
    timeout: 60,
    // Wait 60 seconds for key press; if no response, redirect and repeat.
    finishOnKey: ''
  });

  gather.pause({ length: 1 });

  gather.say(
    { voice: 'Polly.Aditi', language: 'en-IN' },
    `Hello. This is Aegis AI calling about an urgent support ticket. ` +
    `There is a ${urgency} ${classification} issue from ${customerName}. ` +
    `Summary: ${issueSummary}. ` +
    `Press 1 to approve and send the AI drafted reply on WhatsApp. ` +
    `Press 2 for manual handling. Press 9 to repeat this message.`
  );

  gather.pause({ length: 5 });

  gather.say(
    { voice: 'Polly.Aditi', language: 'en-IN' },
    'I am still waiting. Press 1 to send the WhatsApp reply. Press 2 for manual handling. Press 9 to repeat.'
  );

  // No input received after 60 seconds: repeat instead of hanging up.
  redirectToPrompt(twiml, ticketId);

  res.type('text/xml').send(twiml.toString());
});

// POST /api/voice/keypress
// Fires when you press a key during the call
router.post('/keypress', async (req, res) => {
  const { ticketId } = req.query;
  const digit = req.body.Digits;
  // Digits = the key you pressed as a string: "1", "2", or "9"
  console.log(`[VOICE KEYPRESS] Ticket ${ticketId}, digit=${digit || 'none'}`);

  const twiml = new twilio.twiml.VoiceResponse();

  if (digit === '1') {
    // APPROVE — send the agent's draft reply immediately
    try {
      const decisionResult = await db.query(
        `SELECT ad.draft_reply, t.customer_phone, t.source
         FROM agent_decisions ad
         JOIN tickets t ON t.id = ad.ticket_id
         WHERE ad.ticket_id = $1`,
        [ticketId]
      );

      if (decisionResult.rows.length && decisionResult.rows[0].draft_reply) {
        const { draft_reply, customer_phone, source } = decisionResult.rows[0];

        // Send WhatsApp reply if ticket came from WhatsApp
        if (source === 'whatsapp' && customer_phone) {
          await axios.post(
            `${process.env.BASE_URL}/api/whatsapp/send-reply`,
            { customerPhone: customer_phone, message: draft_reply, ticketId }
          );
        }

        // Update database records
        await db.query(
          `UPDATE agent_decisions
           SET human_action = 'voice_approved',
               final_reply  = $2,
               decided_at   = NOW()
           WHERE ticket_id = $1`,
          [ticketId, draft_reply]
        );

        await db.query(
          `UPDATE tickets SET status = 'sent', updated_at = NOW() WHERE id = $1`,
          [ticketId]
        );

        twiml.say(
          { voice: 'Polly.Aditi', language: 'en-IN' },
          'Reply approved and sent to the customer.Goodbye.'
        );

      } else {
        twiml.say(
          { voice: 'Polly.Aditi', language: 'en-IN' },
          'Could not find the draft reply. Please check the dashboard manually. Goodbye.'
        );
      }

    } catch (err) {
      console.error('[VOICE KEYPRESS ERROR]', err.message);
      twiml.say(
        { voice: 'Polly.Aditi', language: 'en-IN' },
        'An error occurred. Please check the dashboard manually. Goodbye.'
      );
    }

  } else if (digit === '2') {
    // MANUAL — flag for human handling
    await db.query(
      `UPDATE tickets SET status = 'manual_required', updated_at = NOW() WHERE id = $1`,
      [ticketId]
    ).catch(err => console.error('[VOICE DB ERROR]', err.message));

    twiml.say(
      { voice: 'Polly.Aditi', language: 'en-IN' },
      'Ticket marked for manual handling. Your team will be notified. Goodbye.'
    );

  } else if (digit === '9') {
    // REPLAY — hear the ticket again
    redirectToPrompt(twiml, ticketId);
    // redirect tells Twilio to fetch TwiML from another URL
    // Effectively restarts the call script
  } else {
    twiml.say(
      { voice: 'Polly.Aditi', language: 'en-IN' },
      'I did not understand that key.'
    );
    redirectToPrompt(twiml, ticketId);
  }

  res.type('text/xml').send(twiml.toString());
});

// POST /api/voice/status
// Twilio calls this when the call ends — for logging
router.post('/status', (req, res) => {
  const { CallStatus, To, CallDuration } = req.body;
  console.log(`[VOICE STATUS] Call to ${To}: ${CallStatus}, duration: ${CallDuration}s`);
  res.sendStatus(200);
  // 200 = "got it, thanks"
  // Twilio doesn't care about the response body here
});

module.exports = router;