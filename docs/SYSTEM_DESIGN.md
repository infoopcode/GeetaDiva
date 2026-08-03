# GeetaDiwa — System Design Document

**Version:** 1.0 · **Type:** Hackathon submission (offline-first web app)

## 1. Problem Statement

Build a digital AI avatar that translates Sanskrit Shlokas into multiple target
languages in real time, synthesizes high-fidelity speech, and displays text
simultaneously with synchronized audio. Hard constraints:

- No Wi-Fi / internet at the event.
- On-site compilation locked to 120 minutes.
- Mandatory targets: English, Hindi + one regional Indian language (Tamil).
- Legitimate scriptural sources only.

## 2. Design Principles

1. **Offline-first** — the primary path must never need the network.
2. **Single codebase, static deploy** — `output: 'export'` produces pure
   HTML/JS/CSS; no Node server, no runtime backend.
3. **Synchronized by construction** — audio and text highlight share one
   sequential line driver, so they cannot drift.
4. **Graceful degradation** — online translation is an additive fallback, never
   a dependency.

## 3. Architecture

```
                    ┌──────────────────────────┐
   Browser          │   GeetaDiwa (Next.js)     │
                    │                           │
  ┌────────────┐    │  Home ──▶ Player          │   data/shlokas.json
  │  UI layer  │◀──▶│  Search / tags / lang tabs │◀──────────────┐  (offline corpus)
  └─────┬──────┘    │                           │               │ 35 shlokas × 5 fields
        │           └──────┬────────────────────┘               │ (sa, iast, en, hi, ta)
        │                  │                                    │
        ▼                  ▼                                    │
  ┌────────────┐    ┌───────────────┐     ┌─────────────────┐   │
  │  Avatar    │    │  tts.ts       │     │ translator.ts   │   │
  │ (OmAvatar) │    │ Web Speech    │     │ offline → online │  │
  │ talking state│   │ speechSynthesis│    │ Google / MyMemory│  │
  └────────────┘    └──────┬────────┘     └───────┬─────────┘   │
                           │                      │             │
                           ▼                      ▼             │
                    on-device voices         network (optional) │
                    (no network)             ───────────────────┘
```

### Component responsibilities

| Module | Responsibility |
| --- | --- |
| `lib/shlokas.ts` | Typed data model, search (`searchShlokas`), IAST metadata, `splitLines` tokenizer for line-level sync |
| `lib/tts.ts` | Wraps `speechSynthesis`; loads voices, picks best per language (prefers local/offline voices), speaks text line-by-line, fires `onStart(lineIdx)` for UI highlight |
| `lib/translator.ts` | Offline lookup first; if a shloka is out of corpus **and** network is up, tries Google Translate free endpoint then MyMemory API |
| `components/Player.tsx` | Orchestrates playback state machine, line highlighting, language switching (stops TTS on change) |
| `components/OmAvatar.tsx` | Animated avatar; `talking` prop toggles glow + waveform lip-sync bars |
| `app/shloka/[id]/page.tsx` | Static page generation via `generateStaticParams` (35 pre-rendered routes) |

## 4. Data Model

```jsonc
{
  "id": "gita-2-47",                     // stable slug → static route
  "source": "Bhagavad Gita 2.47",        // canonical reference
  "origin": "Gita Press Gorakhpur",      // legitimate repository
  "url": "https://shrigitapress.org/",   // attribution link
  "tags": ["Gita", "Karma", "Duty"],     // searchable facets
  "text": {
    "sa":   "कर्मण्येवाधिकारस्ते …",       // Devanagari original
    "iast": "karmaṇy evādhikāras te …",   // phonetic reconstruction
    "en":   "You have a right to …",      // English
    "hi":   "कर्म करने का ही तुम्हें …",   // Hindi
    "ta":   "செயல்களைச் செய்வதில் …"      // Tamil
  },
  "speak": { "en": "karmany evadhikaraste …" }  // pronunciation-safe speech strings
}
```

The corpus is validated by `tools/build_corpus.py` (schema, script detection,
duplicate ids, language coverage). All translations are human-curated to maximize
the *translation accuracy* rating criterion.

## 5. Speech Synthesis Design

- **Engine:** browser `speechSynthesis` (Web Speech API). On macOS/Windows this
  uses local system voices; on Android Chrome it uses Google's on-device voices.
  All are fully offline after voices are installed.
- **Voice selection (`pickVoice`):** match exact `lang` tag (`en-IN`, `hi-IN`,
  `ta-IN`), then language base; prefer `localService` voices so offline playback
  is guaranteed; Sanskrit is spoken through the Hindi voice on Devanagari text.
- **"Phonetic reconstruction":** every shloka ships an IAST string for display
  and a `speak.en` approximation tuned for TTS pronunciation.
- **Synchronization:** shlokas are split into verse lines (`splitLines`).
  `speakLines` queues lines sequentially; each line's `onStart` sets
  `activeLine`, so the visible text and the audible voice advance together.
- **State machine:** play → speak lines; stop → `speechSynthesis.cancel()`;
  language change → cancel + reset highlight.

## 6. Translation Paths

| Path | Latency | Network | Accuracy |
| --- | --- | --- | --- |
| Offline corpus lookup (primary) | ~0 ms | No | Human-curated — highest |
| Google Translate endpoint (fallback) | ~300–800 ms | Yes | Machine — decent for unseen text |
| MyMemory API (secondary fallback) | ~400–900 ms | Yes | Machine — acceptable |

Online calls are made client-side with a 3.5 s timeout and an offline probe
(`isOnline`) so the UI never hangs on a dead network.

## 7. Offline Deployment & the 120-Minute Compile Lock

- `next.config.mjs` sets `output: 'export'` → the build emits a fully static
  `out/` directory (≈1.6 MB) with pre-rendered HTML for every shloka.
- **Before the event:** `npm install` (caches `node_modules`) and `npm run build`
  (produces `out/`). Copy `out/` + the source repo to the pen drive.
- **On-site:** serve `out/` with `python3 -m http.server` — no internet needed.
  If recompilation is forced, the locked 120 minutes easily covers
  `npm install && npm run build` from the cached packages.
- **No external fonts or CDNs** — all glyphs use system fonts, so offline
  rendering is identical everywhere.

## 8. Security & Compliance

- No API keys shipped; online fallback uses keyless public endpoints.
- No secrets, no credentials, no telemetry, no storage of user text.
- Corpus restricted to legitimate repositories (Gita Press, IIT Kanpur Valmiki
  Ramayana, public-domain Upanishads/Manusmriti/Subhashitas) — see
  `corpus_sources/`.
- Online fallback only sends text the user explicitly pastes; bundled corpus
  never leaves the device.

## 9. Scoring Criteria Mapping

| Criterion | Implementation |
| --- | --- |
| Translation accuracy | Human-curated EN/HI/TA corpus + IAST; validator gates quality |
| UI design | Dark devotional theme, animated avatar, smooth sync highlighting |
| Voice quality | On-device neural voices, pronunciation-safe speech strings |
| Multi-language support | 4 language surfaces (SA/EN/HI/TA) in one codebase |
| Conceptual innovation | Offline-first AI avatar; live translation fallback; synchronized line driver |
