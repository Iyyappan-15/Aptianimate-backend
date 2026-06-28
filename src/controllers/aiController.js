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
THE 7 VISUAL ENGINES — USE EXACTLY THESE NAMES
==================================================

1. "bar_engine" — For: Averages, comparisons, quantities
   render_data requires: { bars: [{label:"A", val:30, color:"#7C3AED"}, ...] }

2. "node_engine" — For: Factor trees, HCF/LCM, family trees (Blood Relations)
   render_data requires: { nodes: [{id:1, text:"A (Brother)", level:0}, {id:2, text:"B (Sister)", level:0}, {id:3, text:"C (Father)", level:0}, {id:4, text:"D", level:1, parentId:3}] }

   ★ BLOOD RELATIONS GOLDEN RULE:
   Every step in a Blood Relations question MUST include ALL persons from the question in the nodes array.
   NEVER remove or skip a person between steps. The full family tree is shown in step 1 and stays visible throughout.
   Use "highlight: true" on the nodes being discussed in that step to focus attention.
   Use "parentId" to draw lines from parent to child nodes.
   Use level:0 for the top generation (grandparents/siblings at same level), level:1 for next generation (children), level:2 for grandchildren.

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

7. "pie_engine" — For: Pie charts, Data Interpretation percentages/degrees
   render_data requires: { slices: [{ label: "Rent", val: 30, color: "#7C3AED" }, { label: "Food", val: 20, color: "#1D9E75" }] }
   Note: 'val' can be percentages (summing to 100), degrees (summing to 360), or absolute numbers.

==================================================
STEP FLOW — ALWAYS follow this pattern for 7 steps
==================================================
Step 1: Visualize the COMPLETE problem setup (Primary engine — show ALL entities at once)
Step 2: Highlight the first key relationship (Primary engine — keep ALL entities, highlight relevant ones)
Step 3: Show the logical chain / formula (Primary engine or formula_engine)
Step 4: Highlight the next key relationship (Primary engine — keep ALL entities)
Step 5: Derive the answer relationship (Primary engine or formula_engine)
Step 6: Compare Options (bar_engine or primary engine)
Step 7: Final full picture with answer highlighted (Primary engine — show ALL entities, highlight answer)

==================================================
CRITICAL ENGINE MAPPING (PRIMARY ENGINE RULES)
==================================================
You MUST select the PRIMARY engine based on the topic and use it for Steps 1, 2, 4, and 7:
- Topic: Averages / Mixtures => PRIMARY ENGINE MUST BE 'bar_engine'
- Topic: Data Interpretation (Pie Charts) => PRIMARY ENGINE MUST BE 'pie_engine'
- Topic: HCF & LCM / Number Systems => PRIMARY ENGINE MUST BE 'node_engine' (Factor trees)
- Topic: Blood Relations => PRIMARY ENGINE MUST BE 'node_engine' (Family trees)
- Topic: Time, Speed, Distance / Trains => PRIMARY ENGINE MUST BE 'entity_engine' (Moving objects)
- Topic: Percentages / Fractions => PRIMARY ENGINE MUST BE 'grid_engine'
- Topic: Ages / Number Series => PRIMARY ENGINE MUST BE 'axis_engine'

==================================================
BLOOD RELATIONS — COMPLETE EXAMPLE (STUDY THIS)
==================================================

For question: "If A is the brother of B; B is the sister of C; and C is the father of D, how is D related to A?"

