// src/services/slack.js
const axios = require('axios');

// Slack Incoming Webhooks — simplest way to send Slack messages
// No OAuth, no app installation complexity
// Just POST a JSON payload to a URL
// Limitation: can only post to ONE channel (the one you picked when creating the webhook)
// If you need to post to multiple channels, you'd need the full Slack API
// For this project, one channel is fine

async function sendSlackNotification({ text }) {
  if (!process.env.SLACK_WEBHOOK_URL) {
    // Slack is optional — don't crash if not configured
    console.log('[SLACK SKIPPED]', text.substring(0, 100));
    return false;
  }

  try {
    await axios.post(
      process.env.SLACK_WEBHOOK_URL,
      { text },
      { timeout: 5000 }
      // 5 second timeout
      // If Slack takes longer than 5s, something is wrong — don't wait forever
    );
    return true;
  } catch (err) {
    // NEVER let Slack failure crash your main business logic
    // Slack is a notification system, not a critical path
    // Log it and move on
    console.error('[SLACK ERROR]', err.message);
    return false;
  }
}

module.exports = { sendSlackNotification };