// ─────────────────────────────────────────────────────────────
//  pages/SelectPage.jsx
//  User enters a political value statement → LLM matches to
//  the rival whose core goods are most threatened → pipeline.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { callMatcher, matchRespondentFromANES } from "../services/llm";
import { MATCHER_SYSTEM } from "../config/prompts";

const MONO  = "'IBM Plex Mono', monospace";
const SERIF = "'Lora', serif";

const EXAMPLES = [
  "I believe that economic systems have to be reformed from the ground up — incremental change just preserves the problem.",
  "The most important thing a government can do is protect the rights of individuals against overreach, from any direction.",
  "Communities that lose control of their borders and culture lose something that cannot be recovered.",
  "Moral standards exist independently of what any government decides — and families are where those standards are first taught.",
];

export default function SelectPage() {
  const navigate = useNavigate();
  const [statement, setStatement]   = useState("");
  const [loading,   setLoading]     = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error,     setError]       = useState("");

  const canSubmit = statement.trim().length > 10 && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    const text = statement.trim();
    try {
      // Step 1: select which rival persona
      setLoadingMsg("Identifying your rival…");
      const match = await callMatcher(MATCHER_SYSTEM, text);

      // Step 2: dynamically select a real ANES respondent from full dataset
      setLoadingMsg("Selecting a real respondent from ANES 2024…");
      const anes = await matchRespondentFromANES(match.persona_id, text);

      navigate(`/pipeline/${match.persona_id}`, {
        state: {
          statement:         text,
          tensionAxis:       match.tension_axis,
          reason:            match.reason,
          dynamicRespondent: anes.respondent,
          respondentReason:  anes.respondent_reason,
          poolSize:          anes.pool_size,
          sampleSize:        anes.sample_size,
        },
      });
    } catch (e) {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0e0d0b",
      color: "#f0e6d3",
      display: "flex",
      flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Mono:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0e0d0b; }
        textarea::placeholder { color: rgba(240,230,211,0.2); }
        textarea:focus { outline: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Top bar */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "14px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.18)" }} />
          <span style={{ fontFamily: MONO, fontSize: "12px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.55)" }}>
            RIVALTRUST BUILDER
          </span>
          <span style={{ fontFamily: MONO, fontSize: "10px", color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}>
            · PROTOTYPE
          </span>
        </div>
        <span style={{ fontFamily: MONO, fontSize: "10px", color: "rgba(255,255,255,0.22)", letterSpacing: "0.1em" }}>
          RIVAL MATCHING
        </span>
      </div>

      {/* Main */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 40px",
      }}>
        <div style={{ width: "100%", maxWidth: "620px" }}>

          {/* Step label */}
          <div style={{
            fontFamily: MONO, fontSize: "10px", letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.28)", marginBottom: "20px",
          }}>
            STEP 01 — STATE YOUR POSITION
          </div>

          {/* Heading */}
          <h1 style={{
            fontFamily: SERIF, fontSize: "30px", fontWeight: 500,
            color: "#f0e6d3", lineHeight: 1.25, marginBottom: "12px",
          }}>
            What do you believe?
          </h1>
          <p style={{
            fontFamily: SERIF, fontStyle: "italic",
            fontSize: "14px", color: "rgba(240,230,211,0.42)",
            lineHeight: 1.7, marginBottom: "36px",
          }}>
            Share a political value you hold seriously. A rival will be selected
            whose core goods are most threatened by what you believe — not simply
            the most politically opposite position.
          </p>

          {/* Text input */}
          <div style={{
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "4px",
            background: "rgba(255,255,255,0.03)",
            marginBottom: "16px",
            transition: "border-color 0.2s",
          }}>
            <textarea
              value={statement}
              onChange={e => setStatement(e.target.value)}
              onKeyDown={handleKey}
              placeholder="e.g. I believe that communities have the right to protect their way of life from forces they never voted for…"
              rows={4}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                padding: "18px 20px",
                fontFamily: SERIF,
                fontSize: "15px",
                color: "#f0e6d3",
                lineHeight: 1.65,
                resize: "none",
              }}
            />
            <div style={{
              padding: "10px 20px 12px",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <span style={{
                fontFamily: MONO, fontSize: "9px",
                color: "rgba(255,255,255,0.18)", letterSpacing: "0.1em",
              }}>
                ⌘ + ENTER TO SUBMIT
              </span>
              <span style={{
                fontFamily: MONO, fontSize: "9px",
                color: statement.length > 10 ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)",
              }}>
                {statement.length} chars
              </span>
            </div>
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              width: "100%",
              padding: "14px",
              background: canSubmit ? "rgba(196,164,132,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${canSubmit ? "rgba(196,164,132,0.35)" : "rgba(255,255,255,0.07)"}`,
              borderRadius: "4px",
              fontFamily: MONO,
              fontSize: "11px",
              letterSpacing: "0.16em",
              color: canSubmit ? "#c4a484" : "rgba(255,255,255,0.2)",
              cursor: canSubmit ? "pointer" : "not-allowed",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              marginBottom: "36px",
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 12, height: 12,
                  border: "1.5px solid rgba(196,164,132,0.3)",
                  borderTopColor: "#c4a484",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }} />
                {loadingMsg || "MATCHING RIVAL…"}
              </>
            ) : (
              "FIND MY RIVAL →"
            )}
          </button>

          {error && (
            <div style={{
              fontFamily: MONO, fontSize: "10px",
              color: "#c47070", textAlign: "center", marginBottom: "24px",
            }}>
              {error}
            </div>
          )}

          {/* Example statements */}
          <div>
            <div style={{
              fontFamily: MONO, fontSize: "9px", letterSpacing: "0.16em",
              color: "rgba(255,255,255,0.2)", marginBottom: "12px",
            }}>
              EXAMPLES — CLICK TO USE
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setStatement(ex)}
                  style={{
                    background: "none",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "3px",
                    padding: "10px 14px",
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: SERIF,
                    fontStyle: "italic",
                    fontSize: "12px",
                    color: "rgba(240,230,211,0.35)",
                    lineHeight: 1.55,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = "rgba(240,230,211,0.6)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = "rgba(240,230,211,0.35)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  }}
                >
                  "{ex}"
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
