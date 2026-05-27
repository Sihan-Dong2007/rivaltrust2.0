// ─────────────────────────────────────────────────────────────
//  pages/ChatPage.jsx
//  Conversation page — loads selected persona and runs the
//  Rival + Evaluator + Facilitator pipeline.
// ─────────────────────────────────────────────────────────────

import { useNavigate, useParams, useLocation } from "react-router-dom";
import ChatPanel  from "../components/ChatPanel";
import ArchPanel  from "../components/ArchPanel";
import { useConversation } from "../hooks/useConversation";
import { buildSystemPrompt } from "../config/buildSystemPrompt";
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

const MONO  = "'IBM Plex Mono', monospace";
const SERIF = "'Lora', serif";

export default function ChatPage() {
  const { personaId }  = useParams();
  const navigate       = useNavigate();
  const location       = useLocation();
  const persona        = PERSONA_MAP[personaId];

  // Pull context from the pipeline flow
  const { statement, dynamicRespondent } = location.state || {};

  // Build enriched system prompt: base + ANES background + user statement
  const rivalSystem = persona
    ? buildSystemPrompt(persona.system_prompt, dynamicRespondent, statement)
    : null;

  const {
    messages,
    activeStep,
    loading,
    aiSpeaking,
    turnCount,
    lastTrigger,
    lastReason,
    sendMessage,
  } = useConversation(rivalSystem);

  if (!persona) {
    return (
      <div style={{ color: "#f0e6d3", padding: "40px", fontFamily: MONO }}>
        Persona not found. <button onClick={() => navigate("/")}>Go back</button>
      </div>
    );
  }

  const isActive = activeStep !== "idle";

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
        body { background: #0e0d0b; overflow: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(196,164,132,0.2); border-radius: 2px; }
        @keyframes pulse   { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
      `}</style>

      {/* Top bar */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "14px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* Status dot */}
          <div style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: isActive ? persona.accent : "rgba(255,255,255,0.18)",
            boxShadow: isActive ? `0 0 10px ${persona.accent}` : "none",
            animation: isActive ? "pulse 1.5s infinite" : "none",
            transition: "all 0.4s ease",
          }} />
          <span style={{
            fontFamily: MONO, fontSize: "12px",
            letterSpacing: "0.2em", color: "rgba(255,255,255,0.55)",
          }}>
            RIVALTRUST BUILDER
          </span>
          <span style={{
            fontFamily: MONO, fontSize: "10px",
            color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em",
          }}>
            · PROTOTYPE · PHASE 4
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => navigate(`/pipeline/${personaId}`)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: MONO, fontSize: "9px", letterSpacing: "0.12em",
              color: "rgba(255,255,255,0.25)", padding: 0,
              transition: "color 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.25)"}
          >
            ← PIPELINE
          </button>
          <span style={{
            fontFamily: MONO, fontSize: "10px",
            color: "rgba(255,255,255,0.22)", letterSpacing: "0.1em",
          }}>
            {persona.label.toUpperCase()} RIVAL · FACILITATOR ENGINE
          </span>
        </div>
      </div>

      {/* Main layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left: conversation */}
        <ChatPanel
          messages={messages}
          activeStep={activeStep}
          loading={loading}
          aiSpeaking={aiSpeaking}
          sendMessage={sendMessage}
        />

        {/* Right: architecture trace */}
        <div style={{
          width: "272px",
          flexShrink: 0,
          padding: "20px",
          overflowY: "auto",
          background: "rgba(0,0,0,0.22)",
        }}>
          <ArchPanel
            activeStep={activeStep}
            lastTrigger={lastTrigger}
            lastReason={lastReason}
            turnCount={turnCount}
          />
        </div>

      </div>
    </div>
  );
}
