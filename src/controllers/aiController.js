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
STEP 1 — STRICT CHAIN OF THOUGHT (Internal Verification):
═══════════════════════════════════════════════
To prevent hallucinating the wrong option, the VERY FIRST key in your JSON MUST BE "_thought_process".
In this string, you must:
1. Extract the exact numbers and mathematical operators (+, -, *, /) from the question. Pay extreme attention to the operators. Do not confuse addition (+) with multiplication (×).
2. State the relevant mathematical theorems or rules BEFORE calculating (e.g., "Trailing zeros of A + B is min(zeros(A), zeros(B))" or "A × B means zeros are added").
3. Calculate the final numerical answer step-by-step. Double-check all arithmetic.
4. Explicitly map your numerical answer to the correct Option A, B, C, or D.
Example: "Question is 50! × 70! + 20!. Zeros in 20! = 4. Zeros in 50! = 12. Zeros in 70! = 16. So 12 + 16 = 28. Then we have a number with 28 zeros + a number with 4 zeros. Rule: A + B trailing zeros = min(zeros(A), zeros(B)). min(28, 4) = 4. Option B is 4. Therefore the correct option is B."

═══════════════════════════════════════════════
STEP 2 — OUTPUT THE JSON:
═══════════════════════════════════════════════

{
  "_thought_process": "Your step-by-step mathematical derivation and explicit mapping to the option letter.",
  "category": "string (e.g. Profit & Loss, Time Speed Distance, Number System)",
  "concept_name": "string (the core concept being tested, max 5 words)",
  "difficulty": "Easy" or "Medium" or "Hard",
  "question_text": "string (the original question, cleaned up)",
  "options": { "A": "string", "B": "string", "C": "string", "D": "string" },
  "correct_answer": "A" or "B" or "C" or "D",
  "animation_script": [ ...array of step objects, USE AS MANY STEPS AS NEEDED to show every calculation... ],
  "concept_summary": "1-2 sentence key formula or trick to remember",
  "follow_up_questions": [{ "question": "...", "options": {...}, "correct_answer": "..." }]
}

═══════════════════════════════════════════════
ANIMATION SCRIPT — STRICTLY VISUAL DIAGRAMS (NO SENTENCES)
═══════════════════════════════════════════════
The user explicitly requested VISUAL DIAGRAMS, not text/sentences.
You MUST build your steps using only the following highly visual components.

--- visual_type: "comparison_visual" ---
Use for: Side-by-side visual cards comparing quantities, ratios, or divisibility logic.
Required fields:
  "comparison_items": [
    { "label": "Remainder", "value": "21", "icon": "⚠️", "color": "d", "sublabel": "Current" },
    { "label": "Divisor", "value": "23", "icon": "➗", "color": "b", "sublabel": "Target" }
  ],
  "relation_text": "We need 23 to be perfectly divisible",
  "result_text": "Add (23 - 21) = 2"

--- visual_type: "number_morph" ---
Use for: Showing a math calculation dynamically with large tiles.
Required fields:
  "numbers": [1056, "÷", 23, "→", "Rem", 21],
  "highlight_index": 5,    (0-based index of the answer tile)
  "formula_used": "Find current remainder"
Use operators as strings: "+", "-", "×", "÷", "=", "→", "→x="

--- visual_type: "formula_highlight" ---
Use for: Showing a formula or trick with colorful floating variable boxes.
Required fields:
  "formula_vars": [
    { "symbol": "Add", "label": "Needed", "unit": "", "color": "a" },
    { "symbol": "=", "label": "", "unit": "", "color": "b" },
    { "symbol": "Divisor", "label": "Target", "unit": "", "color": "c" },
    { "symbol": "-", "label": "", "unit": "", "color": "b" },
    { "symbol": "Rem", "label": "Current", "unit": "", "color": "d" }
  ],
  "formula_used": "Number to be added = Divisor - Remainder"
Colors: "a"=blue, "b"=teal, "c"=amber, "d"=red

--- visual_type: "pattern_reveal" ---
Use for: sequences, factor grids, pattern blocks.
Required fields:
  "pattern": [2, 4, 8, 16, "?"],
  "differences": ["×2", "×2", "×2", "×2", "32"]

═══════════════════════════════════════════════
RULES:
═══════════════════════════════════════════════
- DO NOT use text-heavy step explanations. Rely on the "comparison_visual" and "number_morph" tiles to do the talking.
- CRITICAL RULE FOR MATH VISUALIZATION: YOU ARE STRICTLY FORBIDDEN from skipping intermediate calculations. If you derive ANY number (like 180 or 6600) from the numbers in the question, YOU MUST dedicate a full visual step to showing that exact derivation (e.g., 300 - 120 = 180) BEFORE you use that number in the next step.
- "correct_answer" MUST exactly match the conclusion reached in your "_thought_process".
- Double check: if option A is 2, and the math yields 2, then correct_answer="A".`;

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
        content: `Solve this question visually:\n\n${question}`
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

  // Allow _thought_process in the required fields but don't strictly enforce it in case the LLM misses it, 
  // though we strongly prompted for it. We'll just enforce the core ones.
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
  console.log(`[GROQ] ✅ Answer: ${chosenOption} = ${chosenValue} | Thought Process: ${parsedResult._thought_process?.substring(0, 50)}...`);

  return res.status(200).json({ success: true, data: parsedResult });
}

module.exports = { generateExplanation };
