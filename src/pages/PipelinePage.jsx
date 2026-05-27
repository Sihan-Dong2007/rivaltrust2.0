// ─────────────────────────────────────────────────────────────
//  pages/PipelinePage.jsx
//  Shows the three-layer persona assembly pipeline:
//  Basic Guideline → ANES Profile → Rival Template
// ─────────────────────────────────────────────────────────────

import { useNavigate, useParams, useLocation } from "react-router-dom";
import POL_NAT from "../data/personas/POL_NAT_01.json";
import POL_PROG from "../data/personas/POL_PROG_01.json";
import POL_CONS from "../data/personas/POL_CONS_01.json";
import POL_LIB from "../data/personas/POL_LIB_01.json";

const PERSONA_MAP = {
  POL_NAT_01: POL_NAT,
  POL_PROG_01: POL_PROG,
  POL_CONS_01: POL_CONS,
  POL_LIB_01: POL_LIB,
};

// ── shared tokens ──────────────────────────────────────────────
const MONO = "'IBM Plex Mono', monospace";
const SERIF = "'Lora', serif";

function SectionLabel({ step, title, color }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{
        fontFamily: MONO, fontSize: "9px", letterSpacing: "0.2em",
        color, marginBottom: "5px", opacity: 0.7,
      }}>
        LAYER {step}
      </div>
      <div style={{
        fontFamily: SERIF, fontSize: "14px", fontWeight: 500, color: "#f0e6d3",
      }}>
        {title}
      </div>
    </div>
  );
}

function Tag({ text, color }) {
  return (
    <span style={{
      display: "inline-block",
      fontFamily: MONO, fontSize: "9px", letterSpacing: "0.1em",
      color, border: `1px solid ${color}`,
      borderRadius: "2px", padding: "2px 7px",
      opacity: 0.65,
    }}>
      {text}
    </span>
  );
}

function ListItem({ text, accent }) {
  const [head, rest] = text.includes(" — ") ? text.split(" — ") : [null, text];
  return (
    <div style={{
      display: "flex", gap: "8px", marginBottom: "9px", lineHeight: 1.55,
    }}>
      <span style={{ color: accent, opacity: 0.55, flexShrink: 0, fontFamily: MONO, fontSize: "10px" }}>→</span>
      <span style={{ fontFamily: SERIF, fontSize: "12px", color: "rgba(240,230,211,0.75)" }}>
        {head && <strong style={{ color: "rgba(240,230,211,0.9)", fontWeight: 600 }}>{head}</strong>}
        {head && " — "}
        {rest}
      </span>
    </div>
  );
}

function AttitudeRow({ label, value, meaning }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
      gap: "12px",
    }}>
      <span style={{ fontFamily: MONO, fontSize: "9px", color: "rgba(240,230,211,0.4)", flexShrink: 0, letterSpacing: "0.05em" }}>
        {label}
      </span>
      <span style={{ fontFamily: SERIF, fontSize: "11px", color: "rgba(240,230,211,0.7)", textAlign: "right" }}>
        {meaning}
      </span>
    </div>
  );
}

function DemoRow({ label, value }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
      gap: "12px",
    }}>
      <span style={{ fontFamily: MONO, fontSize: "9px", color: "rgba(240,230,211,0.35)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: SERIF, fontSize: "11px", color: "rgba(240,230,211,0.65)", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function Arrow() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0 6px", flexShrink: 0,
    }}>
      <div style={{
        fontFamily: MONO, fontSize: "18px",
        color: "rgba(255,255,255,0.12)",
        userSelect: "none",
      }}>
        →
      </div>
    </div>
  );
}

function Col({ children, accent, style = {} }) {
  return (
    <div style={{
      flex: 1,
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderTop: `2px solid ${accent}`,
      borderRadius: "4px",
      padding: "22px 20px",
      overflowY: "auto",
      ...style,
    }}>
      {children}
    </div>
  );
}

