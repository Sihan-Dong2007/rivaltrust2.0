// useConversation.js
// turn flow: Rival + Detector run in parallel, Evaluator only called if Detector flags something

import { useState, useCallback } from "react";
import { callRival, callEvaluator, callFacilitator } from "../services/llm";
import { speak, speakFiller, unlockAudio } from "../services/elevenlabs";
import { detect } from "../services/detector";
import { RIVAL_SYSTEM as RIVAL_SYSTEM_DEFAULT, EVALUATOR_SYSTEM, FACILITATOR_SYSTEM } from "../config/prompts";

export const ARCH_STEPS = [
  { id: "idle",        label: "Waiting",               desc: "Waiting for user input" },
  { id: "parallel",    label: "Parallel Processing",   desc: "Rival draft + detector running simultaneously" },
  { id: "rival",       label: "Rival Generating",      desc: "Rival LLM producing draft response" },
  { id: "detector",    label: "Detector Scanning",     desc: "Rule-based pre-filter checking for risk signals" },
  { id: "clear",       label: "Detector: Clear",       desc: "No risk signals — skipping Evaluator" },
  { id: "escalate",    label: "Escalating",            desc: "Risk signal found — calling Evaluator LLM" },
  { id: "evaluator",   label: "Evaluator Analyzing",   desc: "Facilitator Evaluator making final judgment (70b)" },
  { id: "router",      label: "Router Deciding",       desc: "Code router reading evaluator JSON" },
  { id: "pass",        label: "Rival Passes",          desc: "No intervention — Rival draft used as-is" },
  { id: "intervene",   label: "Facilitator Intervenes",desc: "Intervention confirmed — Facilitator takes over" },
  { id: "facilitator", label: "Facilitator Generating",desc: "Facilitator LLM producing response" },
  { id: "tts",         label: "ElevenLabs TTS",        desc: "Text sent to voice engine" },
  { id: "speaking",    label: "Speaking",              desc: "Response delivered to user" },
];

function toApiHistory(messages) {
  return messages
    .filter((m) => ["user", "rival", "facilitator"].includes(m.role))
    .map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.role === "user" ? m.content : `[${m.role.toUpperCase()}]: ${m.content}`,
    }));
}

export function useConversation(rivalSystemOverride) {
  const RIVAL_SYSTEM = rivalSystemOverride || RIVAL_SYSTEM_DEFAULT;
  const [messages,    setMessages]    = useState([]);
  const [activeStep,  setActiveStep]  = useState("idle");
  const [loading,     setLoading]     = useState(false);
  const [aiSpeaking,  setAiSpeaking]  = useState(false);
  const [turnCount,   setTurnCount]   = useState(0);
  const [lastTrigger, setLastTrigger] = useState(null);
  const [lastReason,  setLastReason]  = useState(null);

  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), ...msg }]);
  }, []);

  // keeps aiSpeaking true for the duration of playback
  const speakWithFlag = useCallback(async (text, role) => {
    setAiSpeaking(true);
    try { await speak(text, role); } finally { setAiSpeaking(false); }
  }, []);

  const goTo = useCallback((stepId, delay = 0) => {
    return new Promise((resolve) =>
      setTimeout(() => { setActiveStep(stepId); resolve(); }, delay)
    );
  }, []);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return;
    unlockAudio(); // Safari: must be called before any await, while still in gesture context

    setLoading(true);
    addMessage({ role: "user", content: text });
    setTurnCount((n) => n + 1);

    // kick off rival + detector in parallel
    await goTo("parallel", 150);

    const history     = toApiHistory(messages);
    const userTurn    = { role: "user", content: text };
    const fullHistory = [...history, userTurn];

    setActiveStep("rival");

    const rivalPromise    = callRival(RIVAL_SYSTEM, fullHistory);
    const detectorPromise = detect(text, history);

    await goTo("detector", 600);

    const [rivalDraft, detectorResult] = await Promise.all([rivalPromise, detectorPromise]);

    await new Promise((r) => setTimeout(r, 200));

    if (!detectorResult.flag) {
      // clean — go straight to output
      await goTo("clear", 100);
      await new Promise((r) => setTimeout(r, 350));
      await goTo("tts", 100);

      addMessage({ role: "rival", content: rivalDraft });
      await speakWithFlag(rivalDraft, "rival");

      await goTo("speaking", 100);

    } else {
      // something flagged — call Evaluator for final judgment
      await goTo("escalate", 100);
      await new Promise((r) => setTimeout(r, 300));
      await goTo("evaluator", 100);

      // last 4 turns, flattened to a single user message so Evaluator sees clean context
      const recentForEval = fullHistory.slice(-4).map((m) => ({
        role: "user",
        content: `${m.role.toUpperCase()}: ${m.content}`,
      }));

      const evalResult = await callEvaluator(EVALUATOR_SYSTEM, recentForEval);

      await goTo("router", 100);
      await new Promise((r) => setTimeout(r, 350));

      if (!evalResult.intervene) {
        // false alarm — rival goes through
        await goTo("pass", 100);
        await new Promise((r) => setTimeout(r, 300));
        await goTo("tts", 100);

        addMessage({ role: "rival", content: rivalDraft });
        await speakWithFlag(rivalDraft, "rival");

        await goTo("speaking", 100);

      } else {
        setLastTrigger(evalResult.trigger);
        setLastReason(evalResult.reason);

        await goTo("intervene", 100);

        // play filler sound while waiting on Facilitator LLM — hides the latency
        addMessage({ role: "system", content: "Facilitator stepping in…" });
        setAiSpeaking(true);
        const [facResponse] = await Promise.all([
          callFacilitator(FACILITATOR_SYSTEM, fullHistory, evalResult.trigger, evalResult.reason),
          speakFiller(),
        ]);
        setAiSpeaking(false);

        await goTo("facilitator", 100);
        await goTo("tts", 200);

        addMessage({ role: "facilitator", content: facResponse, trigger: evalResult.trigger });
        await speakWithFlag(facResponse, "facilitator");

        await goTo("speaking", 100);
      }
    }

    await goTo("idle", 600);
    setLoading(false);

  }, [loading, messages, addMessage, goTo]);

  return {
    messages,
    activeStep,
    loading,
    aiSpeaking,
    turnCount,
    lastTrigger,
    lastReason,
    sendMessage,
  };
}
