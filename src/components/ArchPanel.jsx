// ─────────────────────────────────────────────────────────────
//  components/ArchPanel.jsx
//  Right-side architecture trace panel.
//  Reflects the two-layer detection flow:
//    Layer 1: rule-based detector (instant)
//    Layer 2: Evaluator LLM (only when detector flags)
// ─────────────────────────────────────────────────────────────

import { ARCH_STEPS } from "../hooks/useConversation";

const TRIGGER_COLORS = {
  hostility:   { bg: "#3d1a1a", border: "#c0392b", text: "#e74c3c" },
  abstraction: { bg: "#1a2d3d", border: "#2980b9", text: "#3498db" },
  loop:        { bg: "#2d2a1a", border: "#b7950b", text: "#f39c12" },
};

const GROUPS = [
  { title: "INPUT",    steps: ["idle"] },
  { title: "PARALLEL", steps: ["rival", "detector"] },
  { title: "LAYER 1",  steps: ["clear", "escalate"] },
  { title: "LAYER 2",  steps: ["evaluator", "router"] },
  { title: "BRANCH",   steps: ["pass", "intervene", "facilitator"] },
  { title: "OUTPUT",   steps: ["tts", "speaking"] },
];

export default function ArchPanel({ activeStep, lastTrigger, lastReason, turnCount }) {
  return (
    <div style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: "11px",
    }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "12px" }}>
        <div style={{ color: "#c4a484", fontSize: "10px", letterSpacing: "0.15em", marginBottom: "4px" }}>
          ARCHITECTURE TRACE
        </div>
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px" }}>
          Turn {turnCount} · {activeStep === "idle" ? "STANDBY" : "ACTIVE"}
        </div>
      </div>

      {/* Step groups */}
      {GROUPS.map((group) => (
        <div key={group.title}>
          <div style={{
            color: "rgba(255,255,255,0.18)",
            fontSize: "9px",
            letterSpacing: "0.2em",
            marginBottom: "4px",
          }}>
            {group.title}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            {group.steps.map((sid) => {
              const stepDef  = ARCH_STEPS.find((s) => s.id === sid);
              const isActive = activeStep === sid;

              // Special coloring for clear (green tint) and escalate (amber tint)
              let activeBg     = "rgba(196,164,132,0.12)";
              let activeBorder = "#c4a484";
              let activeDot    = "#c4a484";
              if (sid === "clear") {
                activeBg = "rgba(60,180,80,0.1)"; activeBorder = "#3cb454"; activeDot = "#3cb454";
              }
              if (sid === "escalate") {
                activeBg = "rgba(220,160,40,0.12)"; activeBorder = "#dca028"; activeDot = "#dca028";
              }
              if (sid === "intervene" || sid === "facilitator") {
                activeBg = "rgba(80,140,180,0.12)"; activeBorder = "#70b0e0"; activeDot = "#70b0e0";
              }

              return (
                <div key={sid} style={{
                  borderRadius: "6px",
                  padding: "7px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background:  isActive ? activeBg : "rgba(255,255,255,0.02)",
                  border:      `1px solid ${isActive ? activeBorder : "rgba(255,255,255,0.06)"}`,
                  color:       isActive ? "#f0e6d3" : "rgba(255,255,255,0.28)",
                  boxShadow:   isActive ? `0 0 12px ${activeBg}` : "none",
                  transition:  "all 0.3s ease",
                }}>
                  <div style={{
                    width: "5px", height: "5px", borderRadius: "50%", flexShrink: 0,
                    background: isActive ? activeDot : "rgba(255,255,255,0.1)",
                    boxShadow:  isActive ? `0 0 6px ${activeDot}` : "none",
                    transition: "all 0.3s ease",
                  }} />
                  <div>
                    <div style={{ fontWeight: isActive ? "600" : "400", fontSize: "10px" }}>
                      {stepDef?.label}
                    </div>
                    {isActive && (
                      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "9px", marginTop: "2px" }}>
                        {stepDef?.desc}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Last trigger badge */}
      {lastTrigger && (
        <div style={{
          marginTop: "auto",
          borderRadius: "8px",
          padding: "10px 12px",
          background: TRIGGER_COLORS[lastTrigger]?.bg  || "#1a1a1a",
          border:     `1px solid ${TRIGGER_COLORS[lastTrigger]?.border || "#444"}`,
        }}>
          <div style={{
            color: TRIGGER_COLORS[lastTrigger]?.text || "#fff",
            fontSize: "9px",
            letterSpacing: "0.15em",
            marginBottom: "4px",
          }}>
            LAST TRIGGER · {lastTrigger.toUpperCase()}
          </div>
          <div style={{ color: "rgba(255,255,255,0.42)", fontSize: "10px", lineHeight: "1.5" }}>
            {lastReason}
          </div>
        </div>
      )}

      {/* Flow legend */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        paddingTop: "10px",
        color: "rgba(255,255,255,0.16)",
        fontSize: "9px",
        lineHeight: "1.7",
      }}>
        <div>① Rival + detector run in parallel</div>
        <div>② detector clear → Rival draft direct</div>
        <div>③ detector flag → Evaluator LLM (70b)</div>
        <div>④ intervene:true → Facilitator speaks</div>
      </div>

    </div>
  );
}
