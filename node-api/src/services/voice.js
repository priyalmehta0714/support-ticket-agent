// src/services/voice.js
// Twilio Voice — calls your phone when critical ticket needs approval
// Same Twilio account as WhatsApp — no new signup needed

const twilio = require('twilio');

async function makeVoiceCall({ ticketId, urgency, subject, customerPhone }) {
  // Check all required env vars are set
  if (
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN ||
    !process.env.OWNER_PHONE_NUMBER ||
    !process.env.TWILIO_VOICE_NUMBER
  ) {
    console.log('[VOICE] Not configured — skipping call for ticket', ticketId);
    return false;
  }

  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Clean the subject for safe URL encoding
    // Remove special characters that could break the URL
    const cleanSubject = subject
      .substring(0, 100)  // max 100 chars
      .replace(/[^\w\s]/gi, ' ');  // replace special chars with space

    await client.calls.create({
      to:   process.env.OWNER_PHONE_NUMBER,
      // YOUR phone number — the one that should ring
      // Format: +919876543210 (with country code, no spaces)
      
      from: process.env.TWILIO_VOICE_NUMBER,
      // Your Twilio voice-capable number
      // Different from WhatsApp sandbox number
      // Buy in Twilio console → Phone Numbers → Search → India/US → $1/month
      
      url: `${process.env.BASE_URL}/api/voice/twiml?` +
           `ticketId=${encodeURIComponent(ticketId)}&` +
           `urgency=${encodeURIComponent(urgency)}&` +
           `subject=${encodeURIComponent(cleanSubject)}`,
      // Twilio fetches this URL when you pick up
      // It gets TwiML (XML instructions) back — what to say, what to do
      // Must be publicly accessible — that's why BASE_URL is your Railway URL
      
      timeout: 30,
      // Ring for 30 seconds before giving up
      // If no answer, Twilio just stops — no voicemail

      statusCallback: `${process.env.BASE_URL}/api/voice/status`,
      statusCallbackMethod: 'POST'
      // Twilio will POST here when call ends
      // You can log: was it answered? What key did they press?
    });

    console.log(`[VOICE] Call initiated to ${process.env.OWNER_PHONE_NUMBER} for ticket ${ticketId}`);
    return true;

  } catch (err) {
    console.error('[VOICE ERROR]', err.message);
    return false;
  }
}

module.exports = { makeVoiceCall };