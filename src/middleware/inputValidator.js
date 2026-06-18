// src/middleware/inputValidator.js
// ─────────────────────────────────────────────────────────────────
//  Validates the incoming request body for the /api/generate route.
//  Guards against:
//    • Empty requests
//    • Oversized payloads (token exhaustion attacks)
//    • Non-string inputs
//    • Prompt injection keywords (basic defense)
// ─────────────────────────────────────────────────────────────────

const MAX_LENGTH = 1000; // characters

// Suspicious patterns that could indicate prompt injection attempts
const INJECTION_PATTERNS = [
  /ignore (all |previous |above )?instructions/i,
  /you are now/i,
  /disregard (your |the |all )?/i,
  /forget everything/i,
  /act as (a |an )?/i,
  /jailbreak/i,
  /system prompt/i,
];

function validateInput(req, res, next) {
  const { question } = req.body;

  // ── Check 1: Field presence ──────────────────────────────────
  if (!question) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: "question".'
    });
  }

  // ── Check 2: Type check ──────────────────────────────────────
  if (typeof question !== 'string') {
    return res.status(400).json({
      success: false,
      error: '"question" must be a string.'
    });
  }

  // ── Check 3: Not empty after trimming ────────────────────────
  const trimmed = question.trim();
  if (trimmed.length === 0) {
    return res.status(400).json({
      success: false,
      error: '"question" cannot be empty.'
    });
  }

  // ── Check 4: Max length (token exhaustion prevention) ────────
  if (trimmed.length > MAX_LENGTH) {
    return res.status(400).json({
      success: false,
      error: `Question is too long. Maximum allowed length is ${MAX_LENGTH} characters. Your input has ${trimmed.length} characters.`
    });
  }

  // ── Check 5: Prompt injection detection ──────────────────────
  const hasInjection = INJECTION_PATTERNS.some(pattern => pattern.test(trimmed));
  if (hasInjection) {
    console.warn(`[SECURITY] Possible prompt injection attempt from IP: ${req.ip}`);
    return res.status(400).json({
      success: false,
      error: 'Invalid input detected. Please enter a valid aptitude question.'
    });
  }

  // Attach sanitized question to req for use in controller
  req.sanitizedQuestion = trimmed;
  next();
}

module.exports = { validateInput };
