// src/routes/knowledge.js
// Add/list FAQ entries for the knowledge base
const express = require('express');
const router = express.Router();
const db = require('../services/db');
const axios = require('axios');

// POST /api/knowledge
// Add a new FAQ entry — also stores embedding in Qdrant via Python service
router.post('/', async (req, res, next) => {
  try {
    const { title, content, category } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'title and content required' });
    }

    // Save to Postgres for display/management
    const result = await db.query(
      `INSERT INTO knowledge_base (title, content, category)
       VALUES ($1, $2, $3) RETURNING id`,
      [title, content, category || 'General']
    );

    const kbId = result.rows[0].id;

    // Send to Python service to create embedding and store in Qdrant
    // This is what makes it searchable by the AI agent
    await axios.post(
      `${process.env.PYTHON_SERVICE_URL}/knowledge/ingest`,
      { id: kbId, title, content, category: category || 'General' }
    );

    res.status(201).json({ id: kbId, message: 'Knowledge base entry added' });

  } catch (err) {
    next(err);
  }
});

// GET /api/knowledge
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT * FROM knowledge_base ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;