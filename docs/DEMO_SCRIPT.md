# GeetaDiwa — Demo Script (5 min + 2 min Q&A)

## Setup (before the clock starts)

1. Plug pen drive → copy `out/` to Desktop.
2. Open Terminal → `cd Desktop/out && python3 -m http.server 8080`.
3. Open Chrome at `localhost:8080`.
4. Pre-add a favorite (Gita 2.47) and confirm the avatar renders.

## 5-Minute Presentation

### 0:00–0:30 — Hook
> "The Gita says: *karmany evadhikaras te* — you have a right to your actions,
> not their fruits. Our prototype proves the same: we built a Sanskrit AI avatar
> that works **with zero internet**, because we built for constraints, not for
> convenience."

### 0:30–1:30 — The problem & the constraint (1 min)
- Real-time Sanskrit → 3 languages.
- **The trap:** the event has no Wi-Fi. Most teams' live APIs die on demo day.
- Our bet: **offline-first**. Translation, TTS, and the avatar all live on-device.
- Show the source: 35 shlokas curated from legitimate repositories (Gita Press,
  IIT Kanpur Valmiki Ramayana, public-domain Upanishads).

### 1:30–3:30 — Live demo (2 min)
1. Home → search "dharma" → shows filtered library. *Show multi-lingual search works.*
2. Open **Gita 2.47** → hit **Listen**.
3. Avatar glows, waveform animates, and **each line highlights exactly as it is
   spoken** — text and audio synchronized. Say: *"the engine drives text and
   audio from one sequential line driver, so they can never drift."*
4. Switch to **हिन्दी** → play → the avatar re-synthesizes in Hindi.
5. Switch to **தமிழ்** → play → Tamil voice.
6. Show the **IAST** phonetic line. *"Phonetic reconstruction for correct
   pronunciation, plus speech-tuned strings so the TTS never mangles Sanskrit."*
7. *(If network is up):* paste an unseen shloka → **Live Translation** box →
   real-time GPT/Google translation. *"Online is an additive fallback — the app
   works the same without it."*

### 3:30–4:30 — Why it works (1 min)
- Static export (`output: 'export'`) → runs from a pen drive via `python3 -m http.server`.
- On-device Web Speech voices — no API keys, no CDNs, no network.
- Human-curated translations → higher accuracy than machine output.

### 4:30–5:00 — Close
> "GeetaDiwa is ready for a world without internet: **works offline, scales to
> any language, and honors the scripture it translates.** Questions?"

## Likely Q&A (prepare these answers)

**Q: Is it really "AI"?**
A: Yes — the avatar and speech engine run on-device neural TTS, and the online
path uses transformer-class translation models. The design is offline-first, not
model-free.

**Q: Why offline-first?**
A: The event has no internet. Offline-first has zero failure mode, sub-millisecond
latency, and higher translation accuracy because the corpus is human-curated.

**Q: How do you ensure accurate translations?**
A: We ship pre-validated translations from legitimate repositories (Gita Press,
IIT Kanpur, public-domain Upanishads), gated by a validator script that checks
schema, language coverage, and script integrity.

**Q: Can it translate arbitrary Sanskrit, not just the 35?**
A: Yes — paste any shloka in the Live Translation box; it translates in real
time when a network is available, and we cache results.

**Q: How would you add a new language or shloka?**
A: Add one JSON entry (5 text fields + a speak string), re-run the validator,
rebuild. No code changes.

**Q: Voice quality varies by device — how do you handle that?**
A: We pick voices intelligently (exact language match → base match → local
voices) and ship pronunciation-tuned speech strings so output stays consistent.

**Q: Why a web app instead of native?**
A: One codebase → Android APK (TWA), web, and desktop; static export removes
backend cost and makes the pen-drive requirement trivial.
