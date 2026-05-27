// llm.js — Groq API calls for all three roles

const GROQ_BASE = "/api/groq/openai/v1";

export const MODELS = {
  rival:       "llama-3.3-70b-versatile",
  evaluator:   "llama-3.1-8b-instant",
  facilitator: "llama-3.1-8b-instant",
  matcher:     "llama-3.1-8b-instant",     // just outputs JSON, fast model fine
};

async function callGroq(model, system, messages) {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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

// Calls backend to dynamically select an ANES respondent for the chosen persona
// Returns { respondent, respondent_reason, pool_size, sample_size }
export async function matchRespondentFromANES(personaId, statement) {
  const res = await fetch("/api/match-respondent", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ persona_id: personaId, statement }),
  });
  if (!res.ok) throw new Error(`match-respondent error ${res.status}`);
  return res.json();
}

// Returns { persona_id, tension_axis, reason } or null on failure
export async function callMatcher(matcherSystem, statement) {
  const VALID_IDS = ["POL_PROG_01", "POL_LIB_01", "POL_NAT_01", "POL_CONS_01"];
  try {
    const raw = await callGroq(
      MODELS.matcher,
      matcherSystem,
      [{ role: "user", content: statement }]
    );
    const clean = raw.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);
    if (!VALID_IDS.includes(result.persona_id)) throw new Error("invalid persona_id");
    return result;
  } catch {
    // fallback: pick randomly so the flow never breaks
    const fallback = VALID_IDS[Math.floor(Math.random() * VALID_IDS.length)];
    return { persona_id: fallback, tension_axis: "Value tension", reason: "" };
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
