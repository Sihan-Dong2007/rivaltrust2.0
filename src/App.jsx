// ─────────────────────────────────────────────────────────────
//  App.jsx
//  Root component. Handles layout only — no logic lives here.
//  All conversation state comes from useConversation().
// ─────────────────────────────────────────────────────────────

import TopBar     from "./components/TopBar";
import ChatPanel  from "./components/ChatPanel";
import ArchPanel  from "./components/ArchPanel";
import { useConversation } from "./hooks/useConversation";

export default function App() {
  const {
    messages,
    activeStep,
    loading,
    aiSpeaking,
    turnCount,
    lastTrigger,
    lastReason,
    sendMessage,
  } = useConversation();

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

      {/* Global styles */}
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
      <TopBar activeStep={activeStep} />

      {/* Main layout: chat (flex) + arch panel (fixed width) */}
      <div style={{
        flex: 1,
        display: "flex",
        overflow: "hidden",
      }}>

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
