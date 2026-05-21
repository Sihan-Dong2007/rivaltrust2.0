// elevenlabs.js — TTS playback and interruption

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY ?? "";

// using Web Audio API instead of HTMLAudioElement — Safari blocks blob URLs from async contexts
let _audioCtx = null;
let _currentSource = null;
let _currentResolve = null;

// must be called before any await in a click handler — Safari only allows AudioContext in gesture context
export function unlockAudio() {
  if (_audioCtx) return;
  _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  _audioCtx.resume().catch(() => {});
}

// called when user starts speaking — cuts audio and resolves the pending promise
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

export const VOICE_IDS = {
  rival:       "EST9Ui6982FZPSi7gCHi",       // e.g. "21m00Tcm4TlvDq8ikWAM" (Rachel)
  facilitator: "Q1QcmfZPmFDVUWmzASdy", // e.g. "AZnzlk1XvdvUeBnXmlld" (Domi)
  filler:      "Q1QcmfZPmFDVUWmzASdy", // same as facilitator for "Hmm…" filler
};

const MODEL_ID = "eleven_turbo_v2"; // ~300ms latency, English only

const VOICE_SETTINGS = {
  stability:        0.5,
  similarity_boost: 0.75,
  style:            0.0,
  use_speaker_boost: true,
};

export async function speak(text, role = "rival") {
  const voiceId = VOICE_IDS[role];

  if (!voiceId || voiceId.startsWith("YOUR_")) {
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

// "Hmm…" filler played while Facilitator LLM is generating — hides the wait
export async function speakFiller() {
  return speak("Hmm…", "filler");
}


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

// browser TTS fallback for when ElevenLabs isn't configured
function speakFallback(text) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate  = 0.95;
    utt.pitch = 1.0;
    utt.onend = () => { _currentResolve = null; resolve(); };
    _currentResolve = () => { window.speechSynthesis.cancel(); _currentResolve = null; resolve(); };
    window.speechSynthesis.speak(utt);
  });
}
