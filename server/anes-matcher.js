// ─────────────────────────────────────────────────────────────
//  server/anes-matcher.js
//  Shared logic: load ANES CSV → filter by persona → LLM pick
//  Used by both the Express server and the Vite dev plugin.
// ─────────────────────────────────────────────────────────────

import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CSV_PATH = path.resolve(__dirname, "../scripts/data/anes_timeseries_2024_csv_20260519.csv");

// ── column indices (0-based) ──────────────────────────────────
const COL = {
  case_id:   1,
  pid4:      47,
  ideology:  221,
  immig:     379,
  age_group: 420,
  educ:      425,
  income:    428,
  region:    432,
  religion:  426,
};

// ── label maps (for LLM prompt — concise) ────────────────────
const LABELS = {
  pid4:      { 1:"Democrat", 2:"Lean-Democrat", 3:"Lean-Republican", 4:"Republican" },
  ideology:  { 1:"Very liberal", 2:"Liberal", 3:"Moderate", 4:"Conservative", 5:"Very conservative" },
  immig:     { 1:"Decrease immigration", 2:"Same level", 3:"Increase immigration" },
  age_group: { 1:"18–34", 2:"35–54", 3:"55+" },
  educ:      { 1:"<HS", 2:"HS diploma", 3:"Some college", 4:"2-yr degree", 5:"Bachelor's", 6:"Master's", 7:"Advanced degree" },
  income:    { 1:"<$20k", 2:"$20–29k", 3:"$30–39k", 4:"$40–59k", 5:"$60–74k", 6:"$75–89k", 7:"$90–124k", 8:"Declined" },
  region:    { 1:"Northeast", 2:"Midwest", 3:"South", 4:"Mountain West", 5:"Pacific Coast" },
  religion:  { 1:"Protestant", 2:"Catholic", 3:"Other religion", 4:"No religion" },
};

// ── full labels (for display in the UI) ──────────────────────
const FULL_LABELS = {
  age_group: { 1:"18–34", 2:"35–54", 3:"55 and older" },
  educ:      { 1:"Less than high school", 2:"High school diploma / GED", 3:"Some college, no degree",
                4:"2-year associate degree", 5:"Bachelor's degree", 6:"Master's degree", 7:"Professional / doctoral degree" },
  income:    { 1:"Under $20,000", 2:"$20,000–$29,999", 3:"$30,000–$39,999", 4:"$40,000–$59,999",
                5:"$60,000–$74,999", 6:"$75,000–$89,999", 7:"$90,000–$124,999", 8:"Refused / not reported" },
  region:    { 1:"Northeast", 2:"Midwest", 3:"South", 4:"Mountain West", 5:"Pacific Coast" },
  religion:  { 1:"Protestant", 2:"Catholic", 3:"Other religion", 4:"No religion / secular" },
  pid4:      { 1:"Democrat (strong / not strong)", 2:"Independent leaning Democrat",
                3:"Independent leaning Republican", 4:"Republican (strong / not strong)" },
  ideology:  { 1:"Extremely liberal", 2:"Liberal", 3:"Moderate", 4:"Conservative", 5:"Extremely conservative" },
  immig:     { 1:"Decrease immigration levels", 2:"Keep immigration levels the same", 3:"Increase immigration levels" },
};

// ── persona filter specs ──────────────────────────────────────
const PERSONA_FILTERS = {
  POL_PROG_01: {
    pid4:      { in: [1] },
    ideology:  { in: [1, 2] },
    immig:     { in: [3] },
    educ:      { gte: 4 },
    age_group: { in: [1, 2] },
  },
  POL_LIB_01: {
    pid4:      { in: [1, 2] },
    ideology:  { in: [2, 3] },
    educ:      { gte: 4 },
  },
  POL_NAT_01: {
    pid4:      { in: [4] },
    ideology:  { in: [4, 5] },
    immig:     { in: [1] },
    educ:      { lte: 4 },
  },
  POL_CONS_01: {
    pid4:      { in: [3, 4] },
    ideology:  { in: [4, 5] },
    age_group: { in: [2, 3] },
    religion:  { in: [1, 2] },
  },
};

const PERSONA_LABELS = {
  POL_PROG_01: "Progressive Activist",
  POL_LIB_01:  "Institutional Liberal",
  POL_NAT_01:  "Populist Nationalist",
  POL_CONS_01: "Religious Conservative",
};

// ── data cache ────────────────────────────────────────────────
let _rows = null;

function loadRows() {
  if (_rows) return _rows;
  console.log("[anes-matcher] Loading ANES CSV into memory…");
  const raw  = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = raw.split("\n").filter(l => l.trim());
  _rows = lines.slice(1).map(l => l.split(","));
  console.log(`[anes-matcher] ${_rows.length} respondents loaded.`);
  return _rows;
}

