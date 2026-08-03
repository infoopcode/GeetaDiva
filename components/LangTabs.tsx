'use client';

import { Lang, LANGS, langMeta } from '@/lib/shlokas';

interface LangTabsProps {
  value: Lang;
  onChange: (lang: Lang) => void;
  allowSanskrit?: boolean;
}

export default function LangTabs({ value, onChange, allowSanskrit = true }: LangTabsProps) {
  const langs: Lang[] = allowSanskrit ? LANGS : (['en', 'hi', 'ta'] as Lang[]);

  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur">
      {langs.map((lang) => {
        const meta = langMeta(lang);
        const active = value === lang;
        return (
          <button
            key={lang}
            onClick={() => onChange(lang)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              active
                ? 'bg-gradient-to-r from-gita-saffron to-gita-gold text-night shadow'
                : 'text-white/70 hover:text-white'
            }`}
            title={meta.label}
          >
            {meta.native}
          </button>
        );
      })}
    </div>
  );
}
