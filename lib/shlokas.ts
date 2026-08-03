import raw from '@/data/shlokas.json';

export type Lang = 'sa' | 'en' | 'hi' | 'ta';

export interface Shloka {
  id: string;
  source: string;
  origin: string;
  url: string;
  tags: string[];
  text: Record<Lang, string> & { iast: string };
  speak?: Partial<Record<Lang, string>>;
}

export const shlokas = raw as Shloka[];

export const LANGS: Lang[] = ['sa', 'en', 'hi', 'ta'];

export const LANG_META: Record<Lang, { label: string; native: string; tts: string }> = {
  sa: { label: 'Sanskrit', native: 'संस्कृतम्', tts: 'hi-IN' },
  en: { label: 'English', native: 'English', tts: 'en-IN' },
  hi: { label: 'Hindi', native: 'हिन्दी', tts: 'hi-IN' },
  ta: { label: 'Tamil', native: 'தமிழ்', tts: 'ta-IN' },
};

export function langMeta(lang: Lang) {
  return LANG_META[lang];
}

export function getShloka(id: string): Shloka | undefined {
  return shlokas.find((s) => s.id === id);
}

export function getAllTags(): string[] {
  const set = new Set<string>();
  for (const s of shlokas) for (const t of s.tags) set.add(t);
  return Array.from(set);
}

export interface SearchQuery {
  q?: string;
  tag?: string | null;
  lang?: Lang;
}

export function searchShlokas({ q, tag }: SearchQuery): Shloka[] {
  const needle = (q ?? '').trim().toLowerCase();
  return shlokas.filter((s) => {
    if (tag && !s.tags.includes(tag)) return false;
    if (!needle) return true;
    const haystack = [
      s.id,
      s.source,
      s.text.sa,
      s.text.iast,
      s.text.en,
      s.text.hi,
      s.text.ta,
      ...s.tags,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function speakTextFor(s: Shloka, lang: Lang): string {
  if (s.speak?.[lang]?.trim()) return s.speak[lang] as string;
  return s.text[lang];
}

export function splitLines(text: string): string[] {
  const cleaned = text.replace(/॥/g, '।').replace(/\s*।\s*/g, '\n').trim();
  return cleaned
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}
