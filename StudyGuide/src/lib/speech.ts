/**
 * Pronunciation playback via the Web Speech API.
 *
 * There are no audio assets: the browser (backed by the OS) supplies the
 * voices. Availability and quality vary by platform — Safari and Chrome are
 * reliable, Firefox on Linux often ships no voices at all — so every call
 * reports whether playback could start and the UI degrades gracefully.
 */

export type SpeakOptions = { lang?: string; rate?: number };

const DEFAULT_LANG = "en-GB";
const DEFAULT_RATE = 0.95;

let voiceCache: SpeechSynthesisVoice[] = [];
let currentAudio: HTMLAudioElement | null = null;

const normalize = (lang: string) => lang.replace("_", "-").toLowerCase();

function refreshVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  const voices = window.speechSynthesis.getVoices();
  // `getVoices()` returns [] until the engine has loaded; keep the last good set.
  if (voices.length) voiceCache = voices;
  return voiceCache;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  refreshVoices();
  // Voices load asynchronously on most browsers; re-read when they arrive.
  window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
}

export function speechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

/** Best available voice: exact tag, then same base language, local preferred. */
function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = refreshVoices();
  if (voices.length === 0) return null;
  const want = normalize(lang);
  const base = want.split("-")[0];
  return (
    voices.find((v) => normalize(v.lang) === want && v.localService) ??
    voices.find((v) => normalize(v.lang) === want) ??
    voices.find((v) => normalize(v.lang).startsWith(base) && v.localService) ??
    voices.find((v) => normalize(v.lang).startsWith(base)) ??
    null
  );
}

/**
 * Speak `text`. Cancels anything already speaking (so rapid clicks restart
 * cleanly). Returns false when speech is unavailable. `onEnd` fires on both
 * completion and error.
 */
export function speak(
  text: string,
  { lang = DEFAULT_LANG, rate = DEFAULT_RATE }: SpeakOptions = {},
  onEnd?: () => void,
): boolean {
  if (!speechSupported() || !text.trim()) return false;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.pitch = 1;
  utterance.volume = 1;
  const voice = pickVoice(lang);
  if (voice) utterance.voice = voice;
  if (onEnd) {
    utterance.onend = () => onEnd();
    utterance.onerror = () => onEnd();
  }

  synth.speak(utterance);
  return true;
}

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (speechSupported()) window.speechSynthesis.cancel();
}

/**
 * Play a recorded audio file (used when a `{{say:…}}` token carries an explicit
 * URL). Reports success synchronously; `onError` lets the caller fall back to
 * speech synthesis if the file is missing or blocked.
 */
export function playAudioFile(
  url: string,
  handlers: { onEnd?: () => void; onError?: () => void } = {},
): boolean {
  if (typeof window === "undefined" || !url) return false;
  stopSpeaking();
  const audio = new Audio(url);
  currentAudio = audio;
  const finish = () => {
    if (currentAudio === audio) currentAudio = null;
  };
  audio.addEventListener(
    "ended",
    () => {
      finish();
      handlers.onEnd?.();
    },
    { once: true },
  );
  audio.addEventListener(
    "error",
    () => {
      finish();
      handlers.onError?.();
    },
    { once: true },
  );
  void audio.play().catch(() => {
    finish();
    handlers.onError?.();
  });
  return true;
}