export default function PipelinePage() {
  const { personaId } = useParams();
  const navigate  = useNavigate();
  const location  = useLocation();
  const persona   = PERSONA_MAP[personaId];

  // Matching context passed from SelectPage (may be absent if navigated directly)
  const matchState   = location.state || {};
  const {
    statement, tensionAxis, reason: matchReason,
    dynamicRespondent, respondentReason, poolSize, sampleSize,
  } = matchState;

  // Layer 02: prefer dynamically selected respondent, fall back to hardcoded JSON
  const anesProfile = dynamicRespondent || persona?.anesProfile;

  if (!persona) {
    return (
      <div style={{ color: "#f0e6d3", padding: "40px", fontFamily: MONO }}>
        Persona not found: {personaId}
      </div>
    );
  }

  const { accent, label, cluster, persona_id, basic_guideline, template } = persona;

  return (
    <div style={{
      minHeight: "100vh",
      height: "100vh",
      background: "#0e0d0b",
      color: "#f0e6d3",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0e0d0b; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(196,164,132,0.15); border-radius: 2px; }
      `}</style>

      {/* Top bar */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "13px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(12px)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: MONO, fontSize: "10px", letterSpacing: "0.12em",
              color: "rgba(255,255,255,0.3)", padding: 0,
              transition: "color 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.3)"}
          >
            ← BACK
          </button>
          <span style={{ color: "rgba(255,255,255,0.1)", fontSize: "10px" }}>|</span>
          <span style={{
            fontFamily: MONO, fontSize: "12px",
            letterSpacing: "0.2em", color: "rgba(255,255,255,0.55)",
          }}>
            RIVALTRUST BUILDER
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Tag text={persona_id} color={accent} />
          <span style={{
            fontFamily: MONO, fontSize: "10px",
            color: "rgba(255,255,255,0.22)", letterSpacing: "0.1em",
          }}>
            PERSONA PIPELINE
          </span>
        </div>
      </div>

      {/* Persona header */}
      <div style={{
        padding: "22px 32px 18px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        flexShrink: 0,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{
            fontFamily: MONO, fontSize: "9px", letterSpacing: "0.18em",
            color: "rgba(255,255,255,0.25)", marginBottom: "6px",
          }}>
            {cluster.toUpperCase()}
          </div>
          <h2 style={{
            fontFamily: SERIF, fontSize: "22px", fontWeight: 500,
            color: "#f0e6d3", lineHeight: 1.2,
          }}>
            {label}
          </h2>
        </div>

        {/* Start conversation CTA */}
        <button
          onClick={() => navigate(`/chat/${persona_id}`, { state: matchState })}
          style={{
            background: accent,
            border: "none",
            borderRadius: "3px",
            padding: "11px 22px",
            fontFamily: MONO,
            fontSize: "11px",
            letterSpacing: "0.12em",
            color: "#0e0d0b",
            fontWeight: 500,
            cursor: "pointer",
            flexShrink: 0,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.82"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          START CONVERSATION →
        </button>
      </div>

      {/* Match explanation — only shown when arriving from SelectPage */}
      {statement && (
        <div style={{
          margin: "0 32px",
          padding: "16px 20px",
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderLeft: `3px solid ${accent}`,
          borderRadius: "4px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 32px",
          flexShrink: 0,
        }}>
          {/* Left: user's statement */}
          <div>
            <div style={{
              fontFamily: MONO, fontSize: "8px", letterSpacing: "0.16em",
              color: "rgba(255,255,255,0.25)", marginBottom: "7px",
            }}>
              YOUR STATEMENT
            </div>
            <p style={{
              fontFamily: SERIF, fontStyle: "italic",
              fontSize: "12px", color: "rgba(240,230,211,0.55)",
              lineHeight: 1.6,
            }}>
              "{statement}"
            </p>
          </div>
          {/* Right: why this rival */}
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.06)", paddingLeft: "32px" }}>
            <div style={{
              fontFamily: MONO, fontSize: "8px", letterSpacing: "0.16em",
              color: accent, opacity: 0.7, marginBottom: "7px",
            }}>
              {tensionAxis ? tensionAxis.toUpperCase() : "WHY THIS RIVAL"}
            </div>
            <p style={{
              fontFamily: SERIF, fontSize: "12px",
              color: "rgba(240,230,211,0.6)", lineHeight: 1.6,
            }}>
              {matchReason || "This rival's core goods are most threatened by the value you stated."}
            </p>
          </div>
        </div>
      )}

      {/* Pipeline flow label */}
      <div style={{
        padding: "10px 32px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexShrink: 0,
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        {["01 Basic Guideline", "→", "02 ANES Profile", "→", "03 Rival Template"].map((seg, i) => (
          <span key={i} style={{
            fontFamily: MONO,
            fontSize: "9px",
            letterSpacing: seg === "→" ? "0" : "0.14em",
            color: seg === "→" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.28)",
          }}>
            {seg}
          </span>
        ))}
      </div>

      {/* Three-column pipeline */}
      <div style={{
        flex: 1,
        display: "flex",
        gap: "0",
        overflow: "hidden",
        padding: "20px 32px 24px",
        gap: "8px",
        alignItems: "stretch",
      }}>

        {/* ── COLUMN 1: Basic Guideline ── */}
        <Col accent={accent}>
          <SectionLabel step="01" title="Basic Guideline" color={accent} />
          <div style={{
            fontFamily: MONO, fontSize: "8px", color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.1em", marginBottom: "14px",
          }}>
            NORMATIVE CONSTRAINTS — LLM MUST NOT VIOLATE
          </div>

          <div style={{ marginBottom: "18px" }}>
            <div style={{
              fontFamily: MONO, fontSize: "9px", letterSpacing: "0.14em",
              color: accent, opacity: 0.7, marginBottom: "10px",
            }}>
              CORE GOODS
            </div>
            {basic_guideline.core_goods.map((g, i) => (
              <ListItem key={i} text={g} accent={accent} />
            ))}
          </div>

          <div style={{ marginBottom: "18px" }}>
            <div style={{
              fontFamily: MONO, fontSize: "9px", letterSpacing: "0.14em",
              color: accent, opacity: 0.7, marginBottom: "10px",
            }}>
              HARMS FEARED
            </div>
            {basic_guideline.harms_feared.map((h, i) => (
              <ListItem key={i} text={h} accent={accent} />
            ))}
          </div>

          <div>
            <div style={{
              fontFamily: MONO, fontSize: "9px", letterSpacing: "0.14em",
              color: accent, opacity: 0.7, marginBottom: "10px",
            }}>
              CRITIQUE PATTERN
            </div>
            <p style={{
              fontFamily: SERIF, fontStyle: "italic",
              fontSize: "11px", color: "rgba(240,230,211,0.55)",
              lineHeight: 1.65,
            }}>
              {basic_guideline.critique_pattern}
            </p>
          </div>
        </Col>

        <Arrow />

        {/* ── COLUMN 2: ANES Profile ── */}
        <Col accent="#4A8080">
          <SectionLabel step="02" title="ANES Profile" color="#4A8080" />
          <div style={{
            fontFamily: MONO, fontSize: "8px", color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.1em", marginBottom: "14px", display: "flex",
            justifyContent: "space-between", alignItems: "center",
          }}>
            <span>EMPIRICAL GROUNDING</span>
            <span style={{
              color: anesProfile.note.includes("PLACEHOLDER") ? "#8A6030" : "#4A8060",
              fontSize: "8px",
            }}>
              {anesProfile.note.includes("PLACEHOLDER") ? "⚠ PLACEHOLDER" : "✓ REAL DATA"}
            </span>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div style={{
              fontFamily: MONO, fontSize: "9px", letterSpacing: "0.14em",
              color: "#4A8080", opacity: 0.7, marginBottom: "8px",
            }}>
              DEMOGRAPHICS
            </div>
            <DemoRow label="AGE GROUP"  value={anesProfile.demographics.age_group  || anesProfile.demographics.age} />
            <DemoRow label="EDUCATION"  value={anesProfile.demographics.education} />
            <DemoRow label="INCOME"     value={anesProfile.demographics.income      || anesProfile.demographics.income_bracket} />
            <DemoRow label="REGION"     value={anesProfile.demographics.region} />
            <DemoRow label="RELIGION"   value={anesProfile.demographics.religion} />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div style={{
              fontFamily: MONO, fontSize: "9px", letterSpacing: "0.14em",
              color: "#4A8080", opacity: 0.7, marginBottom: "8px",
            }}>
              KEY ATTITUDES
            </div>
            {Object.entries(anesProfile.key_attitudes).map(([key, att]) => (
              <AttitudeRow key={key} label={att.label || key.toUpperCase()} value={att.value} meaning={att.meaning} />
            ))}
          </div>

          {respondentReason && (
            <div style={{
              marginTop: "12px", padding: "8px 10px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "3px",
            }}>
              <div style={{ fontFamily: MONO, fontSize: "8px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", marginBottom: "4px" }}>
                WHY THIS RESPONDENT
              </div>
              <p style={{ fontFamily: SERIF, fontSize: "10px", color: "rgba(240,230,211,0.5)", lineHeight: 1.6 }}>
                {respondentReason}
              </p>
            </div>
          )}
          <div style={{
            marginTop: "10px",
            fontFamily: MONO, fontSize: "8px",
            color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em",
            lineHeight: 1.7,
          }}>
            SOURCE: {anesProfile.source}<br />
            ID: {anesProfile.respondent_id}
            {poolSize && <><br />POOL: {sampleSize} sampled from {poolSize} qualifying respondents</>}
          </div>
        </Col>

        <Arrow />

        {/* ── COLUMN 3: Rival Template (5 components) ── */}
        <Col accent={accent}>
          <SectionLabel step="03" title="Rival Template" color={accent} />
          <div style={{
            fontFamily: MONO, fontSize: "8px", color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.1em", marginBottom: "14px",
          }}>
            5-COMPONENT ASSEMBLED PERSONA
          </div>

          {/* Core goods */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{
              fontFamily: MONO, fontSize: "9px", letterSpacing: "0.14em",
              color: accent, opacity: 0.7, marginBottom: "8px",
            }}>
              CORE GOODS
            </div>
            {template.core_goods.map((g, i) => (
              <ListItem key={i} text={g} accent={accent} />
            ))}
          </div>

          {/* Harms feared */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{
              fontFamily: MONO, fontSize: "9px", letterSpacing: "0.14em",
              color: accent, opacity: 0.7, marginBottom: "8px",
            }}>
              HARMS FEARED
            </div>
            {template.harms_feared.map((h, i) => (
              <ListItem key={i} text={h} accent={accent} />
            ))}
          </div>

          {/* Identity narrative */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{
              fontFamily: MONO, fontSize: "9px", letterSpacing: "0.14em",
              color: accent, opacity: 0.7, marginBottom: "8px",
            }}>
              IDENTITY NARRATIVE
            </div>
            <p style={{
              fontFamily: SERIF, fontStyle: "italic",
              fontSize: "11px", color: "rgba(240,230,211,0.6)",
              lineHeight: 1.65,
            }}>
              "{template.identity_narrative}"
            </p>
          </div>

          {/* Common critique */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{
              fontFamily: MONO, fontSize: "9px", letterSpacing: "0.14em",
              color: accent, opacity: 0.7, marginBottom: "8px",
            }}>
              COMMON CRITIQUE
            </div>
            <p style={{
              fontFamily: SERIF, fontSize: "11px",
              color: "rgba(240,230,211,0.6)", lineHeight: 1.65,
            }}>
              {template.common_critique}
            </p>
          </div>

          {/* Conversational temperament */}
          <div>
            <div style={{
              fontFamily: MONO, fontSize: "9px", letterSpacing: "0.14em",
              color: accent, opacity: 0.7, marginBottom: "10px",
            }}>
              CONVERSATIONAL TEMPERAMENT
            </div>
            {Object.entries(template.conversational_temperament).map(([lvl, desc]) => (
              <div key={lvl} style={{ marginBottom: "10px" }}>
                <div style={{
                  fontFamily: MONO, fontSize: "8px", color: accent,
                  opacity: 0.5, letterSpacing: "0.1em", marginBottom: "4px",
                }}>
                  {lvl.replace("_", " ").toUpperCase()}
                </div>
                <p style={{
                  fontFamily: SERIF, fontSize: "10px",
                  color: "rgba(240,230,211,0.5)", lineHeight: 1.6,
                }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </Col>

      </div>
    </div>
  );
}
