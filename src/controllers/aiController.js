// src/controllers/aiController.js
// ─────────────────────────────────────────────────────────────────
//  The core logic. Calls Google Gemini 3.5 Flash and returns structured JSON
//  for the visual animation engine.
// ─────────────────────────────────────────────────────────────────

const { GoogleGenAI } = require('@google/genai');

const MODEL = 'gemini-3.5-flash';

const SYSTEM_PROMPT = `You are AptitudeAnimate's Visual Intelligence Engine v2.0.
Your ONLY job is to return a valid JSON object. No markdown, no explanation outside the JSON.

CRITICAL PHILOSOPHY:
- Every step MUST have a visual_engine and render_data that makes sense
- Text is secondary. The VISUAL tells the story
- Keep explanation to MAX 2 short sentences per step

==================================================
THE 6 VISUAL ENGINES — USE EXACTLY THESE NAMES
==================================================

1. "bar_engine" — For: Averages, comparisons, quantities
   render_data requires: { bars: [{label:"A", val:30, color:"#7C3AED"}, ...] }

2. "node_engine" — For: Factor trees, HCF/LCM, family trees
   render_data requires: { nodes: [{id:1, text:"12", level:0}, {id:2, text:"2×2×3", level:1, parentId:1}] }

3. "axis_engine" — For: Number lines, sequences, timelines
   render_data requires: { points:[{val:0,label:"Start"},{val:12,label:"LCM",highlight:true}], jumps:[{from:0,to:6,label:"+6"}] }

4. "grid_engine" — For: Percentages, fractions, 100-square grids
   render_data requires: { rows:10, cols:10, fill_count:25, label:"25%" }

5. "entity_engine" — For: Moving cars/trains, workers, coins
   render_data requires: { entities:[{type:"train",label:"60km/h",startX:5,endX:80,duration:2},{type:"car",label:"40km/h",startX:95,endX:20,duration:2}] }
   Entity types allowed: "car", "train", "coin", "worker", "person", "box"

6. "formula_engine" — For: Showing formulas, substituting numbers
   render_data requires: { formula_vars:[{symbol:"D",label:"Distance",color:"a"},{symbol:"=",color:"op"},{symbol:"S",label:"Speed",color:"b"},{symbol:"×",color:"op"},{symbol:"T",label:"Time",color:"c"}] }
   Colors: "a"=violet, "b"=teal, "c"=amber, "d"=coral, "op"=muted (for operators)

==================================================
STEP FLOW — ALWAYS follow this pattern for 7 steps
==================================================
Step 1: Visualize the problem (Use the PRIMARY engine for the topic)
Step 2: Show the given numbers (Use the PRIMARY engine for the topic)
Step 3: Show the formula being used (Use 'formula_engine')
Step 4: Break down the calculation (Use the PRIMARY engine for the topic)
Step 5: Substitute numbers into formula (Use 'formula_engine')
Step 6: Compare Options (Use 'bar_engine' or the PRIMARY engine)
Step 7: Verify the answer (Use 'formula_engine')

==================================================
CRITICAL ENGINE MAPPING (PRIMARY ENGINE RULES)
==================================================
You MUST select the PRIMARY engine based on the topic and use it for Steps 1, 2, and 4:
- Topic: Averages / Mixtures / Data => PRIMARY ENGINE MUST BE 'bar_engine'
- Topic: HCF & LCM / Number Systems => PRIMARY ENGINE MUST BE 'node_engine' (Factor trees)
- Topic: Time, Speed, Distance / Trains => PRIMARY ENGINE MUST BE 'entity_engine' (Moving objects)
- Topic: Percentages / Fractions => PRIMARY ENGINE MUST BE 'grid_engine'
- Topic: Ages / Number Series => PRIMARY ENGINE MUST BE 'axis_engine'

==================================================
COMPLETE EXAMPLE OUTPUT — COPY THIS EXACT STRUCTURE
==================================================

For question: "A train 130m long crosses a 245m bridge at 45 km/hr. Find the time."

{
  "_thought_process": "Train crosses = train length + bridge length. Total = 375m. Speed = 12.5 m/s. Time = 30s.",
  "topic": "Trains",
  "subTopic": "Crossing a Bridge",
  "concept": "Time = Total Distance ÷ Speed",
  "difficulty": "Medium",
  "visualization_chosen": "Moving train crossing a bridge",
  "visual_engine": "entity_engine",
  "formula": "Time = (Train Length + Bridge Length) ÷ Speed",
  "question_text": "A train 130m long crosses a bridge 245m long at 45 km/hr. Find the time taken.",
  "options": { "A": "30 sec", "B": "28 sec", "C": "25 sec", "D": "32 sec" },
  "answer": "A",
  "animation_script": [
    {
      "step": 1,
      "title": "The Scene",
      "visual_engine": "entity_engine",
      "render_data": {
        "entities": [
          { "type": "train", "label": "130m Train", "startX": 5, "endX": 70, "duration": 2.5, "delay": 0 }
        ]
      },
      "explanation": "A 130m train is moving at 45 km/hr. It needs to cross a 245m long bridge."
    },
    {
      "step": 2,
      "title": "Total Distance",
      "visual_engine": "bar_engine",
      "render_data": {
        "bars": [
          { "label": "Train", "val": 130, "color": "#7C3AED" },
          { "label": "Bridge", "val": 245, "color": "#0D9488" },
          { "label": "Total", "val": 375, "color": "#D97706", "highlight": true }
        ]
      },
      "explanation": "Total distance = Train (130m) + Bridge (245m) = 375m."
    },
    {
      "step": 3,
      "title": "Convert Speed",
      "visual_engine": "formula_engine",
      "render_data": {
        "formula_vars": [
          { "symbol": "45", "label": "km/hr", "color": "a" },
          { "symbol": "×", "color": "op" },
          { "symbol": "5/18", "label": "convert", "color": "b" },
          { "symbol": "=", "color": "op" },
          { "symbol": "12.5", "label": "m/s", "color": "c" }
        ]
      },
      "explanation": "Convert 45 km/hr to m/s by multiplying by 5/18 = 12.5 m/s."
    },
    {
      "step": 4,
      "title": "The Formula",
      "visual_engine": "formula_engine",
      "render_data": {
        "formula_vars": [
          { "symbol": "Time", "label": "Answer", "color": "c" },
          { "symbol": "=", "color": "op" },
          { "symbol": "Distance", "label": "375m", "color": "a" },
          { "symbol": "÷", "color": "op" },
          { "symbol": "Speed", "label": "12.5 m/s", "color": "b" }
        ]
      },
      "explanation": "Time = Total Distance ÷ Speed."
    },
    {
      "step": 5,
      "title": "Calculate",
      "visual_engine": "formula_engine",
      "render_data": {
        "formula_vars": [
          { "symbol": "375", "label": "metres", "color": "a" },
          { "symbol": "÷", "color": "op" },
          { "symbol": "12.5", "label": "m/s", "color": "b" },
          { "symbol": "=", "color": "op" },
          { "symbol": "30", "label": "seconds", "color": "c" }
        ]
      },
      "explanation": "375 ÷ 12.5 = 30 seconds."
    },
    {
      "step": 6,
      "title": "Compare Options",
      "visual_engine": "bar_engine",
      "render_data": {
        "bars": [
          { "label": "A: 30s", "val": 30, "color": "#10B981", "highlight": true },
          { "label": "B: 28s", "val": 28, "color": "#6B7280" },
          { "label": "C: 25s", "val": 25, "color": "#6B7280" },
          { "label": "D: 32s", "val": 32, "color": "#6B7280" }
        ]
      },
      "explanation": "Our answer is 30 seconds. Option A is correct!"
    },
    {
      "step": 7,
      "title": "Verify",
      "visual_engine": "formula_engine",
      "render_data": {
        "formula_vars": [
          { "symbol": "12.5", "label": "m/s", "color": "a" },
          { "symbol": "×", "color": "op" },
          { "symbol": "30", "label": "sec", "color": "b" },
          { "symbol": "=", "color": "op" },
          { "symbol": "375m", "label": "✓ Correct!", "color": "c" }
        ]
      },
      "explanation": "Check: 12.5 × 30 = 375m = 130 + 245. Verified!"
    }
  ],
  "verification": {
    "method1": "12.5 m/s × 30s = 375m = 130 + 245 ✓",
    "method2": "Reverse: 375 ÷ 30 = 12.5 m/s = 45 km/hr ✓",
    "verified": true
  }
}

RULES:
1. Every step MUST have visual_engine and render_data with real numbers.
2. render_data must ALWAYS be filled with actual data from the question.
3. Use colors from question numbers: pick real values for bar heights, nodes, etc.
4. Return ONLY raw JSON. No markdown. No code fences. No extra text outside JSON.
5. Generate exactly 7 steps following the STEP FLOW above.
6. If no options given, generate A/B/C/D options. You MUST randomly assign the correct answer to A, B, C, or D (do NOT always use A). Ensure the "answer" field exactly matches the letter of the correct option.`;

