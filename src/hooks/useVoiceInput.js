// useVoiceInput.js
// AudioContext VAD → MediaRecorder → ElevenLabs Scribe
// volume > 30 for 250ms triggers recording, 1.5s silence ends it

import { useState, useRef, useCallback, useEffect } from "react";
import { stopCurrentSpeech } from "../services/elevenlabs";

const VOLUME_THRESHOLD = 30;
const SPEECH_HOLD_MS   = 250;
const SILENCE_MS       = 1500;
const VAD_POLL_MS      = 40;

export function useVoiceInput({ onSubmit, aiSpeaking = false }) {
  const [isActive,    setIsActive]    = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status,      setStatus]      = useState("");

  const streamRef        = useRef(null);
  const audioCtxRef      = useRef(null);
  const vadTimerRef      = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const silenceRef       = useRef(null);
  const speechOnsetRef   = useRef(null);

  const isActiveRef    = useRef(false);
  const isRecordingRef = useRef(false);
  const aiSpeakingRef  = useRef(false);

  const clearSilence = () => {
    if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null; }
  };

  // send completed audio blob to Scribe, submit transcript on success
  const transcribeAndSubmit = useCallback(async (blob) => {
    setStatus("Transcribing…");
    try {
      const form = new FormData();
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      form.append("file", blob, `audio.${ext}`);
      form.append("model_id", "scribe_v1");

      const res = await fetch("/api/elevenlabs/v1/speech-to-text", {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error(await res.text());
      const { text } = await res.json();
      if (text?.trim()) onSubmit(text.trim());
    } catch (err) {
      console.error("Scribe error:", err);
    } finally {
      setStatus("");
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  }, [onSubmit]);

  // stop: if submit=true, transcribe; if false, just discard
  const stopRecording = useCallback((submit) => {
    clearSilence();
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === "inactive") return;

    mr.onstop = () => {
      const mimeType = mr.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      if (submit) {
        transcribeAndSubmit(blob);
      } else {
        setIsRecording(false);
        isRecordingRef.current = false;
        setStatus("");
      }
    };
    try { mr.stop(); } catch (_) {}
  }, [transcribeAndSubmit]);

  const startRecording = useCallback(() => {
    if (!streamRef.current || isRecordingRef.current) return;
    stopCurrentSpeech();
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    const mr = new MediaRecorder(streamRef.current, { mimeType });
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mediaRecorderRef.current = mr;
    mr.start();
    isRecordingRef.current = true;
    setIsRecording(true);
    setStatus("Recording…");
  }, []);

  // poll volume every 40ms; sustained loudness starts recording, silence ends it
  const startVAD = useCallback((stream) => {
    const ctx      = new AudioContext();
    const source   = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    audioCtxRef.current = ctx;

    const data = new Uint8Array(analyser.frequencyBinCount);

    const poll = () => {
      if (!isActiveRef.current) return;
      analyser.getByteFrequencyData(data);
      const volume = data.reduce((a, b) => a + b, 0) / data.length;
      const loud   = volume > VOLUME_THRESHOLD;

      if (loud && !isRecordingRef.current) {
        if (!speechOnsetRef.current) speechOnsetRef.current = Date.now();
        if (Date.now() - speechOnsetRef.current >= SPEECH_HOLD_MS) {
          speechOnsetRef.current = null;
          startRecording();
        }
      } else if (loud && isRecordingRef.current) {
        speechOnsetRef.current = null;
        clearSilence();
      } else if (!loud) {
        speechOnsetRef.current = null;
        if (isRecordingRef.current && !silenceRef.current) {
          silenceRef.current = setTimeout(() => stopRecording(true), SILENCE_MS);
        }
      }

      vadTimerRef.current = setTimeout(poll, VAD_POLL_MS);
    };

    poll();
  }, [startRecording, stopRecording]);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current   = stream;
      isActiveRef.current = true;
      setIsActive(true);
      setStatus("");
      startVAD(stream);
    } catch (err) {
      console.error("Mic denied:", err);
    }
  }, [startVAD]);

  const stopListening = useCallback(() => {
    isActiveRef.current = false;
    setIsActive(false);
    setIsRecording(false);
    isRecordingRef.current = false;
    setStatus("");
    clearSilence();
    if (vadTimerRef.current) { clearTimeout(vadTimerRef.current); vadTimerRef.current = null; }
    stopRecording(false);
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, [stopRecording]);

  const toggleListening = useCallback(() => {
    if (isActive) stopListening();
    else           startListening();
  }, [isActive, startListening, stopListening]);

  // AI 开始说话时丢弃正在录的音频
  useEffect(() => {
    aiSpeakingRef.current = aiSpeaking;
    if (!isActive) return;
    if (aiSpeaking && isRecordingRef.current) stopRecording(false);
  }, [aiSpeaking, isActive, stopRecording]);

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (vadTimerRef.current) clearTimeout(vadTimerRef.current);
      audioCtxRef.current?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      clearSilence();
    };
  }, []);

  return {
    isSupported: !!navigator.mediaDevices?.getUserMedia,
    isActive,
    isRecording,
    status,
    toggleListening,
  };
}
