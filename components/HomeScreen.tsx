'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ShlokaCard from '@/components/ShlokaCard';
import OmAvatar from '@/components/OmAvatar';
import { getAllTags, searchShlokas } from '@/lib/shlokas';

export default function HomeScreen() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [debouncedQ, setDebouncedQ] = useState('');
  const tags = getAllTags();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  const results = searchShlokas({ q: debouncedQ, tag });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-10 sm:px-6">
      <section className="flex flex-col items-center gap-6 text-center">
        <OmAvatar talking={false} size={150} label="गीता दीवा" />
        <div className="animate-fade-up">
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">
            Geeta<span className="text-gita-gold">Diwa</span>
          </h1>
          <p className="mt-2 text-sm text-white/60 sm:text-base">
            Sanskrit Shloka AI Avatar — real-time translation with synchronized speech.
            <span className="block text-gita-gold/70">English · हिन्दी · தமிழ்</span>
          </p>
        </div>

        <div className="w-full max-w-xl animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" strokeLinecap="round" />
              </svg>
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search shlokas… (कर्म, अहिंसा, truth, धर्म)"
              className="w-full rounded-full border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-sm text-white placeholder-white/35 outline-none backdrop-blur transition-colors focus:border-gita-gold/60"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setTag(null)}
              className={`rounded-full border px-3 py-1 text-xs transition-all ${
                tag === null
                  ? 'border-gita-gold/70 bg-gita-gold/15 text-gita-gold'
                  : 'border-white/10 text-white/50 hover:border-white/30'
              }`}
            >
              All
            </button>
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setTag(tag === t ? null : t)}
                className={`rounded-full border px-3 py-1 text-xs transition-all ${
                  tag === t
                    ? 'border-gita-gold/70 bg-gita-gold/15 text-gita-gold'
                    : 'border-white/10 text-white/50 hover:border-white/30'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/40">
          {results.length} shloka{results.length === 1 ? '' : 's'}
        </p>
        {results.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/50">
            No shlokas matched. Try a different keyword.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {results.map((s) => (
              <ShlokaCard key={s.id} shloka={s} onOpen={(id) => router.push(`/shloka/${id}`)} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
