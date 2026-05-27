// src/services/queue.js
// Manages BullMQ job queues
// Think of a queue like a to-do list stored in Redis
// Workers pick items off the list and process them one by one

const { Queue } = require('bullmq');

// Redis connection config
// Both queues use the same Redis instance
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  
  // If your Redis requires a password (Railway Redis does):
  ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD })
  // The ... spread means: only add password field if REDIS_PASSWORD exists
  // Without this, passing password: undefined causes Redis connection errors
};

// Main queue: processes incoming tickets through the AI agent
const ticketQueue = new Queue('ticket-processing', { connection });

// Escalation queue: fires delayed jobs when tickets aren't approved in time
const escalationQueue = new Queue('ticket-escalation', { connection });
// Why separate queue?
// If ticket-processing queue is backed up with 100 tickets,
// escalation jobs (which are time-sensitive) would wait behind them
// Separate queue = escalations always fire on schedule

async function addTicketJob(data) {
  await ticketQueue.add(
    'process-ticket',   // Job name — for logging and filtering
    data,               // The actual data: ticketId, subject, body etc
    {
      attempts: 3,
      // Retry up to 3 times if job fails
      // Covers: temporary network issues, LLM rate limits, timeout errors
      
      backoff: {
        type: 'exponential',
        delay: 3000
        // 1st retry: wait 3 seconds
        // 2nd retry: wait 6 seconds  
        // 3rd retry: wait 12 seconds
        // Exponential = each retry waits longer
        // This prevents hammering an API that's already struggling
      },
      
      removeOnComplete: { count: 100 },
      // Keep last 100 completed jobs in Redis for debugging
      // Don't keep ALL jobs — Redis would fill up over time
      
      removeOnFail: { count: 200 }
      // Keep more failed jobs — you need to investigate what went wrong
    }
  );
}

async function scheduleEscalation(ticketId, urgency, subject, customerPhone) {
  // Only escalate High and Critical tickets
  // Low/Medium can wait — no point waking someone up for a feature request
  if (!['Critical', 'High'].includes(urgency)) {
    console.log(`[QUEUE] No escalation needed for ${urgency} ticket ${ticketId}`);
    return;
  }

  // Critical escalates faster than High (override via .env for local testing)
  const delayMinutes = urgency === 'Critical'
    ? parseInt(process.env.ESCALATION_DELAY_CRITICAL_MINUTES || '15', 10)
    : parseInt(process.env.ESCALATION_DELAY_HIGH_MINUTES || '30', 10);
  const delayMs = delayMinutes * 60 * 1000;
  // 15 * 60 * 1000 = 900,000 milliseconds = 15 minutes
  
  await escalationQueue.add(
    'check-and-escalate',
    { ticketId, urgency, subject, customerPhone },
    {
      delay: delayMs,
      // BullMQ stores this in Redis and fires it EXACTLY after delayMs
      // Even if your server restarts — the job survives in Redis
      // This is why we use a queue and not setTimeout()
      // setTimeout() is in-memory — server restart = lost timer
      
      attempts: 2,
      // Retry escalation once if it fails (Twilio down etc)
      removeOnComplete: { count: 50 }
    }
  );

  console.log(`[QUEUE] Escalation scheduled for ticket ${ticketId} in ${delayMinutes} minutes`);
}

module.exports = { addTicketJob, scheduleEscalation };