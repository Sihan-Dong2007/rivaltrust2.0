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

const ELEVENLABS_API_KEY = "";

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
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
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

function playBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
    audio.onerror = reject;
    audio.play();
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
    utt.onend = resolve;
    window.speechSynthesis.speak(utt);
  });
}
