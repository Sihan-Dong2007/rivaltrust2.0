// detector.js — fast pre-filter before the Evaluator
// returns { flag: false } or { flag: true, signal: "hostility"|"abstraction"|"loop" }

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY ?? "";
const GROQ_BASE    = "https://api.groq.com/openai/v1";
const DETECTOR_MODEL = "llama-3.1-8b-instant";

const DETECTOR_PROMPT = `You are a fast pre-filter for a conversation monitoring system.

Your job: scan the most recent exchange and decide if a human facilitator MIGHT need to step in. You are NOT making the final call — you're just flagging cases for deeper review.

Flag if you detect:
1. HOSTILITY — contempt, insults, weaponized language, personal attacks
2. ABSTRACTION — conversation has lost all concrete grounding, purely theoretical
3. LOOP — same arguments repeating without any progress

IMPORTANT: You are a QUICK SCREENER, not the final judge. Err on the side of caution — if something MIGHT be a problem, flag it. The heavy Evaluator will make the final call.

OUTPUT: JSON only, no explanation, no markdown.

If no signal:
{"flag": false}

If signal detected:
{"flag": true, "signal": "hostility"|"abstraction"|"loop"}`;

export async function detect(currentText, recentMessages = []) {
  try {
    // Build a focused context string
    const context = recentMessages
      .slice(-3)
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");

    const fullContext = context + `\nUSER: ${currentText}`;

    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: DETECTOR_MODEL,
        messages: [
          { role: "system", content: DETECTOR_PROMPT },
          { role: "user", content: `Recent conversation:\n\n${fullContext}\n\nScan now.` },
        ],
        temperature: 0.3,
        max_tokens: 50,
      }),
    });

    if (!res.ok) {
      console.error("Detector LLM error:", res.status);
      return { flag: false }; // fail open
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);

  } catch (err) {
    console.error("Detector parse error:", err);
    return { flag: false };
  }
}
