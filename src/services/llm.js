// llm.js — Groq API calls for all three roles

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY ?? "";
const GROQ_BASE    = "/api/groq/openai/v1";

export const MODELS = {
  rival:       "llama-3.3-70b-versatile",  // needs the bigger model for persona depth
  evaluator:   "llama-3.1-8b-instant",     // just outputs JSON, 8b is fine
  facilitator: "llama-3.1-8b-instant",     // short responses, 8b is fine
};

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

export async function callRival(systemPrompt, history) {
  const system = systemPrompt + "\n\nIMPORTANT: Do not prefix your response with [RIVAL], [FACILITATOR], or any role label. Speak directly.";
  return callGroq(MODELS.rival, system, history);
}

// always returns a valid object — if JSON parse fails, default to no intervention
export async function callEvaluator(systemPrompt, recentTurns) {
  try {
    const raw = await callGroq(MODELS.evaluator, systemPrompt, recentTurns);
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return { intervene: false };
  }
}

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
