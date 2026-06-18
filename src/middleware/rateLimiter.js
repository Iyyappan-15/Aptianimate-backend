// src/middleware/rateLimiter.js
// ─────────────────────────────────────────────────────────────────
//  Two-tier rate limiting:
//
//  1. globalLimiter   — applies to ALL routes (broad spam prevention)
//     → max 100 requests per 15 minutes per IP
//
//  2. aiLimiter       — applies ONLY to /api/generate (AI endpoint)
//     → max 5 requests per 10 minutes per IP
//     → This protects Groq free-tier quota from a single abusive user
// ─────────────────────────────────────────────────────────────────

const rateLimit = require('express-rate-limit');

// ── Friendly error messages ──────────────────────────────────────
const rateLimitMessage = (windowMin, max) => ({
  success: false,
  error: `Too many requests. You have exceeded the limit of ${max} requests per ${windowMin} minutes. Please wait and try again.`,
  retryAfter: `${windowMin} minutes`
});

// ── 1. Global limiter (all routes) ──────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,    // Returns rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  message: rateLimitMessage(15, 100),
  // Skip successful static/health-check responses from counts
  skip: (req) => req.path === '/health'
});

// ── 2. AI endpoint limiter (strict) ─────────────────────────────
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage(10, 5),
  // Custom handler for a cleaner JSON error response
  handler: (req, res, next, options) => {
    console.warn(`[RATE LIMIT] IP ${req.ip} hit AI limit at ${new Date().toISOString()}`);
    res.status(429).json(options.message);
  }
});

module.exports = { globalLimiter, aiLimiter };
