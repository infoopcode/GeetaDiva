from transformers import pipeline
import time

class LocalTranslator:
    def __init__(self):
        self.models = {}
        # We will lazily load the models to speed up initial server start
        print("Local Translator initialized. Models will be loaded on first request.")

    def _get_model(self, source_lang, target_lang):
        model_key = f"{source_lang}-{target_lang}"
        
        # Map languages to Helsinki-NLP models (lightweight, offline NMT models)
        model_map = {
            "en-hi": "Helsinki-NLP/opus-mt-en-hi",
            "en-mr": "Helsinki-NLP/opus-mt-en-mr", # Marathi
            # Add more as needed. Note: Direct Sanskrit to Regional is rare in small offline models.
            # A common hackathon trick is translating Sanskrit -> English -> Regional internally.
        }
        
        model_name = model_map.get(model_key)
        if not model_name:
            return None
            
        if model_key not in self.models:
            print(f"Downloading/Loading offline model {model_name}... This happens only once!")
            try:
                self.models[model_key] = pipeline("translation", model=model_name)
            except Exception as e:
                print(f"Error loading model {model_name}: {e}")
                return None
                
        return self.models[model_key]

    def translate(self, text, target_language):
        """
        Translates text to the target language using local Hugging Face models.
        In this prototype, since we have English stored in the JSON, 
        we translate from English to the target language to ensure high quality with small models.
        """
        # If target is English, no translation needed (we have it in our base json)
        if target_language == "en":
            return text
            
        translator = self._get_model("en", target_language)
        if translator:
            try:
                result = translator(text)
                return result[0]['translation_text']
            except Exception as e:
                print(f"Translation failed: {e}")
                return f"[Translation failed - requires model download for {target_language}]"
        else:
            return f"[Offline model for '{target_language}' not configured]"

