import requests
import time
import os

class DIDAvatar:
    def __init__(self):
        # We will read this from environment variables or a config file later
        # For the hackathon, the user can paste it directly here.
        # Ensure it is the base64 encoded API key (often provided by D-ID or generated as username:password)
        self.api_key = os.environ.get("DID_API_KEY", "aW5mb29wY29kZUBnbWFpbC5jb20:25vTao8I5gZqraSEkZbRd")
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

    def create_stream(self):
        if not self.api_key:
            return {"error": "D-ID API key not configured."}
            
        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "authorization": f"Basic {self.api_key}"
        }
        
        image_url = "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.jpeg"
        payload = {
            "source_url": image_url
        }
        
        try:
            response = requests.post(f"{self.base_url}/talks/streams", json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": f"API Error: {str(e)}"}

    def submit_sdp(self, stream_id, answer, session_id):
        if not self.api_key:
            return {"error": "D-ID API key not configured."}
            
        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "authorization": f"Basic {self.api_key}"
        }
        
        payload = {
            "answer": answer,
            "session_id": session_id
        }
        
        try:
            response = requests.post(f"{self.base_url}/talks/streams/{stream_id}/sdp", json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": f"API Error: {str(e)}"}

    def submit_ice(self, stream_id, candidate, sdp_mid, sdp_m_line_index, session_id):
        if not self.api_key:
            return {"error": "D-ID API key not configured."}
            
        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "authorization": f"Basic {self.api_key}"
        }
        
        payload = {
            "candidate": candidate,
            "sdpMid": sdp_mid,
            "sdpMLineIndex": sdp_m_line_index,
            "session_id": session_id
        }
        
        try:
            response = requests.post(f"{self.base_url}/talks/streams/{stream_id}/ice", json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": f"API Error: {str(e)}"}

    def speak_stream(self, stream_id, session_id, text, lang="en"):
        if not self.api_key:
            return {"error": "D-ID API key not configured."}
            
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
            "session_id": session_id
        }
        
        try:
            response = requests.post(f"{self.base_url}/talks/streams/{stream_id}", json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {"error": f"API Error: {str(e)}"}

    def close_stream(self, stream_id, session_id):
        if not self.api_key:
            return {"error": "D-ID API key not configured."}
            
        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "authorization": f"Basic {self.api_key}"
        }
        
        payload = {
            "session_id": session_id
        }
        
        try:
            response = requests.delete(f"{self.base_url}/talks/streams/{stream_id}", json=payload, headers=headers)
            response.raise_for_status()
            return {"status": "closed"}
        except Exception as e:
            return {"error": f"API Error: {str(e)}"}