{
  "_thought_process": "A, B, C are siblings (same generation). C is father of D. So D is child of C. A is sibling of C. Therefore A is uncle/aunt of D. Since A is brother (male), A is D's uncle. D is A's nephew/niece.",
  "topic": "Blood Relations",
  "subTopic": "Family Tree",
  "concept": "Sibling of parent = Uncle/Aunt",
  "difficulty": "Easy",
  "visualization_chosen": "Full family tree with all 4 members",
  "visual_engine": "node_engine",
  "formula": "Parent's Sibling = Uncle or Aunt",
  "question_text": "If A is the brother of B; B is the sister of C; and C is the father of D, how is D related to A?",
  "options": { "A": "Father", "B": "Nephew or Niece", "C": "Brother", "D": "Uncle" },
  "answer": "B",
  "animation_script": [
    {
      "step": 1,
      "title": "The Complete Family Tree",
      "visual_engine": "node_engine",
      "render_data": {
        "nodes": [
          { "id": 1, "text": "A (Brother)", "level": 0 },
          { "id": 2, "text": "B (Sister)", "level": 0 },
          { "id": 3, "text": "C (Father)", "level": 0 },
          { "id": 4, "text": "D", "level": 1, "parentId": 3 }
        ]
      },
      "explanation": "Here is the full family. A, B, and C are siblings at the same level. C is the father of D, one level below."
    },
    {
      "step": 2,
      "title": "A, B, C Are Siblings",
      "visual_engine": "node_engine",
      "render_data": {
        "nodes": [
          { "id": 1, "text": "A (Brother)", "level": 0, "highlight": true },
          { "id": 2, "text": "B (Sister)", "level": 0, "highlight": true },
          { "id": 3, "text": "C (Sibling)", "level": 0, "highlight": true },
          { "id": 4, "text": "D", "level": 1, "parentId": 3 }
        ]
      },
      "explanation": "A is brother of B. B is sister of C. So A, B, and C are all siblings of the same generation."
    },
    {
      "step": 3,
      "title": "C is Father of D",
      "visual_engine": "node_engine",
      "render_data": {
        "nodes": [
          { "id": 1, "text": "A (Brother)", "level": 0 },
          { "id": 2, "text": "B (Sister)", "level": 0 },
          { "id": 3, "text": "C (Father)", "level": 0, "highlight": true },
          { "id": 4, "text": "D (Child)", "level": 1, "parentId": 3, "highlight": true }
        ]
      },
      "explanation": "C is the father of D. The line from C to D shows this parent-child relationship."
    },
    {
      "step": 4,
      "title": "A is C's Sibling",
      "visual_engine": "node_engine",
      "render_data": {
        "nodes": [
          { "id": 1, "text": "A (Brother)", "level": 0, "highlight": true },
          { "id": 2, "text": "B (Sister)", "level": 0 },
          { "id": 3, "text": "C (Father)", "level": 0, "highlight": true },
          { "id": 4, "text": "D (Child)", "level": 1, "parentId": 3 }
        ]
      },
      "explanation": "A is the brother of C. The sibling of a parent is an uncle or aunt."
    },
    {
      "step": 5,
      "title": "The Key Rule",
      "visual_engine": "formula_engine",
      "render_data": {
        "formula_vars": [
          { "symbol": "A", "label": "Sibling of C", "color": "a" },
          { "symbol": "+", "color": "op" },
          { "symbol": "C", "label": "Father of D", "color": "b" },
          { "symbol": "=", "color": "op" },
          { "symbol": "A", "label": "Uncle of D", "color": "c" }
        ]
      },
      "explanation": "Since A is the sibling of C (D's father), A is D's Uncle. Therefore D is A's Nephew or Niece."
    },
    {
      "step": 6,
      "title": "Check the Options",
      "visual_engine": "bar_engine",
      "render_data": {
        "bars": [
          { "label": "A: Father", "val": 20, "color": "#6B7280" },
          { "label": "B: Nephew/Niece", "val": 90, "color": "#10B981", "highlight": true },
          { "label": "C: Brother", "val": 20, "color": "#6B7280" },
          { "label": "D: Uncle", "val": 20, "color": "#6B7280" }
        ]
      },
      "explanation": "D is related to A as Nephew or Niece. Option B is correct."
    },
    {
      "step": 7,
      "title": "Final Answer",
      "visual_engine": "node_engine",
      "render_data": {
        "nodes": [
          { "id": 1, "text": "A (Uncle)", "level": 0, "highlight": true },
          { "id": 2, "text": "B (Sister)", "level": 0 },
          { "id": 3, "text": "C (Father)", "level": 0 },
          { "id": 4, "text": "D (Nephew/Niece)", "level": 1, "parentId": 3, "highlight": true }
        ]
      },
      "explanation": "D is A's Nephew or Niece. A is D's Uncle. Answer: Option B."
    }
  ],
  "verification": {
    "method1": "A is sibling of C → A is uncle of D → D is nephew/niece of A ✓",
    "method2": "C is D's father and A is C's brother → A is D's paternal uncle ✓",
    "verified": true
  }
}

==================================================
COMPLETE MATH EXAMPLE — COPY THIS EXACT STRUCTURE
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
6. If no options given, generate A/B/C/D options. You MUST randomly assign the correct answer to A, B, C, or D (do NOT always use A). Ensure the "answer" field exactly matches the letter of the correct option.
7. BLOOD RELATIONS ONLY: All 7 steps MUST use node_engine (except Step 5 which can use formula_engine, and Step 6 which MUST use bar_engine). EVERY step's nodes array MUST contain ALL persons from the question — never omit anyone.`;

// ── Blood Relations: guarantee ALL persons appear in every node_engine step ──
function enforceAllPersonsInNodes(parsedResult, question) {
  const topic = (parsedResult.topic || '').toLowerCase();
  const isBloodRelations = topic.includes('blood') || topic.includes('relation') || topic.includes('family');
  if (!isBloodRelations) return parsedResult;

  // Extract all distinct single capital letters mentioned in the question (A, B, C, D, etc.)
  // These represent the persons in the family tree
  const personMatches = (question || '').match(/\b([A-Z])\b/g) || [];
  const allPersons = [...new Set(personMatches)].sort(); // alphabetical: A, B, C, D...

  if (allPersons.length === 0) return parsedResult;
  console.log(`[ENFORCE] Blood Relations persons found in question: ${allPersons.join(', ')}`);

  if (!Array.isArray(parsedResult.animation_script)) return parsedResult;

  parsedResult.animation_script = parsedResult.animation_script.map((step, stepIdx) => {
    if (step.visual_engine !== 'node_engine') return step;
    if (!step.render_data) step.render_data = {};
    if (!Array.isArray(step.render_data.nodes)) step.render_data.nodes = [];

    const nodes = step.render_data.nodes;

    // Build a map of which persons are already represented
    const representedPersons = new Set();
    nodes.forEach(n => {
      const text = (n.text || '').toUpperCase();
      allPersons.forEach(p => {
        // Match: starts with "A ", "A(", or is exactly "A"
        if (text === p || text.startsWith(p + ' ') || text.startsWith(p + '(') || text.startsWith(p + ' (')) {
          representedPersons.add(p);
        }
      });
    });

    // Add missing persons at the FRONT of the nodes array (so they appear leftmost)
    const missing = allPersons.filter(p => !representedPersons.has(p));
    if (missing.length > 0) {
      console.log(`[ENFORCE] Step ${stepIdx + 1}: Missing persons ${missing.join(', ')} — injecting nodes`);
      const maxId = nodes.length > 0 ? Math.max(...nodes.map(n => Number(n.id) || 0)) : 0;
      const injected = missing.map((person, i) => ({
        id: maxId + i + 1,
        text: person,
        level: 0
      }));
      // Prepend missing persons so they appear at the start (leftmost = first person)
      step.render_data.nodes = [...injected, ...nodes];
    }

    return step;
  });

  return parsedResult;
}

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

    // ── Post-process: guarantee all Blood Relations persons appear in every step ──
    parsedResult = enforceAllPersonsInNodes(parsedResult, question);

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
