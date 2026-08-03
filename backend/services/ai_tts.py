"""
ai_tts.py
---------
Ultra-smooth, zero-setup multi-tier TTS engine supporting:
- Sanskrit (san)
- English (en)
- Hindi (hi)
- Marathi (mr)

Pipeline:
1. Microsoft Edge Neural Voices (edge-tts) - Studio-quality, natural human speech. (online only)
2. Google Speech (gTTS) - High-fidelity fallback. (online only)
3. Local MMS-TTS VITS models (HuggingFace) - Fully offline neural voices stored INSIDE the project.
4. PyTTSx3 (SAPI5) - Fully offline Windows system speech synthesis.

When the network is unavailable (or tts_config.json sets force_offline=true),
steps 1-2 are skipped so offline speech is used immediately without timeouts.
"""

import os
import io
import json
import asyncio
import platform
import tempfile
import threading
import numpy as np

# Tier 1: edge-tts (Microsoft Neural Voices - Studio Quality)
try:
    import edge_tts
    HAS_EDGE_TTS = True
except ImportError:
    HAS_EDGE_TTS = False

# Tier 2: gTTS (Google Speech)
try:
    from gtts import gTTS
    HAS_GTTS = True
except ImportError:
    HAS_GTTS = False

# Tier 3: pyttsx3 (Offline Windows SAPI5)
try:
    import pyttsx3
    HAS_PYTTSX3 = True
except ImportError:
    HAS_PYTTSX3 = False

# Tier 4: MMS-TTS VITS (HuggingFace Transformers - Local Neural)
try:
    import scipy.io.wavfile
    import torch
    from transformers import VitsModel, VitsTokenizer
    HAS_TRANSFORMERS = True
except ImportError:
    HAS_TRANSFORMERS = False


# ── Local model configuration (in-project, see tts_config.json) ──────────────
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONFIG_PATH = os.path.join(REPO_ROOT, 'tts_config.json')


def _load_tts_config() -> dict:
    try:
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}


_TTS_CONFIG = _load_tts_config()
FORCE_OFFLINE = bool(_TTS_CONFIG.get('force_offline', False))


def _model_dir() -> str:
    """Resolve the MMS-TTS model directory (relative paths are project-local)."""
    raw = _TTS_CONFIG.get('tts_model_dir', 'models')
    if os.path.isabs(raw):
        return raw
    return os.path.join(REPO_ROOT, raw)


# MMS-TTS VITS model folders created by download_models.py.
# Sanskrit has no dedicated model, so it reuses the Hindi one (Devanagari).
VITS_MODEL_FOLDERS = {
    'san': 'mms-tts-hin',
    'en':  'mms-tts-eng',
    'hi':  'mms-tts-hin',
    'mr':  'mms-tts-mar',
}

_vits_models = {}
_vits_lock = threading.Lock()


# Voice mappings for Edge Neural Voices
EDGE_VOICES = {
    'san': 'hi-IN-SwaraNeural',    # Sanskrit Devanagari phonetics
    'hi':  'hi-IN-SwaraNeural',    # Hindi Female Neural
    'mr':  'mr-IN-AarohiNeural',   # Marathi Female Neural
    'en':  'en-US-AvaNeural',      # English Female Neural
}

GTTS_LANGS = {
    'san': 'hi',
    'hi':  'hi',
    'mr':  'mr',
    'en':  'en',
}

_pyttsx3_lock = threading.Lock()


def _is_online() -> bool:
    """Quick network probe so offline devices skip straight to local engines."""
    if FORCE_OFFLINE:
        return False
    try:
        import requests as _requests
        _requests.head("https://www.google.com/generate_204", timeout=3)
        return True
    except Exception:
        return False


# ── Edge-TTS Async Helper ─────────────────────────────────────────────────────
async def _synthesise_edge_async(text: str, voice: str) -> bytes:
    communicate = edge_tts.Communicate(text, voice)
    audio_data = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
    return audio_data

def _synthesise_edge(text: str, lang: str) -> bytes:
    if not HAS_EDGE_TTS:
        raise RuntimeError("edge-tts not installed")
    voice = EDGE_VOICES.get(lang, EDGE_VOICES['en'])
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(
            asyncio.wait_for(_synthesise_edge_async(text, voice), timeout=8)
        )
    finally:
        loop.close()


# ── gTTS Helper ───────────────────────────────────────────────────────────────
def _synthesise_gtts(text: str, lang: str) -> bytes:
    if not HAS_GTTS:
        raise RuntimeError("gTTS not installed")
    gtts_lang = GTTS_LANGS.get(lang, 'en')
    tts = gTTS(text=text, lang=gtts_lang, slow=False)
    buf = io.BytesIO()
    tts.write_to_fp(buf)
    return buf.getvalue()


# ── MMS-TTS VITS Helper (Local, Fully Offline Neural) ────────────────────────
_HF_VITS_IDS = {
    'en': 'facebook/mms-tts-eng',
    'hi': 'facebook/mms-tts-hin',
    'mr': 'facebook/mms-tts-mar',
}

def _vits_model_present(model_path: str) -> bool:
    return os.path.isdir(model_path) and (
        os.path.isfile(os.path.join(model_path, 'pytorch_model.bin')) or
        os.path.isfile(os.path.join(model_path, 'model.safetensors'))
    )

def _ensure_vits_model(lang: str, folder: str, model_path: str) -> None:
    """Download the model from the Hub into the project folder if missing (buildpack servers)."""
    if _vits_model_present(model_path):
        return
    hf_id = _HF_VITS_IDS.get(lang)
    if not hf_id or not _is_online():
        raise FileNotFoundError(
            f"MMS-TTS model missing at '{model_path}' and no internet to fetch it. Run download_models.py first."
        )
    print(f"[TTS] Downloading {hf_id} -> {model_path}")
    os.makedirs(model_path, exist_ok=True)
    tokenizer = VitsTokenizer.from_pretrained(hf_id)
    model = VitsModel.from_pretrained(hf_id)
    tokenizer.save_pretrained(model_path)
    model.save_pretrained(model_path)

