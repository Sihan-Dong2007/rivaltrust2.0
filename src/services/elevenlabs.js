// ─────────────────────────────────────────────────────────────
//  services/elevenlabs.js
//  ElevenLabs Text-to-Speech integration.
//
//  WHAT YOU NEED TO FILL IN:
//  1. ELEVENLABS_API_KEY  — from elevenlabs.io → Profile → API Keys
//  2. VOICE_IDS           — pick voices from elevenlabs.io → Voice Library
//                           Rival and Facilitator should sound distinct.
//                           Suggested: Rival = deeper/grounded, Facilitator = calm/neutral
//  3. MODEL_ID            — use "eleven_turbo_v2" for lowest latency (~300ms)
//                           or "eleven_multilingual_v2" if you need other languages
// ─────────────────────────────────────────────────────────────

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY ?? "";

// Web Audio API — avoids all Safari HTMLAudioElement + blob URL restrictions.
// AudioContext stays in "running" state once resumed during a user gesture,
// so subsequent async decodeAudioData + start() calls work without restriction.
let _audioCtx = null;
let _currentSource = null;
let _currentResolve = null;

/**
 * Call this synchronously inside a user-gesture handler (before any await).
 * Creates and resumes the AudioContext while Safari allows it.
 */
export function unlockAudio() {
  if (_audioCtx) return;
  _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  _audioCtx.resume().catch(() => {});
}

/** Stop whatever AI audio is playing right now (called on user speech start). */
export function stopCurrentSpeech() {
  if (_currentSource) {
    try { _currentSource.stop(); } catch (_) {}
    _currentSource = null;
  }
  if (_currentResolve) {
    const resolve = _currentResolve;
    _currentResolve = null;
    resolve();
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// ── Step 1: Go to elevenlabs.io → Voice Library → pick two voices ────────────
// Copy the Voice ID from the voice detail page and paste below.
export const VOICE_IDS = {
  rival:       "EST9Ui6982FZPSi7gCHi",       // e.g. "21m00Tcm4TlvDq8ikWAM" (Rachel)
  facilitator: "Q1QcmfZPmFDVUWmzASdy", // e.g. "AZnzlk1XvdvUeBnXmlld" (Domi)
  filler:      "Q1QcmfZPmFDVUWmzASdy", // same as facilitator for "Hmm…" filler
};

// ── Step 2: Choose a model ────────────────────────────────────────────────────
// "eleven_turbo_v2"        → fastest, ~300ms, English only       ← recommended
// "eleven_multilingual_v2" → slower, ~600ms, supports more languages
const MODEL_ID = "eleven_turbo_v2";

// ── Step 3: Voice settings (optional tuning) ──────────────────────────────────
const VOICE_SETTINGS = {
  stability:        0.5,  // 0 = expressive/variable, 1 = very stable
  similarity_boost: 0.75, // how closely to match the original voice
  style:            0.0,  // style exaggeration (keep low for natural speech)
  use_speaker_boost: true,
};

/**
 * Convert text to speech and play it in the browser.
 * @param {string} text      - the text to speak
 * @param {"rival"|"facilitator"|"filler"} role - which voice to use
 * @returns {Promise<void>}  - resolves when audio finishes playing
 */
export async function speak(text, role = "rival") {
  const voiceId = VOICE_IDS[role];

  if (!voiceId || voiceId.startsWith("YOUR_")) {
    // ── ElevenLabs not configured yet ─────────────────────────────────────────
    // This fallback uses the browser's built-in speech synthesis so the demo
    // still works without an ElevenLabs key. Remove this block once you add keys.
    return speakFallback(text);
  }

  const res = await fetch(
    `/api/elevenlabs/v1/text-to-speech/${voiceId}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: VOICE_SETTINGS,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs error ${res.status}: ${err}`);
  }

  const blob = await res.blob();
  return playBlob(blob);
}

/**
 * Play the short filler sound ("Hmm…") while Facilitator generates its response.
 * This hides the LLM latency from the user.
 */
export async function speakFiller() {
  return speak("Hmm…", "filler");
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function playBlob(blob) {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_audioCtx.state === "suspended") {
    await _audioCtx.resume();
  }

  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await _audioCtx.decodeAudioData(arrayBuffer);

  return new Promise((resolve) => {
    const source = _audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(_audioCtx.destination);

    _currentSource = source;
    _currentResolve = () => { _currentSource = null; _currentResolve = null; resolve(); };

    source.onended = () => {
      _currentSource = null;
      _currentResolve = null;
      resolve();
    };

    source.start(0);
  });
}

/** Browser built-in TTS fallback — used when ElevenLabs is not yet configured. */
function speakFallback(text) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate  = 0.95;
    utt.pitch = 1.0;
    utt.onend = () => { _currentResolve = null; resolve(); };
    // Store resolve so stopCurrentSpeech() can cancel this too
    _currentResolve = () => { window.speechSynthesis.cancel(); _currentResolve = null; resolve(); };
    window.speechSynthesis.speak(utt);
  });
}