// ── helpers ───────────────────────────────────────────────────
function getVal(row, key) {
  const raw = (row[COL[key]] || "").trim();
  const n   = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

function isValid(row, key) {
  const n = getVal(row, key);
  return n !== null && n > 0;
}

function passesFilter(row, filters) {
  for (const [key, cond] of Object.entries(filters)) {
    if (!isValid(row, key)) return false;
    const n = getVal(row, key);
    if (cond.in  && !cond.in.includes(n))  return false;
    if (cond.gte && n < cond.gte)          return false;
    if (cond.lte && n > cond.lte)          return false;
  }
  return true;
}

function lbl(map, key, val) {
  return (map[key] || {})[val] || `Code ${val}`;
}

function formatCandidateForLLM(row, idx) {
  const g = (k) => getVal(row, k);
  return `[${idx}] Age:${lbl(LABELS,"age_group",g("age_group"))} | `+
    `Educ:${lbl(LABELS,"educ",g("educ"))} | `+
    `Income:${lbl(LABELS,"income",g("income"))} | `+
    `Region:${lbl(LABELS,"region",g("region"))} | `+
    `Religion:${lbl(LABELS,"religion",g("religion"))} | `+
    `Party:${lbl(LABELS,"pid4",g("pid4"))} | `+
    `Ideology:${lbl(LABELS,"ideology",g("ideology"))} | `+
    `Immigration:${lbl(LABELS,"immig",g("immig"))}`;
}

function buildRespondentProfile(row) {
  const g  = (k) => getVal(row, k);
  const fl = (k, v) => lbl(FULL_LABELS, k, v);
  const caseId = (row[COL.case_id] || "").trim();

  return {
    source:        "ANES 2024 Time Series",
    dataset_url:   "https://electionstudies.org/data-center/2024-time-series-study/",
    note:          "Real ANES 2024 respondent — dynamically selected based on your statement",
    respondent_id: `ANES2024-TS-${caseId}`,
    demographics: {
      age_group:      fl("age_group", g("age_group")),
      age_group_code: String(g("age_group")),
      education:      fl("educ", g("educ")),
      education_code: String(g("educ")),
      income:         fl("income", g("income")),
      income_code:    String(g("income")),
      region:         fl("region", g("region")),
      region_code:    String(g("region")),
      religion:       fl("religion", g("religion")),
      religion_code:  String(g("religion")),
    },
    key_attitudes: {
      pid4: {
        variable: "V241008x",
        label:    "Party identification (4-cat derived)",
        value:    String(g("pid4")),
        meaning:  fl("pid4", g("pid4")),
      },
      ideo5: {
        variable: "V241200",
        label:    "Ideology self-placement (5-pt)",
        value:    String(g("ideology")),
        meaning:  fl("ideology", g("ideology")),
      },
      immigration: {
        variable: "V241360",
        label:    "Immigration level preference (3-cat)",
        value:    String(g("immig")),
        meaning:  fl("immig", g("immig")),
      },
    },
  };
}

// ── LLM call (server-side, direct to Groq) ────────────────────
const RESPONDENT_MATCHER_SYSTEM = `You are selecting a conversation partner for a user inside Rivaltrust Builder.

Given a user's political statement and a list of real survey respondents who all share the same rival worldview, select the respondent whose demographic background would create the most illuminating conversation — not the most extreme disagreement, but the richest human tension. Consider age, education, economic situation, and regional context.

Output ONLY valid JSON with no markdown: {"index": 3, "reason": "one sentence — why this person's background makes the conversation most interesting"}`;

async function callGroqForRespondent(statement, personaLabel, candidateLines, apiKey) {
  const userContent =
    `User statement: "${statement}"\n` +
    `Rival type: ${personaLabel}\n\n` +
    `Candidates:\n${candidateLines.join("\n")}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      model:       "llama-3.1-8b-instant",
      messages:    [
        { role: "system", content: RESPONDENT_MATCHER_SYSTEM },
        { role: "user",   content: userContent },
      ],
      temperature: 0.4,
      max_tokens:  120,
    }),
  });

  if (!res.ok) throw new Error(`Groq error ${res.status}`);
  const data  = await res.json();
  const raw   = data.choices?.[0]?.message?.content?.trim() ?? "{}";
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ── main export ───────────────────────────────────────────────
const SAMPLE_SIZE = 15;

export async function matchRespondent(personaId, statement, groqApiKey) {
  const rows    = loadRows();
  const filters = PERSONA_FILTERS[personaId];
  if (!filters) throw new Error(`Unknown persona: ${personaId}`);

  // Filter full pool
  const pool = rows.filter(r => passesFilter(r, filters));
  if (pool.length === 0) throw new Error("Empty pool for persona");

  // Random sample (up to SAMPLE_SIZE)
  const shuffled   = pool.sort(() => Math.random() - 0.5);
  const candidates = shuffled.slice(0, SAMPLE_SIZE);

  // Format for LLM
  const lines = candidates.map((r, i) => formatCandidateForLLM(r, i));

  // LLM picks best
  const label  = PERSONA_LABELS[personaId] || personaId;
  const result = await callGroqForRespondent(statement, label, lines, groqApiKey);

  const idx      = Math.max(0, Math.min(result.index ?? 0, candidates.length - 1));
  const selected = candidates[idx];

  return {
    respondent:         buildRespondentProfile(selected),
    respondent_reason:  result.reason || "",
    pool_size:          pool.length,
    sample_size:        candidates.length,
  };
}
