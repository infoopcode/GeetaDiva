import requests
import time
import os

class DIDAvatar:
    def __init__(self):
        # We will read this from environment variables or a config file later
        # For the hackathon, the user can paste it directly here.
        # Ensure it is the base64 encoded API key (often provided by D-ID or generated as username:password)
        self.api_key = os.environ.get("DID_API_KEY", "")
        self.base_url = "https://api.d-id.com"
        
    def generate_talk(self, text, lang="en"):
        if not self.api_key:
            return {"error": "D-ID API key not configured. Please add it to ai_avatar.py"}
            
        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "authorization": f"Basic {self.api_key}"
        }
        
        # Select voice based on language
        voice_id = "en-US-JennyNeural"
        if lang == "hi":
            voice_id = "hi-IN-SwaraNeural"
        elif lang == "mr":
            voice_id = "mr-IN-AarohiNeural"
            
        # A professional default human avatar image URL provided by D-ID
        image_url = "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.jpeg"
        
        payload = {
            "script": {
                "type": "text",
                "subtitles": "false",
                "provider": {
                    "type": "microsoft",
                    "voice_id": voice_id
                },
                "input": text
            },
            "config": {
                "fluent": "false",
                "pad_audio": "0.0"
            },
            "source_url": image_url
        }
        
        try:
            # 1. Start the generation process
            response = requests.post(f"{self.base_url}/talks", json=payload, headers=headers)
            response.raise_for_status()
            talk_id = response.json().get("id")
            
            # 2. Poll for the result video URL (usually takes 3-5 seconds)
            for _ in range(15):
                time.sleep(1)
                res = requests.get(f"{self.base_url}/talks/{talk_id}", headers=headers)
                status = res.json().get("status")
                if status == "done":
                    return {"video_url": res.json().get("result_url")}
                elif status == "error":
                    return {"error": "D-ID Video Generation Failed."}
                    
            return {"error": "Timeout waiting for video."}
        except Exception as e:
            return {"error": f"API Error: {str(e)}"}
