// ─────────────────────────────────────────────────────────────
//  config/buildSystemPrompt.js
//  Assembles the final LLM system prompt from all three layers:
//    Layer 01 — base system_prompt from persona JSON
//    Layer 02 — real ANES respondent demographics
//    Layer 03 — already embedded in the base prompt
//  Plus the user's opening statement as conversation context.
// ─────────────────────────────────────────────────────────────

export function buildSystemPrompt(basePrompt, anesProfile, userStatement) {
  const parts = [basePrompt.trim()];

  // ── Layer 02 injection ────────────────────────────────────
  if (anesProfile?.demographics) {
    const d = anesProfile.demographics;
    const a = anesProfile.key_attitudes || {};

    const backgroundLines = [
      d.age_group   && `Age group: ${d.age_group}`,
      d.education   && `Education: ${d.education}`,
      d.income      && d.income !== "Refused / not reported" && `Income: ${d.income}`,
      d.region      && `Region: ${d.region}`,
      d.religion    && `Religion: ${d.religion}`,
    ].filter(Boolean);

    if (backgroundLines.length > 0) {
      parts.push(
`YOUR BACKGROUND
You are a real person drawn from survey data, not an archetype. Speak from this specific life situation — it shapes how you arrived at your convictions, not just what they are.
${backgroundLines.map(l => `- ${l}`).join("\n")}`
      );
    }
  }

  // ── User statement injection ──────────────────────────────
  if (userStatement?.trim()) {
    parts.push(
`OPENING CONTEXT
Before this conversation began, your interlocutor shared this statement:
"${userStatement.trim()}"
You do not need to pretend you haven't heard it. This is where the conversation starts. Respond to the substance of what they actually believe — not to a generic version of their position.`
    );
  }

  return parts.join("\n\n");
}
