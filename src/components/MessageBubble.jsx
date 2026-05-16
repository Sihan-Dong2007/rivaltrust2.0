// ─────────────────────────────────────────────────────────────
//  components/MessageBubble.jsx
//  Renders a single message. Handles four roles:
//    user | rival | facilitator | system (status line)
// ─────────────────────────────────────────────────────────────

const TRIGGER_COLORS = {
  hostility:   "#e74c3c",
  abstraction: "#3498db",
  loop:        "#f39c12",
};

const ROLE_STYLES = {
  user: {
    align: "flex-end",
    bg: "rgba(196,164,132,0.12)",
    border: "rgba(196,164,132,0.3)",
    label: "YOU",
    labelColor: "#c4a484",
    radius: "16px 4px 16px 16px",
  },
  rival: {
    align: "flex-start",
    bg: "rgba(180,60,60,0.1)",
    border: "rgba(180,60,60,0.3)",
    label: "RIVAL",
    labelColor: "#e07070",
    radius: "4px 16px 16px 16px",
  },
  facilitator: {
    align: "flex-start",
    bg: "rgba(80,140,180,0.1)",
    border: "rgba(80,140,180,0.3)",
    label: "FACILITATOR",
    labelColor: "#70b0e0",
    radius: "4px 16px 16px 16px",
  },
};

export default function MessageBubble({ msg }) {
  // System messages (e.g. "Facilitator stepping in…")
  if (msg.role === "system") {
    return (
      <div style={{
        textAlign: "center",
        color: "rgba(255,255,255,0.25)",
        fontSize: "11px",
        fontFamily: "'IBM Plex Mono', monospace",
        padding: "4px 0",
        letterSpacing: "0.05em",
        fontStyle: "italic",
      }}>
        — {msg.content} —
      </div>
    );
  }

  const s = ROLE_STYLES[msg.role];
  if (!s) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: s.align, gap: "4px" }}>

      {/* Role label */}
      <div style={{
        fontSize: "9px",
        fontFamily: "'IBM Plex Mono', monospace",
        color: s.labelColor,
        letterSpacing: "0.15em",
        paddingLeft: msg.role === "user" ? 0 : "2px",
        paddingRight: msg.role === "user" ? "2px" : 0,
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}>
        {s.label}
        {/* Trigger badge — only on facilitator messages */}
        {msg.role === "facilitator" && msg.trigger && (
          <span style={{
            color: TRIGGER_COLORS[msg.trigger] || "#fff",
            fontSize: "9px",
          }}>
            [{msg.trigger.toUpperCase()} DETECTED]
          </span>
        )}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: "80%",
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: s.radius,
        padding: "12px 16px",
        color: "rgba(255,255,255,0.85)",
        fontSize: "14px",
        lineHeight: "1.65",
        fontFamily: "'Lora', Georgia, serif",
      }}>
        {msg.content}
      </div>

    </div>
  );
}
