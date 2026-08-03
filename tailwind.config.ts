import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        night: {
          DEFAULT: '#0b0a1f',
          800: '#151336',
          700: '#1d1a45',
        },
        gita: {
          gold: '#f3c96b',
          saffron: '#ff9d3c',
          lotus: '#e9d8ff',
        },
      },
      fontFamily: {
        devanagari: [
          'Kohinoor Devanagari',
          'Noto Serif Devanagari',
          'Sanskrit Text',
          'Nirmala UI',
          'serif',
        ],
        tamil: ['Noto Sans Tamil', 'Lohit Tamil', 'Arial', 'sans-serif'],
        display: ['Georgia', 'Palatino', '"Noto Serif Devanagari"', 'serif'],
      },
      keyframes: {
        'bob': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.8' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'soft-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'fade-up': {
          '0%': { transform: 'translateY(14px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'glow': {
          '0%, 100%': { boxShadow: '0 0 24px rgba(255, 157, 60, 0.35)' },
          '50%': { boxShadow: '0 0 48px rgba(255, 157, 60, 0.65)' },
        },
      },
      animation: {
        bob: 'bob 4s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2.2s ease-out infinite',
        'soft-spin': 'soft-spin 24s linear infinite',
        'fade-up': 'fade-up 0.5s ease-out both',
        glow: 'glow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
