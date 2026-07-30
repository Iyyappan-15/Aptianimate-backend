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

const { generateExplanation, analyzeResume } = require('../controllers/aiController');
const { validateInput } = require('../middleware/inputValidator');
const { aiLimiter, resumeLimiter } = require('../middleware/rateLimiter');

// POST /api/generate
// Accepts: { question: "string" }
// Returns: { success: true, data: { ...parsedQuestion } }
//       OR: { success: false, error: "string" }
router.post('/generate', aiLimiter, validateInput, generateExplanation);

// POST /api/analyze-resume
// Accepts: { text: "string" }
// Returns: { success: true, data: { ...parsedAnalysis } }
router.post('/analyze-resume', resumeLimiter, analyzeResume);


module.exports = router;
