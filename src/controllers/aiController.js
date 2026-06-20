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
STEP 1 — SOLVE THE MATH FIRST (internal, before writing JSON):
═══════════════════════════════════════════════
Before writing ANY JSON, solve the question completely:
1. Identify what is given and what is asked.
2. Write out the formula.
3. Substitute the actual numbers and compute.
4. Verify: plug the answer back in — does it satisfy the original condition?
5. Identify which option (A/B/C/D) matches the computed answer exactly.

Example: "CP of 20 articles = SP of x articles. Profit = 25%."
  → SP = 1.25 × CP (25% profit means SP is 125% of CP)
  → CP of 20 = SP of x → 20 × cp = x × 1.25 × cp → x = 20/1.25 = 16
  → Verify: SP of 16 at 1.25×CP = 20×CP ✓
  → correct_answer = whichever option says "16"

═══════════════════════════════════════════════
STEP 2 — OUTPUT THE JSON:
═══════════════════════════════════════════════

{
  "category": "string (e.g. Profit & Loss, Time Speed Distance, Number Series)",
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
Use for: showing relationships between two or more quantities (CP vs SP, before vs after, etc.)
Required fields:
  "comparison_items": [
    { "label": "CP of 20 Articles", "value": "20 × ₹p", "icon": "📦", "color": "a", "sublabel": "Cost Price side" },
    { "label": "SP of x Articles",  "value": "x × ₹1.25p", "icon": "🏷️", "color": "b", "sublabel": "Selling Price side" }
  ],
  "relation_text": "CP of 20 = SP of x  →  20p = 1.25px",
  "result_text": "x = 20 / 1.25 = 16"

--- visual_type: "formula_highlight" ---
Use for: showing the key formula with labeled colored tokens
Required fields:
  "formula_vars": [
    { "symbol": "SP", "label": "Selling Price", "unit": "₹", "color": "a" },
    { "symbol": "=", "label": "", "unit": "", "color": "b" },
    { "symbol": "CP", "label": "Cost Price", "unit": "₹", "color": "b" },
    { "symbol": "×", "label": "", "unit": "", "color": "b" },
    { "symbol": "1.25", "label": "125% = 1 + 25/100", "unit": "", "color": "c" }
  ],
  "formula_used": "SP = CP × (1 + Profit%/100)"
Colors: "a"=blue, "b"=teal, "c"=amber, "d"=red
Operators (=, +, -, ×, ÷, →) use color "b" and empty label.

--- visual_type: "equation_solve" ---
Use for: showing step-by-step algebraic solving with each line appearing
Required fields:
  "equation_lines": [
    { "text": "Given: CP of 20 = SP of x", "highlight": false },
    { "text": "SP = 1.25 × CP  (25% profit)", "highlight": false },
    { "text": "20 × CP = x × 1.25 × CP", "highlight": false },
    { "text": "Divide both sides by CP: 20 = 1.25x", "highlight": false },
    { "text": "x = 20 ÷ 1.25 = 16 ✓", "highlight": true }
  ],
  "formula_used": "Key relationship: CP of n₁ = SP of n₂"
Set "highlight": true ONLY on the final answer line.

--- visual_type: "number_morph" ---
Use for: showing a single calculation sequence with tiles
Required fields:
  "numbers": [20, "÷", 1.25, "=", 16],
  "highlight_index": 4,    (0-based index of the answer tile)
  "formula_used": "x = 20 / 1.25"
Use operators as strings: "+", "-", "×", "÷", "=", "→", "→x="

--- visual_type: "pattern_reveal" ---
Use for: number series and sequence questions
Required fields:
  "pattern": [2, 4, 8, 16, "?"],
  "differences": ["+2", "×2", "×2", "×2", "32"]

--- visual_type: "word_highlight" ---
Use for: verbal ability questions (synonyms, antonyms, fill in the blanks)
Required fields:
  "word": "LUCID",
  "definition": "easy to understand; clearly expressed",
  "synonyms": ["Clear", "Transparent", "Obvious"],
  "memory_tip": "LUCId → LIGHT → things in light are clear"

═══════════════════════════════════════════════
STEP STRUCTURE RULES FOR MATH/QUANTITATIVE QUESTIONS:
═══════════════════════════════════════════════
Step 1: "comparison_visual" — Show the two quantities being related (what equals what).
Step 2: "formula_highlight" — Show the formula with colored labeled tokens.
Step 3: "equation_solve" — Show the full algebraic derivation line by line, last line highlighted = answer.
Step 4 (optional): "number_morph" — Show the final arithmetic: e.g., 20 ÷ 1.25 = 16

FOR VERBAL QUESTIONS: Use "word_highlight" for all steps.
FOR NUMBER SERIES: Use "pattern_reveal" for all steps.

═══════════════════════════════════════════════
CRITICAL VALIDATION BEFORE WRITING JSON:
═══════════════════════════════════════════════
✅ Check: Does options[correct_answer] equal your computed answer value?
✅ Check: Do the equation_lines lead to the correct answer?
✅ Check: Does highlight_index in numbers[] point to the correct result?
✅ Check: Does result_text in comparison_visual state the correct answer?
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
        content: `Solve this question completely first (verify the answer), then output the animation JSON:\n\n${question}`
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
