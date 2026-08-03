import { Lang, LANG_META } from './shlokas';

const GOOGLE_URL = 'https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=%s&tl=%s&q=%s';
const MYMEMORY_URL =
  'https://api.mymemory.translated.net/get?q=%s&langpair=%s|%s';

// Sanskrit is passed as the source language for both code paths.
function srcCode(lang: Lang): string {
  if (lang === 'sa') return 'sa';
  return LANG_META[lang].tts.split('-')[0];
}

export interface OnlineResult {
  text: string;
  engine: 'google' | 'mymemory';
}

async function googleTranslate(text: string, from: string, to: string): Promise<OnlineResult> {
  const url = GOOGLE_URL.replace('%s', from)
    .replace('%s', to)
    .replace('%s', encodeURIComponent(text));
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`google ${res.status}`);
  const data = (await res.json()) as Array<Array<Array<string> | unknown>>;
  const joined = (data[0] as Array<Array<string>>)
    .map((part) => part[0] ?? '')
    .join('')
    .trim();
  if (!joined) throw new Error('empty google result');
  return { text: joined, engine: 'google' };
}

async function myMemoryTranslate(text: string, from: string, to: string): Promise<OnlineResult> {
  const url = MYMEMORY_URL.replace('%s', encodeURIComponent(text))
    .replace('%s', from)
    .replace('%s', to);
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`mymemory ${res.status}`);
  const data = (await res.json()) as {
    responseData?: { translatedText?: string };
    responseStatus?: string | number;
  };
  const out = data.responseData?.translatedText?.trim();
  if (!out || String(data.responseStatus) !== '200') throw new Error('empty mymemory result');
  return { text: out, engine: 'mymemory' };
}

/**
 * Online fallback translation (Sanskrit -> target language).
 * Returns null if the network is unavailable or every engine fails.
 */
export async function translateOnline(text: string, target: Lang): Promise<OnlineResult | null> {
  const to = srcCode(target);
  const attempts: Array<(t: string, f: string, t2: string) => Promise<OnlineResult>> = [
    googleTranslate,
    myMemoryTranslate,
  ];
  for (const attempt of attempts) {
    try {
      const result = await attempt(text, 'sa', to);
      return result;
    } catch {
      // try next engine
    }
  }
  return null;
}

export async function isOnline(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  if (navigator.onLine === false) return false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch('https://www.google.com/generate_204', { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}
