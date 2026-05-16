// ─────────────────────────────────────────────────────────────
//  services/llm.js
//  Groq API wrapper using OpenAI-compatible endpoint.
//  Rival uses the large model; Evaluator + Facilitator use fast.
// ─────────────────────────────────────────────────────────────

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY ?? "";
const GROQ_BASE    = "https://api.groq.com/openai/v1";

export const MODELS = {
  rival:       "llama-3.3-70b-versatile",  // strongest — needs nuanced persona
  evaluator:   "llama-3.1-8b-instant",     // JSON only — fast model is enough
  facilitator: "llama-3.1-8b-instant",     // 1–3 sentences — fast model is enough
};

/**
 * Send a chat completion request to Groq.
 * @param {string} model      - one of MODELS.*
 * @param {string} system     - system prompt
 * @param {Array}  messages   - [{role, content}, ...]
 * @returns {string}          - raw text response
 */
async function callGroq(model, system, messages) {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        ...messages,
      ],
      temperature: 0.8,
      max_tokens: 400,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

/**
 * Generate a Rival response.
 * @param {string} systemPrompt  - RIVAL_SYSTEM from prompts.js
 * @param {Array}  history       - full conversation history
 * @returns {string}
 */
export async function callRival(systemPrompt, history) {
  const system = systemPrompt + "\n\nIMPORTANT: Do not prefix your response with [RIVAL], [FACILITATOR], or any role label. Speak directly.";
  return callGroq(MODELS.rival, system, history);
}

/**
 * Run the Facilitator Evaluator.
 * Always returns a valid object — never throws to the caller.
 * @param {string} systemPrompt  - EVALUATOR_SYSTEM from prompts.js
 * @param {Array}  recentTurns   - last 3–4 turns as [{role, content}]
 * @returns {{ intervene: boolean, trigger?: string, reason?: string }}
 */
export async function callEvaluator(systemPrompt, recentTurns) {
  try {
    const raw = await callGroq(MODELS.evaluator, systemPrompt, recentTurns);
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    // If parse fails, default to no intervention
    return { intervene: false };
  }
}

/**
 * Generate a Facilitator intervention response.
 * @param {string} systemPrompt  - FACILITATOR_SYSTEM from prompts.js
 * @param {Array}  history       - full conversation history
 * @param {string} trigger       - "hostility" | "abstraction" | "loop"
 * @param {string} reason        - one-sentence reason from evaluator
 * @returns {string}
 */
export async function callFacilitator(systemPrompt, history, trigger, reason) {
  const system = systemPrompt + "\n\nIMPORTANT: Do not prefix your response with [FACILITATOR], [RIVAL], or any role label. Speak directly.";
  const injected = [
    ...history,
    {
      role: "user",
      content: `[SYSTEM: Intervene now. Trigger: ${trigger}. Reason: ${reason}. Speak as the Facilitator.]`,
    },
  ];
  return callGroq(MODELS.facilitator, system, injected);
}
