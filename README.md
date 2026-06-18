# AptitudeAnimate — Secure Backend Proxy

A lightweight Express.js proxy server that securely hides the Groq API key from the browser.

## Security Features
- 🔒 **API Key hidden** — key lives in server `.env`, never exposed to browser
- 🛡️ **Helmet** — sets 15+ secure HTTP headers (XSS, clickjacking, MIME-sniffing protection)
- 🌐 **Strict CORS** — only your frontend's origin is allowed
- ⏱️ **Two-tier rate limiting** — global (100/15min) + AI endpoint (5/10min) per IP
- ✅ **Input validation** — checks length, type, and prompt injection patterns
- 📝 **Request logging** — every request is logged with IP and response time

## Project Structure
```
src/
  server.js                  ← Main server (security middleware stack)
  routes/
    ai.js                    ← POST /api/generate route
  controllers/
    aiController.js          ← Groq proxy logic + response validation
  middleware/
    rateLimiter.js           ← Global + AI-specific rate limits
    inputValidator.js        ← Input sanitization + injection defense
    requestLogger.js         ← Request/response logging
```

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create your `.env` file
```bash
cp .env.example .env
```
Then edit `.env` and add your real Groq API key:
```
GROQ_API_KEY=gsk_your_actual_key_here
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173
```

### 3. Run in development
```bash
npm run dev
```

### 4. Run in production
```bash
npm start
```

## API Endpoints

### `GET /health`
Health check — returns server status and uptime.
```json
{ "status": "ok", "timestamp": "...", "uptime": "42.5s" }
```

### `POST /api/generate`
Generates an animated explanation for an aptitude question.

**Request body:**
```json
{ "question": "A train travels 300km in 5 hours. What is its speed?" }
```

**Success response (200):**
```json
{
  "success": true,
  "data": {
    "category": "Time Speed Distance",
    "concept_name": "Basic Speed Calculation",
    "difficulty": "Easy",
    "question_text": "...",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "correct_answer": "B",
    "animation_script": [...],
    "concept_summary": "...",
    "follow_up_questions": [...]
  }
}
```

**Error response:**
```json
{ "success": false, "error": "Error message here" }
```

**Rate limit response (429):**
```json
{ "success": false, "error": "Too many requests...", "retryAfter": "10 minutes" }
```

## Deployment to Render (Free)

1. Push this folder to a GitHub repo
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Set:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add Environment Variables in Render dashboard:
   - `GROQ_API_KEY` = your real key
   - `FRONTEND_ORIGIN` = your Vercel frontend URL
   - `NODE_ENV` = `production`
6. After deploy, copy the Render URL (e.g. `https://aptitude-api.onrender.com`)
7. Paste it into your frontend's `.env`: `VITE_API_URL=https://aptitude-api.onrender.com`

## Frontend `.env` (for reference)
In `aptitude-animate/.env`:
```
VITE_API_URL=http://localhost:3000       # dev
# VITE_API_URL=https://your-backend.onrender.com  # production
```
