"""
GeetaDiwa — corpus validator.

Validates data/shlokas.json: schema shape, language coverage (sa/en/hi/ta + iast),
source attribution, and prints corpus statistics.

Usage:
    python3 tools/build_corpus.py
"""

import json
import os
import sys
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "data", "shlokas.json")

REQUIRED_KEYS = ["id", "source", "origin", "url", "tags", "text"]
TEXT_LANGS = ["sa", "iast", "en", "hi", "ta"]
LANG_LABEL = {"sa": "Sanskrit", "en": "English", "hi": "Hindi", "ta": "Tamil"}


def script_of(text: str) -> str:
    """Best-effort detection of the dominant Unicode script in a string."""
    counts: dict[str, int] = {}
    for ch in text:
        if ch.strip() == "":
            continue
        name = unicodedata.name(ch, "")
        for marker, script in (
            ("DEVANAGARI", "devanagari"),
            ("TAMIL", "tamil"),
            ("LATIN", "latin"),
            ("GREEK", "greek"),
        ):
            if marker in name:
                counts[script] = counts.get(script, 0) + 1
                break
    if not counts:
        return "unknown"
    return max(counts, key=counts.get)


def main() -> int:
    if not os.path.exists(PATH):
        print(f"[error] corpus not found: {PATH}")
        return 1

    with open(PATH, encoding="utf-8") as fh:
        data = json.load(fh)

    if not isinstance(data, list) or len(data) == 0:
        print("[error] corpus must be a non-empty list")
        return 1

    errors: list[str] = []
    ids: set[str] = set()

    for i, item in enumerate(data):
        label = f"#{i}"
        if not isinstance(item, dict):
            errors.append(f"{label}: not an object")
            continue
        sid = item.get("id", "?")
        label = f"{sid} (#{i})"

        for key in REQUIRED_KEYS:
            if key not in item:
                errors.append(f"{label}: missing '{key}'")

        if item.get("id") in ids:
            errors.append(f"{label}: duplicate id '{item.get('id')}'")
        ids.add(item.get("id", ""))

        if not isinstance(item.get("tags"), list) or len(item.get("tags", [])) == 0:
            errors.append(f"{label}: tags must be a non-empty list")

        text = item.get("text", {})
        for lang in TEXT_LANGS:
            value = text.get(lang, "")
            if not isinstance(value, str) or not value.strip():
                errors.append(f"{label}: text.{lang} is empty")

        # script sanity checks
        if text.get("sa") and script_of(text["sa"]) != "devanagari":
            errors.append(f"{label}: text.sa does not look Devanagari")
        if text.get("ta") and script_of(text["ta"]) != "tamil":
            errors.append(f"{label}: text.ta does not look Tamil")
        if text.get("hi") and script_of(text["hi"]) != "devanagari":
            errors.append(f"{label}: text.hi does not look Devanagari")

        for lang in ("en", "hi", "ta"):
            speak = item.get("speak", {}).get(lang)
            if speak is not None and not speak.strip():
                errors.append(f"{label}: speak.{lang} present but empty")

    if errors:
        print(f"[error] {len(errors)} issue(s) found:\n")
        for e in errors:
            print("  - " + e)
        return 1

    lang_counts = {lang: 0 for lang in LANG_LABEL}
    lang_counts["iast"] = 0
    for item in data:
        for lang in LANG_LABEL:
            if item["text"].get(lang, "").strip():
                lang_counts[lang] += 1
        if item["text"].get("iast", "").strip():
            lang_counts["iast"] += 1

    tag_counts: dict[str, int] = {}
    for item in data:
        for tag in item["tags"]:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1

    print(f"[ok] corpus valid — {len(data)} shlokas")
    for lang in LANG_LABEL:
        print(f"     {LANG_LABEL[lang]:<10} {lang_counts[lang]:>3}")
    print(f"     {'IAST':<10} {lang_counts['iast']:>3}")
    print(f"     tags: {', '.join(f'{k} ({v})' for k, v in sorted(tag_counts.items()))}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
