// src/controllers/aiController.js
// ─────────────────────────────────────────────────────────────────
//  The core proxy logic. This controller:
//    1. Receives the validated user question from the route
//    2. Builds the Groq API request with the SYSTEM PROMPT on the server
//    3. Forwards it to Groq
//    4. Validates and parses the response
//    5. Sends the clean JSON back to the frontend
//
//  The GROQ_API_KEY is ONLY read here — it never leaves the server.
//  The SYSTEM_PROMPT is ONLY defined here — the frontend cannot see it.
// ─────────────────────────────────────────────────────────────────

const fetch = require('node-fetch');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

// ── System Prompt (lives on the server, never sent to the browser) ──
const SYSTEM_PROMPT = `You are an expert aptitude tutor and animation scriptwriter for a learning app.
When given an aptitude question, respond ONLY with a valid JSON object.
Do NOT include markdown code fences (no \`\`\`json). Do NOT write any explanation outside the JSON.
The JSON must follow this exact schema:

{
  "category": "string (e.g. Time Speed Distance, Profit Loss, Number Series, Synonyms, etc.)",
  "concept_name": "string (the core concept being tested)",
  "difficulty": "Easy" or "Medium" or "Hard",
  "question_text": "string (the original question, cleaned up)",
  "options": { "A": "string", "B": "string", "C": "string", "D": "string" },
  "correct_answer": "A" or "B" or "C" or "D",
  "animation_script": [
    {
      "step_number": 1,
      "step_title": "short title for this step (max 6 words)",
      "explanation": "clear explanation of what happens in this step (2-3 sentences)",
      "visual_type": "formula_highlight" or "number_morph" or "story_scene" or "motion_graphic" or "word_highlight" or "pattern_reveal" or "bar_race",
      "formula_used": "the formula used in this step as a string, or null",
      "analogy": "a simple real-world analogy to help understand this step, or null",
      "duration_seconds": 3
    }
  ],
  "concept_summary": "A 1-2 sentence summary of the key formula or trick to remember",
  "follow_up_questions": [
    {
      "question": "a slightly varied question on the same concept",
      "options": { "A": "string", "B": "string", "C": "string", "D": "string" },
      "correct_answer": "A" or "B" or "C" or "D"
    }
  ]
}

Rules:
- animation_script MUST have at least 2 steps and at most 4 steps.
- For math/quantitative questions: prefer formula_highlight for the first step, number_morph for calculations.
- For verbal questions: use word_highlight.
- For logic/sequence questions: use pattern_reveal.
- follow_up_questions must have exactly 1 item.
- All JSON keys must be present. Use null for optional fields if not applicable.
- The correct_answer MUST be one of the provided options A, B, C, or D.`;

// ── Main controller function ──────────────────────────────────────
async function generateExplanation(req, res) {
  const question = req.sanitizedQuestion; // set by inputValidator middleware
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error('[CONFIG ERROR] GROQ_API_KEY is not set in environment variables.');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error. Please contact the administrator.'
    });
  }

  // ── Build the Groq request ────────────────────────────────────
  const groqRequestBody = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Parse and generate an animation script for this aptitude question:\n\n${question}` }
    ],
    temperature: 0.2,     // Low temperature = consistent, structured output
    max_tokens: 2500,
    top_p: 0.9,
  };

  let groqResponse;
  try {
    console.log(`[GROQ] Sending request for question: "${question.substring(0, 80)}..."`);

    groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`  // ← API key attached HERE, server-side only
      },
      body: JSON.stringify(groqRequestBody)
    });

  } catch (networkError) {
    console.error('[NETWORK ERROR] Could not reach Groq API:', networkError.message);
    return res.status(502).json({
      success: false,
      error: 'Could not connect to the AI service. Please check your connection and try again.'
    });
  }

  // ── Handle Groq API errors ─────────────────────────────────────
  if (!groqResponse.ok) {
    const errorBody = await groqResponse.text();
    console.error(`[GROQ ERROR] Status: ${groqResponse.status} | Body: ${errorBody}`);

    // Map specific Groq error codes to user-friendly messages
    const errorMessages = {
      401: 'AI service authentication failed. Please contact the administrator.',
      429: 'AI service rate limit reached. Please wait a moment and try again.',
      503: 'AI service is temporarily unavailable. Please try again shortly.',
    };

    return res.status(groqResponse.status).json({
      success: false,
      error: errorMessages[groqResponse.status] || 'AI service returned an error. Please try again.'
    });
  }

  // ── Parse the Groq response ─────────────────────────────────────
  const groqData = await groqResponse.json();
  const rawContent = groqData?.choices?.[0]?.message?.content;

  if (!rawContent) {
    console.error('[GROQ ERROR] Empty content in response:', JSON.stringify(groqData));
    return res.status(500).json({
      success: false,
      error: 'AI returned an empty response. Please try again with a clearer question.'
    });
  }

  // ── Clean and parse the JSON ────────────────────────────────────
  // Strip markdown fences if the model accidentally adds them
  const cleanedContent = rawContent
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsedResult;
  try {
    parsedResult = JSON.parse(cleanedContent);
  } catch (parseError) {
    console.error('[PARSE ERROR] Could not parse JSON from Groq:', cleanedContent.substring(0, 200));
    return res.status(500).json({
      success: false,
      error: 'AI returned an unexpected format. Please try rephrasing your question.'
    });
  }

  // ── Validate the parsed result has required fields ──────────────
  const requiredFields = ['category', 'concept_name', 'question_text', 'options', 'correct_answer', 'animation_script'];
  const missingFields = requiredFields.filter(f => !parsedResult[f]);

  if (missingFields.length > 0) {
    console.error('[VALIDATION ERROR] Missing fields in AI response:', missingFields);
    return res.status(500).json({
      success: false,
      error: 'AI response was incomplete. Please try again.'
    });
  }

  // ── Validate correct_answer is one of A, B, C, D ───────────────
  if (!['A', 'B', 'C', 'D'].includes(parsedResult.correct_answer)) {
    console.error('[VALIDATION ERROR] Invalid correct_answer:', parsedResult.correct_answer);
    return res.status(500).json({
      success: false,
      error: 'AI returned an invalid answer option. Please try again.'
    });
  }

  console.log(`[GROQ] ✅ Success — concept: "${parsedResult.concept_name}", steps: ${parsedResult.animation_script?.length}`);

  // ── Send back to frontend ───────────────────────────────────────
  return res.status(200).json({
    success: true,
    data: parsedResult
  });
}

module.exports = { generateExplanation };
