# Scriptural Sources & Attribution

All shlokas in `data/shlokas.json` are drawn from legitimate, publicly
accessible scriptural repositories. Each entry carries an `origin` (repository)
and `url` for full attribution; the player displays this on every shloka.

| Repository | Type | Used for |
| --- | --- | --- |
| **Gita Press Gorakhpur** — shrigitapress.org | Authorized print publisher of the Bhagavad Gita, Ramayana, Hanuman Chalisa & Puranas | 23 Gita shlokas, Hanuman Chalisa, Ramayana verses |
| **Valmiki Ramayana (IIT Kanpur)** — valmiki.iitk.ac.in | Scholarly digitization of the critical edition | Ma Nishada verse (1.2.14) |
| **Sacred Texts** — sacred-texts.com | Public-domain archive of Vedic & classical literature | Rigveda (Gayatri), Upanishads (Shanti, Mundaka, Maha), Manusmriti, Guru Gita, Subhashitas |
| **Vedic Heritage (Aurobindo Ashram)** — vedicheritage.gov.in | Government of India Vedic preservation portal | Vedic mantra cross-reference |

## Verse attributions (summary)

- **Bhagavad Gita** 2.47, 2.48, 2.62, 2.63, 2.70, 2.71, 3.35, 4.7, 4.8, 4.24,
  4.34, 4.37, 4.39, 5.18, 6.5, 9.22, 10.20, 11.12, 12.13, 15.1, 17.15, 18.66,
  18.78 → Gita Press Gorakhpur.
- **Gayatri Mantra** (Rigveda 3.62.10) and **Shanti Mantra** (Taittiriya
  Upanishad) → Vedic heritage / Sacred Texts.
- **Vasudhaiva Kutumbakam** (Maha Upanishad VI.71–72), **Satyam eva jayate**
  (Mundaka 3.1.6) → Sacred Texts (public domain).
- **Dharmo rakshati** (Manusmriti 8.9), **Guru Brahma** (Guru Gita / Skanda
  Purana), **Ahimsa paramo dharmah** (Purana/Mahabharata common verse),
  **Udyamena sidhyanti** & **Matrvat paradareshu** (Subhashita/Panchatantra/
  Hitopadesha) → public domain.
- **Hanuman Chalisa opening** (Tulsidas) → Gita Press Gorakhpur.

## Provenance note

- Public-domain classical works are reproduced without modification of the
  original Sanskrit text.
- English/Hindi/Tamil renderings were cross-checked against the cited editions;
  the corpus validator (`tools/build_corpus.py`) enforces that every entry
  carries a source attribution before it can ship.
