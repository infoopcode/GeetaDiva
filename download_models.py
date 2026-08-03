"""
download_models.py
------------------
Run this ONCE to download the MMS-TTS models into the project's `models/`
folder so TTS works fully offline (no internet needed at the event).

Usage:
    python download_models.py
"""

from transformers import VitsModel, VitsTokenizer
import os

# Models are saved inside the project, next to this script.
SAVE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")

# Note: facebook/mms-tts-san does not exist on the Hub. Sanskrit is spoken
# through the Hindi model (Devanagari phonetics), so san -> mms-tts-hin.
MODELS = {
    "mms-tts-eng": "facebook/mms-tts-eng",
    "mms-tts-hin": "facebook/mms-tts-hin",
    "mms-tts-mar": "facebook/mms-tts-mar",
}

for folder, hf_id in MODELS.items():
    dest = os.path.join(SAVE_DIR, folder)
    print(f"\nDownloading {hf_id}  ->  {dest}")
    os.makedirs(dest, exist_ok=True)
    tokenizer = VitsTokenizer.from_pretrained(hf_id)
    model = VitsModel.from_pretrained(hf_id)
    tokenizer.save_pretrained(dest)
    model.save_pretrained(dest)
    print(f"Saved to {dest}")

print(f"\nAll models downloaded to '{SAVE_DIR}'. tts_config.json already points here.")
