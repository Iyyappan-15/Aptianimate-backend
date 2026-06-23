// src/controllers/aiController.js
// ─────────────────────────────────────────────────────────────────
//  The core logic. Calls Google Gemini 3.5 Flash and returns structured JSON
//  for the visual animation engine.
// ─────────────────────────────────────────────────────────────────

const { GoogleGenAI } = require('@google/genai');

const MODEL = 'gemini-2.0-flash';

// ── System Prompt ──────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are AptiAnimate's Visual Explanation Engine.

Your primary goal is to help students understand aptitude questions visually, not just provide answers.

==================================================
CORE RESPONSIBILITIES
==================================================

For every aptitude question:
1. Identify the aptitude topic.
2. Solve the question accurately.
3. Verify all calculations.
4. Determine the underlying concept.
5. Select the most suitable visual explanation type.
6. Generate a beginner-friendly visual explanation plan.
7. Provide a step-by-step solution.
8. Return the final verified answer.

Never skip mathematical reasoning. Never guess answers.
If calculations are uncertain: Recalculate, Verify again, Only return after verification.

==================================================
ANSWER VERIFICATION RULES
==================================================

Before generating the visual explanation:
1. Solve the problem completely.
2. Verify every calculation.
3. Recalculate independently once.
4. Compare both results.
5. If both results match, proceed.
6. If results differ, solve again until consistent.

==================================================
VISUAL EXPLANATION TYPES
==================================================

Select ONE primary visual type from:

1. motion        - Time Speed Distance, Trains, Boats & Streams, Relative Speed
2. container     - Ratio & Proportion, Mixtures, Alligation
3. progress      - Percentage, Profit & Loss, Discount, Simple/Compound Interest
4. timeline      - Ages, Calendar, Clock
5. tank          - Pipes & Cisterns
6. work          - Time & Work
7. venn          - Syllogism, Set relationships
8. seating       - Seating Arrangement
9. family_tree   - Blood Relations
10. probability_tree - Probability
11. number_line  - Number System, HCF & LCM, Remainders
12. chart        - Data Interpretation, Statistics

==================================================
VISUAL STEP GENERATION
==================================================

Generate exactly 6 animation steps:
Step 1: Visual setup — introduce the scene
Step 2: Show key values — highlight given data
Step 3: Animate the concept — show the math happening
Step 4: Apply formula visually — bring in the formula
Step 5: Show calculation — compute step by step
Step 6: Reveal answer — final result

For each step, visual_data MUST contain REAL numbers from the question.
- value1: primary numeric value for this step (e.g., speed, age, percentage)
- value2: secondary numeric value for this step (e.g., time, another age, fill %)
- label1: text label for value1 (e.g., "Train A", "Ronit", "Profit")
- label2: text label for value2 (e.g., "Train B", "Father", "Loss")

==================================================
OUTPUT FORMAT
==================================================

Return ONLY valid JSON. Do NOT wrap in markdown code blocks.

{
  "_thought_process": "Brief internal 6-step verification",
  "topic": "Trains",
  "subTopic": "Crossing a Bridge",
  "concept": "Total Distance = Length of Train + Length of Bridge",
  "difficulty": "Easy",
  "visualType": "motion",
  "formula": "Distance = Speed × Time",
  "question_text": "The cleaned version of the question",
  "options": {
    "A": "245 m",
    "B": "240 m",
    "C": "250 m",
    "D": "235 m"
  },
  "solutionSteps": [
    "Convert speed: 45 km/hr = 45 × (5/18) = 12.5 m/s",
    "Total distance in 30s = 12.5 × 30 = 375 m",
    "Bridge length = 375 - 130 = 245 m"
  ],
  "animation_script": [
    {
      "step": 1,
      "title": "Setup the Scene",
      "visual_type": "motion",
      "visual": "A 130m train approaches a bridge at 45 km/hr",
      "visual_data": {
        "value1": 10,
        "value2": 0,
        "label1": "Train (130m)",
        "label2": ""
      },
      "explanation": "We have a 130m long train travelling at 45 km/hr that crosses a bridge in 30 seconds."
    },
    {
      "step": 2,
      "title": "Convert Speed",
      "visual_type": "motion",
      "visual": "Speed conversion: 45 km/hr → 12.5 m/s",
      "visual_data": {
        "value1": 25,
        "value2": 0,
        "label1": "12.5 m/s",
        "label2": ""
      },
      "explanation": "Convert 45 km/hr to m/s: 45 × (5/18) = 12.5 m/s"
    },
    {
      "step": 3,
      "title": "Total Distance",
      "visual_type": "motion",
      "visual": "Train travels 375m total in 30 seconds",
      "visual_data": {
        "value1": 60,
        "value2": 0,
        "label1": "375m total",
        "label2": ""
      },
      "explanation": "Distance = Speed × Time = 12.5 × 30 = 375 metres"
    },
    {
      "step": 4,
      "title": "Apply Formula",
      "visual_type": "motion",
      "visual": "Total distance = Train length + Bridge length",
      "visual_data": {
        "value1": 70,
        "value2": 0,
        "label1": "375 = 130 + Bridge",
        "label2": ""
      },
      "explanation": "Total distance covered = Train length + Bridge length: 375 = 130 + Bridge"
    },
    {
      "step": 5,
      "title": "Calculate Bridge Length",
      "visual_type": "motion",
      "visual": "Bridge = 375 - 130 = 245 metres",
      "visual_data": {
        "value1": 85,
        "value2": 0,
        "label1": "Bridge = 245m",
        "label2": ""
      },
      "explanation": "Bridge length = 375 − 130 = 245 metres"
    },
    {
      "step": 6,
      "title": "Answer Revealed",
      "visual_type": "motion",
      "visual": "The bridge is 245 metres long",
      "visual_data": {
        "value1": 100,
        "value2": 0,
        "label1": "✓ 245m",
        "label2": ""
      },
      "explanation": "The length of the bridge is 245 metres. Answer: Option A"
    }
  ],
  "calculation": "Speed = 12.5 m/s; Distance = 375m; Bridge = 375 - 130 = 245m",
  "answer": "A",
  "verification": {
    "method1": "Direct: 12.5 m/s × 30s = 375m total, minus 130m train = 245m bridge",
    "method2": "Reverse: 130 + 245 = 375m ÷ 12.5 m/s = 30s ✓",
    "verified": true
  }
}