def _synthesise_vits(text: str, lang: str) -> bytes:
    if not HAS_TRANSFORMERS:
        raise RuntimeError("transformers/torch not installed")
    folder = VITS_MODEL_FOLDERS.get(lang, VITS_MODEL_FOLDERS['en'])
    model_path = os.path.join(_model_dir(), folder)
    with _vits_lock:
        _ensure_vits_model(lang, folder, model_path)
        if lang not in _vits_models:
            tokenizer = VitsTokenizer.from_pretrained(model_path)
            model = VitsModel.from_pretrained(model_path)
            _vits_models[lang] = (model, tokenizer)
    model, tokenizer = _vits_models[lang]

    inputs = tokenizer(text, return_tensors="pt")
    with torch.no_grad():
        output = model(**inputs).waveform

    waveform = output.squeeze().numpy()
    waveform = (waveform * 32767).clip(-32768, 32767).astype(np.int16)
    buf = io.BytesIO()
    scipy.io.wavfile.write(buf, model.config.sampling_rate, waveform)
    return buf.getvalue()


# ── PyTTSx3 Helper ────────────────────────────────────────────────────────────
def _synthesise_pyttsx3(text: str, lang: str) -> bytes:
    if platform.system() != 'Windows':
        raise RuntimeError("pyttsx3/SAPI5 is only available on Windows (server uses VITS instead)")
    if not HAS_PYTTSX3:
        raise RuntimeError("pyttsx3 not installed")
    with _pyttsx3_lock:
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            tmp_path = tmp.name
        try:
            engine = pyttsx3.init()
            engine.setProperty('rate', 145)
            voices = engine.getProperty('voices')
            for v in voices:
                v_name = (v.name or '').lower()
                if lang in ('hi', 'mr', 'san') and any(k in v_name for k in ['hindi', 'heera', 'kalpana', 'india']):
                    engine.setProperty('voice', v.id)
                    break
                elif lang == 'en' and any(k in v_name for k in ['zira', 'david', 'english']):
                    engine.setProperty('voice', v.id)
                    break
            engine.save_to_file(text, tmp_path)
            engine.runAndWait()
            with open(tmp_path, 'rb') as f:
                return f.read()
        finally:
            if os.path.exists(tmp_path):
                try: os.remove(tmp_path)
                except Exception: pass


# ── Main Public API Class ─────────────────────────────────────────────────────
class LocalTTS:
    """
    Ultra-smooth multi-engine TTS supporting Sanskrit (san), English (en), Hindi (hi), Marathi (mr).
    """

    def synthesise_to_bytes(self, text: str, lang: str = 'en') -> bytes:
        errors = []
        online = _is_online()

        if online:
            # 1. Try Microsoft Edge Neural Voices (Ultra-smooth)
            if HAS_EDGE_TTS:
                try:
                    print(f"[TTS] Using Edge Neural TTS for lang='{lang}'")
                    return _synthesise_edge(text, lang)
                except Exception as e:
                    errors.append(f"edge-tts: {e}")
                    print(f"[TTS] Edge-TTS fallback due to: {e}")

            # 2. Try Google TTS
            if HAS_GTTS:
                try:
                    print(f"[TTS] Using gTTS fallback for lang='{lang}'")
                    return _synthesise_gtts(text, lang)
                except Exception as e:
                    errors.append(f"gTTS: {e}")
                    print(f"[TTS] gTTS fallback due to: {e}")
        else:
            print("[TTS] Offline mode detected - skipping online engines")

        # 3. Local MMS-TTS VITS (fully offline neural, in-project models)
        if HAS_TRANSFORMERS:
            try:
                print(f"[TTS] Using local MMS-TTS VITS for lang='{lang}'")
                return _synthesise_vits(text, lang)
            except Exception as e:
                errors.append(f"VITS: {e}")
                print(f"[TTS] VITS fallback due to: {e}")

        # 4. Fallback to System SAPI5 (Windows-only)
        if HAS_PYTTSX3:
            try:
                print(f"[TTS] Using Offline System SAPI5 for lang='{lang}'")
                return _synthesise_pyttsx3(text, lang)
            except Exception as e:
                errors.append(f"SAPI5: {e}")
                print(f"[TTS] SAPI5 fallback due to: {e}")

        raise RuntimeError("TTS failed: " + (" | ".join(errors) if errors else "no TTS engines available"))

    def synthesise_to_file(self, text: str, lang: str = 'en') -> str:
        wav_bytes = self.synthesise_to_bytes(text, lang)
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f'_tts_{lang}.mp3')
        tmp.write(wav_bytes)
        tmp.close()
        return tmp.name

    def _vits_available(self, lang: str) -> bool:
        folder = VITS_MODEL_FOLDERS.get(lang)
        if not folder:
            return False
        return _vits_model_present(os.path.join(_model_dir(), folder))

    def is_model_available(self, lang: str = 'en') -> dict:
        if self._vits_available(lang):
            return {"available": True, "type": "MMS-VITS", "quality": "Local Neural"}
        if HAS_EDGE_TTS and _is_online():
            return {"available": True, "type": "Microsoft Neural TTS", "quality": "Ultra-Smooth"}
        elif HAS_GTTS and _is_online():
            return {"available": True, "type": "Google Speech TTS", "quality": "Smooth"}
        elif HAS_PYTTSX3:
            return {"available": True, "type": "Offline System TTS", "quality": "Standard"}
        return {"available": False, "type": "None", "quality": "None"}
