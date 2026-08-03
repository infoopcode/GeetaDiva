from flask import Flask, jsonify, request, send_from_directory
import json
import os
from backend.services.ai_translator import LocalTranslator
from backend.services.ai_tts import LocalTTS
from backend.services.ai_avatar import DIDAvatar

# Initialize Flask app, configuring it to serve static files from the frontend directory
app = Flask(__name__, static_folder='frontend', static_url_path='/')

# Initialize AI Services
translator = LocalTranslator()
tts = LocalTTS()
avatar = DIDAvatar()


# Load Shlokas Database
with open('shlokas.json', 'r', encoding='utf-8') as f:
    shlokas_db = json.load(f)

@app.route('/')
def index():
    return send_from_directory('frontend', 'index.html')

@app.route('/api/shlokas', methods=['GET'])
def get_shlokas():
    # Return basic info so the UI can populate a dropdown
    return jsonify([
        {"id": s["id"], "preview": s["sanskrit"].split('।')[0][:30] + "..."} 
        for s in shlokas_db
    ])

@app.route('/api/translate', methods=['POST'])
def translate_shloka():
    data = request.json
    shloka_id = data.get('id')
    target_lang = data.get('target_lang', 'en') # en, hi, mr
    
    # Find the requested Shloka
    shloka = next((s for s in shlokas_db if s['id'] == shloka_id), None)
    if not shloka:
        return jsonify({"error": "Shloka not found"}), 404
        
    # Translate Essence and Story using the local AI model
    # (Since our base text is English, we translate from English to the target language)
    translated_essence = translator.translate(shloka['essence'], target_lang)
    translated_story = translator.translate(shloka['story'], target_lang)
    
    response = {
        "sanskrit": shloka['sanskrit'],
        "essence": translated_essence,
        "story": translated_story
    }
    
    return jsonify(response)

@app.route('/api/speak', methods=['POST'])
def speak_text():
    data = request.json
    text = data.get('text', '')
    if text:
        # We run the TTS engine to speak the translated text
        tts.speak(text)
    return jsonify({"status": "speaking"})

@app.route('/api/avatar', methods=['POST'])
def generate_avatar():
    data = request.json
    text = data.get('text', '')
    lang = data.get('lang', 'en')
    
    if text:
        result = avatar.generate_talk(text, lang)
        return jsonify(result)
    return jsonify({"error": "No text provided"}), 400

if __name__ == '__main__':
    # Run on port 5000
    app.run(debug=True, port=5000)
