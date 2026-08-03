'use client';

import { useEffect, useState } from 'react';

interface OmAvatarProps {
  talking: boolean;
  size?: number;
  label?: string;
}

export default function OmAvatar({ talking, size = 240, label }: OmAvatarProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  const rings = talking ? 3 : 1;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div
        className="relative flex items-center justify-center animate-bob"
        style={{ width: size, height: size }}
      >
        {Array.from({ length: rings }).map((_, i) => (
          <span
            key={i}
            className={`om-ring absolute inset-0 rounded-full border border-gita-saffron/40 ${
              talking ? '' : 'opacity-0'
            }`}
            style={{ animationDelay: `${i * 0.45}s` }}
          />
        ))}

        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-br from-gita-gold/10 via-transparent to-lotus/10 animate-soft-spin`}
        >
          <span className="absolute inset-0 m-auto h-3 w-3 rounded-full bg-gita-saffron/30 blur-sm" />
        </div>

        <div
          className={`relative flex items-center justify-center rounded-full bg-gradient-to-br from-night-700 via-night-800 to-night border border-gita-gold/30 transition-shadow duration-700 ${
            talking ? 'animate-glow' : ''
          }`}
          style={{ width: size * 0.72, height: size * 0.72 }}
        >
          <span
            className={`dev-script text-gita-gold font-semibold transition-all duration-300 ${
              talking ? 'scale-105' : ''
            }`}
            style={{ fontSize: size * 0.34, lineHeight: 1 }}
          >
            ॐ
          </span>

          {talking && (
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-1 h-6">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="wave-bar w-1 rounded-full bg-gita-gold/90"
                  style={{ height: '100%', animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {label && (
        <span
          className={`text-sm tracking-wide text-gita-gold/90 font-medium transition-opacity duration-500 ${
            ready ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}
