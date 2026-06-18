// src/middleware/requestLogger.js
// ─────────────────────────────────────────────────────────────────
//  Lightweight request logger. Logs:
//    • Incoming request: method, path, IP, timestamp
//    • Outgoing response: status code, response time in ms
//  Useful for monitoring abuse and debugging on Render logs.
// ─────────────────────────────────────────────────────────────────

function requestLogger(req, res, next) {
  const start = Date.now();
  const ip = req.ip || req.connection.remoteAddress;

  // Log incoming
  console.log(`[${new Date().toISOString()}] → ${req.method} ${req.path} | IP: ${ip}`);

  // Intercept response finish to log outgoing
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusEmoji = res.statusCode >= 400 ? '❌' : '✅';
    console.log(`[${new Date().toISOString()}] ${statusEmoji} ${res.statusCode} ${req.method} ${req.path} | ${duration}ms | IP: ${ip}`);
  });

  next();
}

module.exports = { requestLogger };
