import { Lang, langMeta } from './shlokas';

export interface SpeakOptions {
  lang: Lang;
  onStart?: (lineIndex: number) => void;
  onEnd?: (lineIndex: number) => void;
  onDone?: () => void;
  rate?: number;
  pitch?: number;
}

let voices: SpeechSynthesisVoice[] = [];
let speaking = false;
let cancelled = false;

function isTTS(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function loadVoices() {
  if (!isTTS()) return;
  voices = window.speechSynthesis.getVoices();
}

if (typeof window !== 'undefined') {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function normalizeLang(code: string): string {
  return code.toLowerCase().split('-')[0];
}

export function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  if (!isTTS() || voices.length === 0) return undefined;
  const target = langMeta(lang).tts;
  const targetBase = normalizeLang(target);

  const local = voices.filter((v) => v.localService);
  const candidates = local.length > 0 ? local : voices;

  const exact = candidates.find((v) => v.lang.toLowerCase() === target.toLowerCase());
  if (exact) return exact;
  const base = candidates.find((v) => normalizeLang(v.lang) === targetBase);
  if (base) return base;
  return undefined;
}

export function listVoices(): SpeechSynthesisVoice[] {
  return voices;
}

export function isSpeaking(): boolean {
  return speaking;
}

export function stopSpeaking(): void {
  if (!isTTS()) return;
  cancelled = true;
  speaking = false;
  window.speechSynthesis.cancel();
}

/**
 * Speaks each line sequentially, invoking onStart when a line begins
 * so the UI can highlight the currently-audible line (text + audio sync).
 */
export function speakLines(lines: string[], opts: SpeakOptions): Promise<void> {
  if (!isTTS()) return Promise.resolve();

  cancelled = false;
  const synth = window.speechSynthesis;
  synth.cancel();

  return new Promise((resolve) => {
    const run = (index: number) => {
      if (cancelled || index >= lines.length) {
        speaking = false;
        opts.onDone?.();
        resolve();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(lines[index]);
      utterance.lang = langMeta(opts.lang).tts;
      utterance.rate = opts.rate ?? 0.92;
      utterance.pitch = opts.pitch ?? 1.0;
      const voice = pickVoice(opts.lang);
      if (voice) utterance.voice = voice;

      speaking = true;
      opts.onStart?.(index);

      utterance.onend = () => {
        opts.onEnd?.(index);
        run(index + 1);
      };
      utterance.onerror = () => {
        opts.onEnd?.(index);
        run(index + 1);
      };
      synth.speak(utterance);
    };

    // Chrome sometimes needs a tick for voices to be ready.
    setTimeout(() => run(0), 60);
  });
}
