// src/controllers/aiController.js
// ─────────────────────────────────────────────────────────────────
//  The core logic. Calls Google Gemini 3.5 Flash and returns structured JSON
//  for the visual animation engine.
// ─────────────────────────────────────────────────────────────────

const { GoogleGenAI } = require('@google/genai');

const MODEL = 'gemini-3.5-flash';

const SYSTEM_PROMPT = `You are AptitudeAnimate's Visual Intelligence Engine v2.0.

Your task is to transform every aptitude question into an interactive visual learning experience. The goal is that a beginner should understand the concept by watching the animation, even if they don't read most of the text.

==================================================
CORE PHILOSOPHY
==================================================
❌ Never create: Animation -> Large paragraph -> Answer
✅ Instead create: Visual -> Visual -> Visual -> Tiny explanation -> Final Answer

- Every step must introduce exactly ONE new idea.
- The visual is the explanation. Text only supports the animation.
- Explain things like you are talking to a beginner. Use EXTREMELY SIMPLE English.
- Maximum 2–3 short lines of text per step. Never explain what is already visible.

==================================================
VISUALIZATION LIBRARY
==================================================
You must automatically choose from these visual systems based on the topic:
- Number System: Number Line, Prime Factor Tree, Division Machine, Modulo Circle, Factor Blocks, Colored Factors, Place Value Blocks, Digit Split
- LCM/HCF: Multiples Timeline, Gear Synchronization, Prime Tree, Factor Merge, Jump Number Line, Euclidean Reduction
- Percentages: 100 Grid, Progress Ring, Liquid Fill, Coins, Colored Squares, Pie Percentage
- Ratio & Proportion: Colored Blocks, Pizza Slices, Balance Scale
- Average: Equal Height Bars, Water Equalization, Block Transfer
- Profit & Loss: Money Wallet, Price Tag, Shopping Cart, Arrow Profit/Loss
- Simple/Compound Interest: Money Stack, Timeline, Growing Coins, Exponential Growth Curve
- Time & Work: Workers, Brick Construction, Progress Bar, Water Filling
- Pipes & Cisterns: Tank, Pipe Flow, Water Level, Leak Animation
- Time Speed Distance: Road, Cars, Train, Clock, Distance Line
- Probability/Combinatorics: Coins, Dice, Cards, Marbles, Spinner, Seats, Tree Diagram
- Clocks/Calendars: Working Clock, Rotating Hands, Animated Calendar
- Logical/Relations: Family Tree, Direction Map, Circular Table, Logic Branches, Decision Tree

==================================================
STEP STRUCTURE
==================================================
Every explanation must follow this logical flow (generate as many steps as needed, usually 6-10):
1. Understand the problem (Visual setup)
2. Visualize the data (Show given numbers)
3. Identify concept (Show the math relationship)
4. Apply formula visually (Animate formula formation)
5. Perform calculation visually (Compute step-by-step)
6. Verify / Shortcut (If applicable)
7. Final Answer & Key Takeaway

==================================================
ENGINE SELECTION (visual_engine)
==================================================
To render your chosen visual, you must map it to one of our 6 Super Engines:
1. "grid_engine" (for 100 Grid, Colored Squares, Place Value, Liquid Fill)
2. "node_engine" (for Prime Factor Tree, Family Tree, Decision Tree, Logic Branches)
3. "axis_engine" (for Number Line, Multiples Timeline, Distance Line, Calendar)
4. "bar_engine" (for Equal Height Bars, Difference Bars, Block Transfer, Charts)
5. "entity_engine" (for Coins, Cars, Trains, Workers, Seats, Circular Table)
6. "formula_engine" (for animating formulas and algebraic solving)

==================================================
OUTPUT FORMAT
==================================================
Return ONLY valid JSON.
{
  "_thought_process": "Brief internal verification: How can I make the learner see the concept before calculating?",
  "topic": "Time Speed Distance",
  "subTopic": "Relative Speed",
  "concept": "Total Distance = Sum of Speeds × Time",
  "difficulty": "Easy",
  "visualization_chosen": "Road and Cars",
  "visual_engine": "entity_engine",
  "question_text": "Cleaned question...",
  "options": { "A": "...", "B": "..." },
  "answer": "A",
  "animation_script": [
    {
      "step": 1,
      "title": "Setup the Scene",
      "visual_engine": "entity_engine",
      "render_data": {
        "entities": [{ "type": "car", "color": "blue", "label": "40 km/hr" }, { "type": "car", "color": "red", "label": "60 km/hr" }],
        "distance": 200
      },
      "explanation": "Two cars are 200km apart on a road."
    },
    {
      "step": 2,
      "title": "The Concept",
      "visual_engine": "formula_engine",
      "render_data": {
        "formula_vars": [{ "symbol": "Speed", "color": "a" }, { "symbol": "×", "color": "black" }, { "symbol": "Time", "color": "b" }]
      },
      "explanation": "Since they move towards each other, their speeds add up."
    }
    // ... continue steps following the STEP STRUCTURE
  ]
}

CRITICAL RULES:
- \`render_data\` is a flexible object. You must invent appropriate keys for the engine (e.g. \`grid_size\`, \`nodes\`, \`axis_points\`, \`bars\`, \`entities\`).
- If the question has no multiple choice options, generate your own A/B/C/D options where A is the correct answer.
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
    
    const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];
    let response = null;
    let lastError = null;

    for (const currentModel of modelsToTry) {
      try {
        console.log(`[GEMINI] Attempting with model: ${currentModel}`);
        response = await ai.models.generateContent({
          model: currentModel,
          contents: `Solve this aptitude question visually:\n\n${question}`,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            temperature: 0.3,
          }
        });
        // If we get a response, break out of the retry loop
        if (response && response.text) {
          console.log(`[GEMINI] Success with model: ${currentModel}`);
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[GEMINI WARN] Model ${currentModel} failed: ${err.status || err.message}`);
        // If it's a 503 (Overloaded) or 429 (Rate Limit), we continue to the next model.
        // Otherwise, it might be a bad request (400), so we should still try the fallback just in case.
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('All models failed to return a valid response.');
    }

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
    
    // Extract a clean error message from the nested Google JSON if present
    let cleanMessage = 'Unknown error';
    if (error?.message) {
      try {
        // Sometimes the message is a stringified JSON object
        const parsedMsg = JSON.parse(error.message);
        cleanMessage = parsedMsg.error?.message || error.message;
      } catch (e) {
        // If it's not JSON, just use the string directly
        cleanMessage = error.message;
      }
    }

    // Special handling for high demand / overloaded servers
    if (error?.status === 503 || cleanMessage.toLowerCase().includes('high demand') || cleanMessage.toLowerCase().includes('unavailable')) {
      cleanMessage = 'The AI is currently experiencing high demand. Please wait a few seconds and try again.';
    }

    return res.status(502).json({
      success: false,
      error: cleanMessage
    });
  }
}

module.exports = { generateExplanation };
