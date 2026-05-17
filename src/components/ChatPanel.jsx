// ─────────────────────────────────────────────────────────────
//  components/ChatPanel.jsx
//  Left panel — message history + text input.
//  Receives messages + sendMessage from App via useConversation.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { useVoiceInput } from "../hooks/useVoiceInput";
import MessageBubble from "./MessageBubble";

const STATUS_LABELS = {
  parallel:    "Running Rival + Evaluator in parallel…",
  rival:       "Rival generating draft…",
  evaluator:   "Evaluator analyzing conversation…",
  router:      "Router reading evaluator output…",
  pass:        "Rival draft approved…",
  intervene:   "Intervention triggered…",
  facilitator: "Facilitator composing response…",
  tts:         "Sending to ElevenLabs TTS…",
  speaking:    "Speaking…",
};

export default function ChatPanel({ messages, activeStep, loading, aiSpeaking, sendMessage }) {
  const [input,   setInput]   = useState("");
  const bottomRef             = useRef(null);
  const textareaRef           = useRef(null);

  const {
    isSupported,
    isActive:    micActive,
    isRecording,
    status:      voiceStatus,
    toggleListening,
  } = useVoiceInput({ onSubmit: sendMessage, aiSpeaking });

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Refocus textarea after loading finishes
  useEffect(() => {
    if (!loading) textareaRef.current?.focus();
  }, [loading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    sendMessage(text);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const statusLabel = STATUS_LABELS[activeStep] ?? null;

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      borderRight: "1px solid rgba(255,255,255,0.07)",
      overflow: "hidden",
    }}>

      {/* Panel header */}
      <div style={{
        padding: "20px 28px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <div style={{ fontSize: "18px", fontWeight: "500", color: "#f0e6d3", marginBottom: "4px" }}>
          Practice Engagement
        </div>
        <div style={{
          fontSize: "12px",
          fontFamily: "'IBM Plex Mono', monospace",
          color: "rgba(255,255,255,0.28)",
        }}>
          Engage the Rival. The Facilitator monitors and may intervene.
        </div>
      </div>

      {/* Message list */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "24px 28px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}>
        {/* Empty state */}
        {messages.length === 0 && (
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
            color: "rgba(255,255,255,0.18)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "28px" }}>⚖</div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px",
              letterSpacing: "0.12em",
            }}>
              BEGIN THE CONVERSATION
            </div>
            <div style={{ fontSize: "13px", maxWidth: "300px", lineHeight: "1.65", fontStyle: "italic" }}>
              Share your view on immigration, trade, or national identity. The Rival will respond.
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <div key={msg.id} style={{ animation: "fadeIn 0.3s ease forwards" }}>
            <MessageBubble msg={msg} />
          </div>
        ))}

        {/* Loading status */}
        {loading && statusLabel && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "rgba(255,255,255,0.28)",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "11px",
          }}>
            <div style={{
              width: "13px", height: "13px",
              border: "1.5px solid rgba(196,164,132,0.35)",
              borderTopColor: "#c4a484",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              flexShrink: 0,
            }} />
            {statusLabel}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: "14px 28px 18px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.2)",
        flexShrink: 0,
      }}>

        {/* Voice status — shown while mic is active */}
        {micActive && (
          <div style={{
            marginBottom: "10px",
            minHeight: "28px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <div style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: isRecording ? "#c4a484" : "rgba(196,164,132,0.25)",
              flexShrink: 0,
              animation: isRecording ? "pulse 0.7s ease-in-out infinite" : "none",
              transition: "background 0.2s",
            }} />
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px",
              color: voiceStatus ? "rgba(196,164,132,0.8)" : "rgba(255,255,255,0.18)",
              fontStyle: "italic",
            }}>
              {voiceStatus || "Listening — speak to respond"}
            </div>
          </div>
        )}

        <div style={{
          display: "flex",
          gap: "10px",
          alignItems: "flex-end",
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${micActive ? "rgba(196,164,132,0.25)" : "rgba(255,255,255,0.09)"}`,
          borderRadius: "12px",
          padding: "10px 14px",
          transition: "border-color 0.3s",
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
            placeholder={micActive ? "Or type here…" : "Speak your perspective… (Enter to send)"}
            rows={2}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              color: "#f0e6d3",
              fontFamily: "'Lora', Georgia, serif",
              fontSize: "14px",
              lineHeight: "1.6",
              opacity: loading ? 0.4 : 1,
            }}
          />

          {/* Mic toggle button */}
          {isSupported && (
            <button
              onClick={toggleListening}
              title={micActive ? "Stop microphone" : "Start microphone"}
              style={{
                background: micActive
                  ? (isRecording ? "#c4a484" : "rgba(196,164,132,0.22)")
                  : "rgba(255,255,255,0.06)",
                border: `1px solid ${micActive ? "rgba(196,164,132,0.45)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: "8px",
                width: "34px",
                height: "34px",
                cursor: "pointer",
                color: micActive ? "#c4a484" : "rgba(255,255,255,0.3)",
                fontSize: "15px",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                animation: isRecording ? "pulse 0.7s ease-in-out infinite" : "none",
              }}
            >
              {micActive ? "🎙" : "🎤"}
            </button>
          )}

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{
              background: input.trim() && !loading ? "#c4a484" : "rgba(196,164,132,0.18)",
              border: "none",
              borderRadius: "8px",
              width: "34px",
              height: "34px",
              cursor: input.trim() && !loading ? "pointer" : "default",
              color: input.trim() && !loading ? "#0e0d0b" : "rgba(255,255,255,0.18)",
              fontSize: "16px",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ↑
          </button>
        </div>

        <div style={{
          marginTop: "7px",
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "9px",
          color: "rgba(255,255,255,0.12)",
          textAlign: "center",
        }}>
          {micActive
            ? "Mic active · speak naturally · silence triggers response · tap 🎤 to stop"
            : "Strong disagreement is expected · Facilitator intervenes only when conversation quality is at risk"}
        </div>
      </div>

    </div>
  );
}
