// ─────────────────────────────────────────────────────────────
//  App.jsx
//  Route definitions. Each page is self-contained.
// ─────────────────────────────────────────────────────────────

import { Routes, Route, Navigate } from "react-router-dom";
import SelectPage   from "./pages/SelectPage";
import PipelinePage from "./pages/PipelinePage";
import ChatPage     from "./pages/ChatPage";

export default function App() {
  return (
    <Routes>
      <Route path="/"                      element={<SelectPage />} />
      <Route path="/pipeline/:personaId"   element={<PipelinePage />} />
      <Route path="/chat/:personaId"       element={<ChatPage />} />
      <Route path="*"                      element={<Navigate to="/" replace />} />
    </Routes>
  );
}
