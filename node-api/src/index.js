// src/index.js — main entry point
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();

// ── Middleware ─────────────────────────────────────────────────────
app.use(express.json());
// Parse JSON request bodies — needed for your React frontend calls

app.use(express.urlencoded({ extended: true }));
// Parse form-encoded bodies — needed for Twilio webhooks
// Twilio sends data as application/x-www-form-urlencoded not JSON

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));

// ── Start workers (run in background) ─────────────────────────────
require('./workers/ticketWorker');
require('./workers/escalationWorker');
// Workers start listening to their queues as soon as they're required
// They run in the same process as the API in development
// In production on Railway, we split them — explained in deployment section

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/tickets',  require('./routes/tickets'));
app.use('/api/decisions',require('./routes/decisions'));
app.use('/api/knowledge',require('./routes/knowledge'));
app.use('/api/voice',    require('./routes/voice'));

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── Global error handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  res.status(err.status || 500).json({
    error: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[API] Server running on port ${PORT}`);
  console.log(`[API] Environment: ${process.env.NODE_ENV}`);
});