'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import OmAvatar from '@/components/OmAvatar';
import LangTabs from '@/components/LangTabs';
import {
  Lang,
  getShloka,
  langMeta,
  splitLines,
  speakTextFor,
} from '@/lib/shlokas';
import { speakLines, stopSpeaking, isSpeaking } from '@/lib/tts';
import { translateOnline, isOnline } from '@/lib/translator';

export default function Player({ id }: { id: string }) {
  const router = useRouter();
  const shloka = getShloka(id);

  const [lang, setLang] = useState<Lang>('sa');
  const [playing, setPlaying] = useState(false);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [translated, setTranslated] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [customResult, setCustomResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);
  const genRef = useRef(0);

  const displayLines = useMemo(() => {
    if (!shloka) return [];
    if (lang === 'sa') return splitLines(shloka.text.sa);
    return splitLines(shloka.text[lang]);
  }, [shloka, lang]);

  useEffect(() => {
    if (!shloka) return;
    setTranslated(null);
    setActiveLine(null);
    stopSpeaking();
    setPlaying(false);
  }, [shloka]);

  useEffect(() => {
    return () => {
      genRef.current += 1;
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    isOnline().then((ok) => alive && setOnline(ok));
    return () => {
      alive = false;
    };
  }, []);

  if (!shloka) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 text-center">
        <p className="text-white/60">Shloka not found.</p>
        <button onClick={() => router.push('/')} className="mt-4 rounded-full border border-gita-gold/50 px-5 py-2 text-sm text-gita-gold">
          ← Back to library
        </button>
      </main>
    );
  }

  const play = () => {
    if (isSpeaking()) {
      stopSpeaking();
      setPlaying(false);
      setActiveLine(null);
      return;
    }
    const gen = ++genRef.current;
    const lines = lang === 'sa' ? splitLines(shloka.text.sa) : splitLines(speakTextFor(shloka, lang));
    setPlaying(true);
    speakLines(lines, {
      lang,
      onStart: (i) => setActiveLine(i),
      onDone: () => {
        if (gen === genRef.current) {
          setPlaying(false);
          setActiveLine(null);
        }
      },
    });
  };

  const changeLang = (next: Lang) => {
    stopSpeaking();
    genRef.current += 1;
    setPlaying(false);
    setActiveLine(null);
    setLang(next);
  };

  const runCustomTranslation = async () => {
    const text = customText.trim();
    if (!text || busy) return;
    setBusy(true);
    setCustomResult(null);
    const target: Lang = lang === 'sa' ? 'en' : lang;
    const result = await translateOnline(text, target);
    setBusy(false);
    if (result) {
      setCustomResult(`${text}\n\n${result.text}\n\n[via ${result.engine}]`);
    } else {
      setCustomResult('Translation failed — no internet connection available.');
    }
  };

  const meta = langMeta(lang);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-8 sm:px-6">
      <nav className="flex items-center justify-between">
        <button
          onClick={() => router.push('/')}
          className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 backdrop-blur transition-colors hover:border-gita-gold/50 hover:text-gita-gold"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-hover:-translate-x-0.5">
            <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Library
        </button>
        <LangTabs value={lang} onChange={changeLang} />
      </nav>

      <section className="mt-8 flex flex-col items-center">
        <OmAvatar
          talking={playing}
          size={170}
          label={playing ? 'श्रवण कर रहा हूँ…' : `${shloka.source}`}
        />

        <h1 className="mt-6 text-center font-display text-lg text-gita-gold/90">{shloka.source}</h1>
        <p className="mt-1 text-center text-xs text-white/40">{shloka.origin}</p>

        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {shloka.tags.map((t) => (
            <span key={t} className="rounded-full border border-white/10 px-3 py-0.5 text-[11px] text-white/50">
              {t}
            </span>
          ))}
        </div>

        <div className="mt-8 w-full max-w-2xl space-y-5">
          {lang === 'sa' ? (
            <>
              <div className="space-y-3 rounded-2xl border border-gita-gold/25 bg-white/5 p-6 text-center backdrop-blur">
                {displayLines.map((line, i) => (
                  <p
                    key={i}
                    className={`dev-script text-2xl leading-loose transition-all duration-300 sm:text-3xl ${
                      activeLine === i
                        ? 'scale-105 text-gita-gold drop-shadow-[0_0_18px_rgba(255,201,107,0.45)]'
                        : activeLine !== null
                          ? 'text-white/35'
                          : 'text-white/95'
                    }`}
                  >
                    {line}
                  </p>
                ))}
              </div>

              <p className="text-center text-sm italic leading-relaxed text-white/45">
                {shloka.text.iast}
              </p>
            </>
          ) : (
            <div
              className={`rounded-2xl border p-6 text-center backdrop-blur transition-all duration-300 ${
                activeLine !== null
                  ? 'border-gita-gold/50 bg-gita-gold/10'
                  : 'border-gita-gold/25 bg-white/5'
              } ${lang === 'ta' ? 'ta-script text-xl leading-relaxed' : 'text-lg leading-relaxed'}`}
            >
              <p className="text-[11px] uppercase tracking-widest text-gita-gold/70">{meta.label} · {meta.native}</p>
              {displayLines.map((line, i) => (
                <p
                  key={i}
                  className={`mt-3 transition-opacity duration-300 ${
                    activeLine === i ? 'text-white' : activeLine !== null ? 'text-white/35' : 'text-white/90'
                  }`}
                >
                  {line}
                </p>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={play}
              className={`flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold transition-all ${
                playing
                  ? 'bg-white/10 text-white/80 border border-white/20'
                  : 'bg-gradient-to-r from-gita-saffron to-gita-gold text-night shadow-lg shadow-gita-saffron/25 hover:scale-[1.03]'
              }`}
            >
              {playing ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="4" height="12" rx="1" /><rect x="14" y="6" width="4" height="12" rx="1" /></svg>
                  Stop
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                  {activeLine !== null ? 'Play' : 'Listen'}
                </>
              )}
            </button>
            {lang === 'sa' && shloka.speak?.en && (
              <p className="text-xs text-white/40">Sanskrit audio uses your device&apos;s {langMeta('hi').label} voice.</p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h2 className="text-sm font-medium uppercase tracking-widest text-gita-gold/80">
          Live Translation <span className="ml-2 normal-case text-white/40">(online fallback)</span>
        </h2>
        <p className="mt-1 text-xs text-white/45">
          Offline: instant lookup from the bundled corpus. If a network is available, paste any Sanskrit text and GeetaDiwa will translate it in real time.
        </p>

        <textarea
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          rows={3}
          placeholder="Type or paste a Sanskrit shloka… (कर्मण्येवाधिकारस्ते मा फलेषु कदाचन)"
          className="dev-script mt-4 w-full rounded-xl border border-white/10 bg-night p-4 text-base text-white placeholder-white/30 outline-none transition-colors focus:border-gita-gold/60"
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            onClick={runCustomTranslation}
            disabled={busy || !customText.trim()}
            className="rounded-full bg-gradient-to-r from-gita-saffron to-gita-gold px-6 py-2.5 text-sm font-semibold text-night shadow-lg shadow-gita-saffron/20 transition-all hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            {busy ? 'Translating…' : `Translate to ${langMeta(lang === 'sa' ? 'en' : lang).label}`}
          </button>
          <span className="text-[11px] text-white/40">
            {online === null ? 'Checking…' : online ? '● Online' : '○ Offline mode'}
          </span>
        </div>

        {customResult && (
          <div className="mt-4 whitespace-pre-wrap rounded-xl border border-gita-gold/25 bg-night/60 p-4 text-sm leading-relaxed text-white/85">
            {customResult}
          </div>
        )}
      </section>

      <footer className="mt-10 text-center text-[11px] text-white/35">
        <a href={shloka.url} target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-gita-gold/70">
          {shloka.origin}
        </a>
        {' · GeetaDiwa — offline-first, works without internet'}
      </footer>
    </main>
  );
}