// ── Main controller function ──────────────────────────────────────
async function generateExplanation(req, res) {
  const question = req.sanitizedQuestion;
  const imageBase64 = req.body.image || null; // optional — set for vision requests
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
    const isVisionRequest = !!imageBase64;
    const mode = isVisionRequest ? 'VISION (image + text)' : 'TEXT';
    console.log(`[GEMINI] Mode: ${mode} | Question: "${(question || '(image only)').substring(0, 60)}..."`);

    // Build the contents payload
    // TEXT-ONLY: a plain string (existing behaviour, unchanged)
    // VISION:    a parts array — inlineData image first, then the text prompt
    const buildContents = (model) => {
      if (!isVisionRequest) {
        return `Solve this aptitude question visually:\n\n${question}`;
      }
      // Strip the data-URL prefix ("data:image/jpeg;base64,") to get raw base64
      const rawBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const textPrompt = question
        ? `Extract all data from the chart/table in the image. Then solve this question step by step:\n\n${question}`
        : `Extract all data from the chart/table in the image. Identify the question being asked and solve it step by step.`;
      return [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: rawBase64,
          },
        },
        { text: textPrompt },
      ];
    };
    
    const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];
    let response = null;
    let lastError = null;

    for (const currentModel of modelsToTry) {
      try {
        console.log(`[GEMINI] Attempting with model: ${currentModel}`);
        response = await ai.models.generateContent({
          model: currentModel,
          contents: buildContents(currentModel),
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
