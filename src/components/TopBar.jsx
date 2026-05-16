// ─────────────────────────────────────────────────────────────
//  components/TopBar.jsx
//  Sticky header bar — shows system status and persona label.
// ─────────────────────────────────────────────────────────────

export default function TopBar({ activeStep }) {
  const isActive = activeStep !== "idle";

  return (
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
    }}>
      {/* Left: brand + status dot */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: isActive ? "#c4a484" : "rgba(255,255,255,0.18)",
          boxShadow: isActive ? "0 0 10px #c4a484" : "none",
          animation: isActive ? "pulse 1.5s infinite" : "none",
          transition: "all 0.4s ease",
        }} />
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "12px",
          letterSpacing: "0.2em",
          color: "rgba(255,255,255,0.55)",
        }}>
          RIVALTRUST BUILDER
        </span>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "10px",
          color: "rgba(255,255,255,0.2)",
          letterSpacing: "0.08em",
        }}>
          · PROTOTYPE · PHASE 4
        </span>
      </div>

      {/* Right: persona tag */}
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "10px",
        color: "rgba(255,255,255,0.22)",
        letterSpacing: "0.1em",
      }}>
        POPULIST NATIONALIST RIVAL · FACILITATOR INTERVENTION ENGINE
      </div>
    </div>
  );
}
