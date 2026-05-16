// ─────────────────────────────────────────────────────────────
//  hooks/useVoiceInput.js
//
//  Two-layer voice pipeline:
//
//  Layer 1 — VAD (Voice Activity Detection)
//    getUserMedia({ echoCancellation: true }) → AudioContext analyser
//    This stream has AI echo removed at the OS/browser level,
//    so volume spikes here = real user speech, not AI playback.
//
//  Layer 2 — Transcription
//    SpeechRecognition starts only when VAD confirms real speech.
//    By that point stopCurrentSpeech() has already fired,
//    so the AI is silent and SpeechRecognition won't pick it up.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from "react";
import { stopCurrentSpeech } from "../services/elevenlabs";

const VOLUME_THRESHOLD = 18;  // 0-255; raise if too sensitive, lower if not triggering
const VAD_POLL_MS      = 40;  // how often to sample the analyser
const SILENCE_MS       = 1500; // quiet after last final segment → auto-submit

export function useVoiceInput({ onSubmit, aiSpeaking = false }) {
  const [isActive,   setIsActive]   = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // user currently speaking
  const [liveText,   setLiveText]   = useState("");

  // VAD refs
  const streamRef      = useRef(null);
  const audioCtxRef    = useRef(null);
  const analyserRef    = useRef(null);
  const vadTimerRef    = useRef(null);

  // Transcription refs
  const recognitionRef = useRef(null);
  const recActiveRef   = useRef(false); // is SpeechRecognition currently started?

  // State refs (readable inside closures)
  const isActiveRef    = useRef(false);
  const aiSpeakingRef  = useRef(false);
  const isSpeakingRef  = useRef(false);

  // Silence / accumulation
  const finalTextRef   = useRef("");
  const silenceRef     = useRef(null);

  // ── helpers ──────────────────────────────────────────────────
  const clearSilence = () => {
    if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null; }
  };

  const submitAccumulated = useCallback(() => {
    const text = finalTextRef.current.trim();
    if (!text) return;
    finalTextRef.current = "";
    setLiveText("");
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    onSubmit(text);
  }, [onSubmit]);

  // ── SpeechRecognition (transcription only) ───────────────────
  const buildRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;

    const rec = new SR();
    rec.continuous     = true;
    rec.interimResults = true;
    rec.lang           = "en-US";

    rec.onresult = (event) => {
      let interim = "";
      let finalSeg = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalSeg += r[0].transcript;
        else           interim  += r[0].transcript;
      }
      if (finalSeg) {
        finalTextRef.current += finalSeg + " ";
        clearSilence();
        silenceRef.current = setTimeout(submitAccumulated, SILENCE_MS);
      }
      setLiveText(finalTextRef.current + interim);
    };

    rec.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") {
        console.warn("SpeechRecognition:", e.error);
      }
    };

    // SpeechRecognition stops on its own sometimes — restart if still needed
    rec.onend = () => {
      recActiveRef.current = false;
      if (isActiveRef.current && isSpeakingRef.current && !aiSpeakingRef.current) {
        try { rec.start(); recActiveRef.current = true; } catch (_) {}
      }
    };

    return rec;
  }, [submitAccumulated]);

  const startRecognition = useCallback(() => {
    if (recActiveRef.current) return;
    if (!recognitionRef.current) {
      recognitionRef.current = buildRecognition();
    }
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      recActiveRef.current = true;
    } catch (_) {}
  }, [buildRecognition]);

  const stopRecognition = useCallback(() => {
    recActiveRef.current = false;
    try { recognitionRef.current?.stop(); } catch (_) {}
  }, []);

  // ── VAD loop (AudioContext on echo-cancelled stream) ─────────
  const startVAD = useCallback((stream) => {
    const ctx      = new AudioContext();
    const source   = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    audioCtxRef.current  = ctx;
    analyserRef.current  = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);

    const poll = () => {
      if (!isActiveRef.current) return;
      analyser.getByteFrequencyData(data);
      const volume = data.reduce((a, b) => a + b, 0) / data.length;
      const speaking = volume > VOLUME_THRESHOLD;

      if (speaking && !isSpeakingRef.current) {
        // User just started speaking — interrupt AI immediately
        isSpeakingRef.current = true;
        setIsSpeaking(true);
        stopCurrentSpeech();
        startRecognition();
        clearSilence();
      }

      if (!speaking && isSpeakingRef.current) {
        // Volume dropped — don't mark as silent immediately;
        // the SILENCE_MS timer from SpeechRecognition handles the final submit.
        // But update the visual indicator after a brief dip.
        // (We keep isSpeakingRef true so recognition stays open.)
      }

      vadTimerRef.current = setTimeout(poll, VAD_POLL_MS);
    };

    poll();
  }, [startRecognition]);

  // ── public: toggle ────────────────────────────────────────────
  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation:  true,
          noiseSuppression:  true,
          autoGainControl:   true,
        },
      });
      streamRef.current   = stream;
      isActiveRef.current = true;
      setIsActive(true);
      setLiveText("");
      finalTextRef.current = "";
      recognitionRef.current = buildRecognition();
      startVAD(stream);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  }, [buildRecognition, startVAD]);

  const stopListening = useCallback(() => {
    isActiveRef.current   = false;
    isSpeakingRef.current = false;
    setIsActive(false);
    setIsSpeaking(false);
    setLiveText("");
    finalTextRef.current = "";
    clearSilence();

    // Stop VAD loop
    if (vadTimerRef.current) { clearTimeout(vadTimerRef.current); vadTimerRef.current = null; }

    // Stop recognition
    stopRecognition();
    recognitionRef.current = null;

    // Tear down AudioContext and mic stream
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, [stopRecognition]);

  const toggleListening = useCallback(() => {
    if (isActive) stopListening();
    else           startListening();
  }, [isActive, startListening, stopListening]);

  // ── pause recognition while AI speaks ────────────────────────
  // VAD won't false-trigger (echo cancelled), but SpeechRecognition
  // might still hear residual audio — stop it while AI is speaking.
  useEffect(() => {
    aiSpeakingRef.current = aiSpeaking;
    if (!isActive) return;

    if (aiSpeaking) {
      // Pause transcription; VAD keeps running but won't trigger
      // (echo-cancelled stream has near-zero volume during AI speech)
      stopRecognition();
      clearSilence();
      finalTextRef.current = "";
      setLiveText("");
      isSpeakingRef.current = false;
      setIsSpeaking(false);
    }
    // When aiSpeaking goes false: VAD will restart recognition
    // naturally on next voice detection event — no need to force it.
  }, [aiSpeaking, isActive, stopRecognition]);

  // ── cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (vadTimerRef.current) clearTimeout(vadTimerRef.current);
      stopRecognition();
      audioCtxRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      clearSilence();
    };
  }, [stopRecognition]);

  const isSupported = !!(
    navigator.mediaDevices?.getUserMedia &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)
  );

  return {
    isSupported,
    isActive,
    isSpeaking,
    liveText,
    toggleListening,
    stopListening,
  };
}
