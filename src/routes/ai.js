// src/routes/ai.js
// ─────────────────────────────────────────────────────────────────
//  AI route definitions.
//
//  POST /api/generate
//    → validateInput middleware   (checks length, injection, type)
//    → aiLimiter middleware       (5 req / 10 min per IP)
//    → generateExplanation        (calls Groq, returns JSON)
// ─────────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();

const { generateExplanation } = require('../controllers/aiController');
const { validateInput } = require('../middleware/inputValidator');
const { aiLimiter } = require('../middleware/rateLimiter');

// POST /api/generate
// Accepts: { question: "string" }
// Returns: { success: true, data: { ...parsedQuestion } }
//       OR: { success: false, error: "string" }
router.post('/generate', aiLimiter, validateInput, generateExplanation);

module.exports = router;