CRITICAL RULES:
- If the question has no multiple choice options, generate your own A/B/C/D options where A is the correct answer.
- value1 in visual_data should be a percentage (0-100) representing how far along the animation is for that step.
- Every step MUST have a valid visual_data object.
- Return ONLY the raw JSON, no markdown, no extra text.`;

// ── Main controller function ──────────────────────────────────────
async function generateExplanation(req, res) {
  const question = req.sanitizedQuestion;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('[CONFIG ERROR] GEMINI_API_KEY is not set in environment variables.');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error: GEMINI_API_KEY is missing. Please set it on Render.'
    });
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    console.log(`[GEMINI] Sending request for: "${question.substring(0, 80)}..."`);
    
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `Solve this aptitude question visually:\n\n${question}`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        temperature: 0.3,
      }
    });

    const rawContent = response.text;

    if (!rawContent || !rawContent.trim()) {
      console.error('[GEMINI ERROR] Empty response from API.');
      return res.status(500).json({
        success: false,
        error: 'AI returned an empty response. Please try again with a clearer question.'
      });
    }

    // Strip any accidental markdown code fences
    const cleanedContent = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    let parsedResult;
    try {
      parsedResult = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('[PARSE ERROR] Could not parse AI response as JSON.');
      console.error('[PARSE ERROR] Raw (first 500 chars):', cleanedContent.substring(0, 500));
      return res.status(500).json({
        success: false,
        error: 'AI returned an unexpected format. Please try rephrasing your question.'
      });
    }

    // Validate only the truly critical fields
    const requiredFields = ['topic', 'animation_script', 'answer'];
    const missingFields = requiredFields.filter(f => !parsedResult[f]);
    if (missingFields.length > 0) {
      console.error('[VALIDATION ERROR] Missing critical fields:', missingFields);
      console.error('[VALIDATION ERROR] Parsed keys:', Object.keys(parsedResult));
      return res.status(500).json({ success: false, error: 'AI response was incomplete. Please try again.' });
    }

    // Ensure animation_script has at least one step
    if (!Array.isArray(parsedResult.animation_script) || parsedResult.animation_script.length === 0) {
      console.error('[VALIDATION ERROR] animation_script is empty or not an array');
      return res.status(500).json({ success: false, error: 'AI did not generate animation steps. Please try again.' });
    }

    // If AI didn't provide options, create fallback ones
    if (!parsedResult.options) {
      parsedResult.options = { A: parsedResult.answer || 'See solution below', B: 'Option B', C: 'Option C', D: 'Option D' };
    }
    if (!parsedResult.question_text) {
      parsedResult.question_text = question;
    }

    // Ensure correct_answer is set
    parsedResult.correct_answer = parsedResult.answer;

    console.log(`[GEMINI] ✅ Success | Topic: ${parsedResult.topic} | Answer: ${parsedResult.answer} | Steps: ${parsedResult.animation_script.length} | Visual: ${parsedResult.visualType}`);

    return res.status(200).json({ success: true, data: parsedResult });

  } catch (error) {
    console.error('[GEMINI CATCH ERROR]', error?.message || error);
    if (error?.status) console.error('[GEMINI HTTP STATUS]', error.status);
    if (error?.errorDetails) console.error('[GEMINI DETAILS]', JSON.stringify(error.errorDetails));
    
    return res.status(502).json({
      success: false,
      error: `AI service error: ${error?.message || 'Unknown error'}. Please try again in a moment.`
    });
  }
}

module.exports = { generateExplanation };
