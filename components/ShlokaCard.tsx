'use client';

import { Shloka } from '@/lib/shlokas';

interface ShlokaCardProps {
  shloka: Shloka;
  onOpen: (id: string) => void;
}

export default function ShlokaCard({ shloka, onOpen }: ShlokaCardProps) {
  return (
    <button
      onClick={() => onOpen(shloka.id)}
      className="group flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur transition-all hover:-translate-y-0.5 hover:border-gita-gold/50 hover:bg-white/10 hover:shadow-[0_8px_40px_-12px_rgba(255,157,60,0.35)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-widest text-gita-gold/80">
          {shloka.source}
        </span>
        <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] text-white/50 group-hover:border-gita-gold/40 group-hover:text-gita-gold/80">
          {shloka.tags.join(' · ')}
        </span>
      </div>

      <p className="dev-script text-xl leading-relaxed text-white/95">
        {shloka.text.sa.split('।')[0]}॥
      </p>
      <p className="text-sm italic text-white/45">{shloka.text.iast.split('|')[0]}</p>
    </button>
  );
}
