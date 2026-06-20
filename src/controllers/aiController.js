// src/controllers/aiController.js
// ─────────────────────────────────────────────────────────────────
//  The core proxy logic. Calls Groq AI and returns structured JSON
//  for the visual animation engine.
// ─────────────────────────────────────────────────────────────────

const fetch = require('node-fetch');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

// ── System Prompt ──────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert aptitude tutor and animation scriptwriter for a visual learning app called AptitudeAnimate.
When given an aptitude question, respond ONLY with a valid JSON object.
Do NOT include markdown code fences (no \`\`\`json). Do NOT write any explanation outside the JSON.

═══════════════════════════════════════════════
STEP 1 — SOLVE USING PLACEMENT TRAINING SHORTCUTS (internal, before writing JSON):
═══════════════════════════════════════════════
Before writing ANY JSON, solve the question completely using APTITUDE SHORTCUTS, NOT standard textbook algebra.
You are preparing students for competitive placements, so your methods MUST be fast and clever.
1. NEVER use long "x and y" variable equations if a shortcut exists.
2. USE SHORTCUTS like:
   - Options Elimination (checking which option satisfies the condition)
   - Ratio & Proportion Methods (instead of x and y equations)
   - Divisibility Rules & Digital Root
   - Unit Digit & Last Two Digits (e.g., cyclicity of 4 for powers)
   - LCM / Smart Value Substitution (e.g., assuming total work = LCM of days)
3. For Number System questions (Factors, Remainders, Unit Digits, Trailing Zeros, Simplification), explicitly use the standard shortcut rules (e.g., cyclicity of 4 for unit digits, counting 5s for trailing zeros).
4. Verify the answer matches one of the options.

Example (Unit Digit): "Find the unit digit of 7^105"
  → Shortcut: Cyclicity of 7 is 4.
  → 105 / 4 gives remainder 1.
  → So unit digit is 7^1 = 7.
  → correct_answer = whichever option says "7".

═══════════════════════════════════════════════
STEP 2 — OUTPUT THE JSON:
═══════════════════════════════════════════════

{
  "category": "string (e.g. Profit & Loss, Time Speed Distance, Number System)",
  "concept_name": "string (the core concept being tested, max 5 words)",
  "difficulty": "Easy" or "Medium" or "Hard",
  "question_text": "string (the original question, cleaned up)",
  "options": { "A": "string", "B": "string", "C": "string", "D": "string" },
  "correct_answer": "A" or "B" or "C" or "D",
  "animation_script": [ ...3 to 4 steps... ],
  "concept_summary": "1-2 sentence key formula or trick to remember",
  "follow_up_questions": [{ "question": "...", "options": {...}, "correct_answer": "..." }]
}

═══════════════════════════════════════════════
ANIMATION SCRIPT — VISUAL TYPES AND THEIR DATA:
═══════════════════════════════════════════════

Use EXACTLY this structure for each step. Choose the visual_type that best matches.

--- visual_type: "comparison_visual" ---
Use for: showing relationships, divisibility checks, or side-by-side values.
Required fields:
  "comparison_items": [
    { "label": "Power 105", "value": "105 / 4", "icon": "➗", "color": "a", "sublabel": "Divide by Cyclicity" },
    { "label": "Remainder", "value": "1", "icon": "❗️", "color": "c", "sublabel": "The critical value" }
  ],
  "relation_text": "105 = 4 × 26 + 1",
  "result_text": "Remainder is 1"

--- visual_type: "formula_highlight" ---
Use for: showing the key shortcut or formula with labeled colored tokens
Required fields:
  "formula_vars": [
    { "symbol": "7^105", "label": "Original", "unit": "", "color": "a" },
    { "symbol": "→", "label": "", "unit": "", "color": "b" },
    { "symbol": "7^1", "label": "Shortcut", "unit": "", "color": "c" }
  ],
  "formula_used": "Power mod 4 determines the unit digit"
Colors: "a"=blue, "b"=teal, "c"=amber, "d"=red
Operators (=, +, -, ×, ÷, →) use color "b" and empty label.

--- visual_type: "equation_solve" ---
Use for: showing step-by-step logic, option elimination, or algebraic solving.
Required fields:
  "equation_lines": [
    { "text": "Cyclicity of 7 is 4: [7, 9, 3, 1]", "highlight": false },
    { "text": "Divide power 105 by 4", "highlight": false },
    { "text": "Remainder = 1", "highlight": false },
    { "text": "Unit digit = 7^1 = 7 ✓", "highlight": true }
  ],
  "formula_used": "Shortcut Method: Cyclicity"
Set "highlight": true ONLY on the final answer line.

--- visual_type: "number_morph" ---
Use for: showing a single calculation sequence with tiles
Required fields:
  "numbers": [105, "÷", 4, "→", "Rem", 1],
  "highlight_index": 5,    (0-based index of the answer tile)
  "formula_used": "Find Remainder"
Use operators as strings: "+", "-", "×", "÷", "=", "→", "→x="

--- visual_type: "pattern_reveal" ---
Use for: number series, sequences, and patterns.
Required fields:
  "pattern": [2, 4, 8, 16, "?"],
  "differences": ["×2", "×2", "×2", "×2", "32"]

═══════════════════════════════════════════════
STEP STRUCTURE RULES FOR APTITUDE/QUANT QUESTIONS:
═══════════════════════════════════════════════
Step 1: "formula_highlight" OR "comparison_visual" — Introduce the shortcut rule or concept.
Step 2: "equation_solve" — Show the step-by-step application of the shortcut.
Step 3 (optional): "number_morph" OR "pattern_reveal" — Show the final quick arithmetic or pattern.

FOR NUMBER SYSTEM / NUMBER SERIES: Heavily rely on "pattern_reveal", "comparison_visual", and "equation_solve" to explain tricks like cyclicity, divisibility, or prime factorization.

═══════════════════════════════════════════════
CRITICAL VALIDATION BEFORE WRITING JSON:
═══════════════════════════════════════════════
✅ Check: Did you use an aptitude shortcut instead of long algebra?
✅ Check: Does options[correct_answer] equal your computed answer value?
✅ Check: Do the equation_lines lead to the correct answer?
If ANY check fails, recompute before outputting.`;

// ── Main controller function ──────────────────────────────────────
async function generateExplanation(req, res) {
  const question = req.sanitizedQuestion;
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error('[CONFIG ERROR] GROQ_API_KEY is not set in environment variables.');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error. Please contact the administrator.'
    });
  }

  const groqRequestBody = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Solve this question completely first using APTITUDE SHORTCUTS (verify the answer), then output the animation JSON:\n\n${question}`
      }
    ],
    temperature: 0.1,
    max_tokens: 3500,
    top_p: 0.9,
  };

  let groqResponse;
  try {
    console.log(`[GROQ] Sending request: "${question.substring(0, 80)}..."`);
    groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(groqRequestBody)
    });
  } catch (networkError) {
    console.error('[NETWORK ERROR]', networkError.message);
    return res.status(502).json({
      success: false,
      error: 'Could not connect to the AI service. Please check your connection and try again.'
    });
  }

  if (!groqResponse.ok) {
    const errorBody = await groqResponse.text();
    console.error(`[GROQ ERROR] ${groqResponse.status} | ${errorBody}`);
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

  const groqData = await groqResponse.json();
  const rawContent = groqData?.choices?.[0]?.message?.content;

  if (!rawContent) {
    console.error('[GROQ ERROR] Empty response:', JSON.stringify(groqData));
    return res.status(500).json({
      success: false,
      error: 'AI returned an empty response. Please try again with a clearer question.'
    });
  }

  const cleanedContent = rawContent
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsedResult;
  try {
    parsedResult = JSON.parse(cleanedContent);
  } catch (parseError) {
    console.error('[PARSE ERROR]', cleanedContent.substring(0, 300));
    return res.status(500).json({
      success: false,
      error: 'AI returned an unexpected format. Please try rephrasing your question.'
    });
  }

  const requiredFields = ['category', 'concept_name', 'question_text', 'options', 'correct_answer', 'animation_script'];
  const missingFields = requiredFields.filter(f => !parsedResult[f]);
  if (missingFields.length > 0) {
    console.error('[VALIDATION ERROR] Missing fields:', missingFields);
    return res.status(500).json({ success: false, error: 'AI response was incomplete. Please try again.' });
  }

  if (!['A', 'B', 'C', 'D'].includes(parsedResult.correct_answer)) {
    console.error('[VALIDATION ERROR] Invalid correct_answer:', parsedResult.correct_answer);
    return res.status(500).json({ success: false, error: 'AI returned an invalid answer option. Please try again.' });
  }

  const chosenOption = parsedResult.correct_answer;
  const chosenValue = parsedResult.options?.[chosenOption];
  console.log(`[GROQ] ✅ concept: "${parsedResult.concept_name}" | answer: ${chosenOption} = ${chosenValue} | steps: ${parsedResult.animation_script?.length}`);

  return res.status(200).json({ success: true, data: parsedResult });
}

module.exports = { generateExplanation };
