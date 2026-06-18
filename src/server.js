// src/server.js
// ─────────────────────────────────────────────────────────────────
//  Main Express server entry point.
//
//  Security layers applied (in order):
//   1. helmet()         → Sets 15+ secure HTTP headers (XSS, clickjack, etc.)
//   2. cors()           → Strict origin whitelist — rejects unknown origins
//   3. express.json()   → Parses JSON body, enforces 10kb max size
//   4. globalLimiter    → Max 100 req per 15 min per IP (all routes)
//   5. requestLogger    → Logs every request and response for monitoring
//   6. /api routes      → aiLimiter + validateInput inside the route
// ─────────────────────────────────────────────────────────────────

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { globalLimiter } = require('./middleware/rateLimiter');
const { requestLogger } = require('./middleware/requestLogger');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Trusted origins ────────────────────────────────────────────
//  Add your Vercel production URL here when you deploy.
//  Do NOT use wildcard (*) in production — that removes all CORS protection.
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_ORIGIN || 'http://localhost:5173',  // primary (from .env)
  'http://localhost:5173',  // always allow local dev
  'http://localhost:4173',  // Vite preview mode
];

// Filter out duplicates
const uniqueOrigins = [...new Set(ALLOWED_ORIGINS.filter(Boolean))];

// ────────────────────────────────────────────────────────────────
//  SECURITY MIDDLEWARE STACK
// ────────────────────────────────────────────────────────────────

// 1. Helmet — sets secure HTTP response headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      objectSrc:  ["'none'"],
      upgradeInsecureRequests: [],
    }
  }
}));

// 2. CORS — only allow whitelisted origins
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman) ONLY in development
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        return callback(new Error('CORS: Requests with no origin are blocked in production.'), false);
      }
      return callback(null, true);
    }

    if (uniqueOrigins.includes(origin)) {
      return callback(null, true); // ✅ Allowed
    }

    console.warn(`[CORS BLOCKED] Origin not allowed: ${origin}`);
    return callback(new Error(`CORS: Origin "${origin}" is not allowed.`), false);
  },
  methods: ['POST', 'GET', 'OPTIONS'],   // Only the methods we use
  allowedHeaders: ['Content-Type'],      // Only the headers we need
  credentials: false                     // No cookies/sessions needed
}));

// 3. JSON body parser — limit payload to 10kb
app.use(express.json({ limit: '10kb' }));

// 4. Global rate limiter — broad protection for all routes
app.use(globalLimiter);

// 5. Request logger — log all incoming traffic
app.use(requestLogger);

// ────────────────────────────────────────────────────────────────
//  ROUTES
// ────────────────────────────────────────────────────────────────

// Health check — used by Render to verify the server is alive
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime().toFixed(2) + 's'
  });
});

// AI routes — all under /api
app.use('/api', aiRoutes);

// ── 404 handler ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found.' });
});

// ── Global error handler ────────────────────────────────────────
app.use((err, req, res, next) => {
  // Handle CORS errors
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ success: false, error: err.message });
  }

  // Handle JSON parse errors (malformed body)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'Invalid JSON in request body.' });
  }

  // Handle payload too large
  if (err.status === 413) {
    return res.status(413).json({ success: false, error: 'Request body is too large. Max size is 10kb.' });
  }

  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json({ success: false, error: 'An unexpected server error occurred.' });
});

// ────────────────────────────────────────────────────────────────
//  START SERVER
// ────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log(`║  AptitudeAnimate Backend                     ║`);
  console.log(`║  Running on http://localhost:${PORT}             ║`);
  console.log(`║  Allowed Origins: ${uniqueOrigins.length} configured           ║`);
  console.log(`║  Groq Key: ${process.env.GROQ_API_KEY ? '✅ Loaded' : '❌ MISSING — set .env'}         ║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  uniqueOrigins.forEach(o => console.log(`  ✅ Trusted origin: ${o}`));
  console.log('');
});
