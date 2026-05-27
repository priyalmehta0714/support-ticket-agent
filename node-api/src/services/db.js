// src/services/db.js
// This file manages the connection to PostgreSQL
// Every other file imports this to run database queries

const { Pool } = require('pg');
// Pool = a collection of reusable database connections
// Why Pool instead of single Client?
// A single connection handles one query at a time
// Pool maintains multiple connections (default: 10)
// When 5 requests come in simultaneously, each gets its own connection
// Without pool, requests queue up and your API slows down

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // DATABASE_URL format: postgresql://user:password@host:5432/dbname
  // Railway gives you this exact format when you add a Postgres service
  
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
  // SSL required in production (Railway enforces it)
  // rejectUnauthorized: false = accept Railway's self-signed certificate
  // In development with local Docker: no SSL needed
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('[DB] Connection failed:', err.message);
    // Don't crash — log and continue
    // The pool will retry connections automatically
  } else {
    console.log('[DB] Connected to PostgreSQL');
    release();
    // release() returns this connection back to the pool
    // Always call release() or you'll leak connections
  }
});

// Export a simple query function
// Usage: await db.query('SELECT * FROM tickets WHERE id = $1', [ticketId])
// $1, $2, $3 = parameterized queries
// NEVER do: `SELECT * FROM tickets WHERE id = '${ticketId}'`
// That's SQL injection vulnerability — anyone can break your database

module.exports = {
  query: (text, params) => pool.query(text, params),
  // Wraps pool.query so every file uses the same interface
  
  getClient: () => pool.connect()
  // For transactions where you need multiple queries in one atomic operation
  // Usage: const client = await db.getClient()
  //        await client.query('BEGIN')
  //        await client.query(...)
  //        await client.query('COMMIT')
  //        client.release()
};