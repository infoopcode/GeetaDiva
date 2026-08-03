from flask import Flask, jsonify, request, send_from_directory, Response
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
    # Return all metadata the card-picker needs
    return jsonify([
        {
            "id":      s["id"],
            "source":  s.get("source", "Bhagavad Gita"),
            "chapter": s.get("chapter", ""),
            "verse":   s.get("verse", ""),
            "title":   s.get("title", ""),
            "preview": s["sanskrit"].split('।')[0][:50],
        }
        for s in shlokas_db
    ])

@app.route('/api/translate', methods=['POST'])
def translate_shloka():
    data = request.json
    shloka_id = data.get('id')
    target_lang = data.get('target_lang', 'en')

    shloka = next((s for s in shlokas_db if s['id'] == shloka_id), None)
    if not shloka:
        return jsonify({"error": "Shloka not found"}), 404

    # For Sanskrit output, the shloka itself is the essence/story
    if target_lang == 'san':
        return jsonify({
            "sanskrit": shloka['sanskrit'],
            "essence":  shloka['sanskrit'],
            "story":    shloka['sanskrit']
        })

    # Use pre-translated fields if available, otherwise call AI translator
    lang_suffix = '' if target_lang == 'en' else f'_{target_lang}'
    essence_key = f'essence{lang_suffix}'
    story_key   = f'story{lang_suffix}'

    essence = shloka.get(essence_key) or translator.translate(shloka['essence'], target_lang)
    story   = shloka.get(story_key)   or translator.translate(shloka['story'],   target_lang)

    return jsonify({
        "sanskrit": shloka['sanskrit'],
        "essence":  essence,
        "story":    story
    })

@app.route('/api/speak', methods=['POST'])
def speak_text():
    """Synthesise audio and stream the WAV back to the browser."""
    data = request.json
    text = data.get('text', '')
    lang = data.get('lang', 'en')
    if not text:
        return jsonify({"error": "No text provided"}), 400
    try:
        wav_bytes = tts.synthesise_to_bytes(text, lang)
        return Response(wav_bytes, mimetype='audio/wav')
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": f"TTS failed: {str(e)}"}), 500

@app.route('/api/tts-status', methods=['GET'])
def tts_status():
    """Let the frontend know which language TTS models are available."""
    return jsonify({
        lang: tts.is_model_available(lang)
        for lang in ['en', 'hi', 'mr', 'san']
    })

@app.route('/api/avatar', methods=['POST'])
def generate_avatar():
    data = request.json
    text = data.get('text', '')
    lang = data.get('lang', 'en')
    
    if text:
        result = avatar.generate_talk(text, lang)
        return jsonify(result)
    return jsonify({"error": "No text provided"}), 400

@app.route('/api/avatar/stream/create', methods=['POST'])
def create_stream():
    result = avatar.create_stream()
    return jsonify(result)

@app.route('/api/avatar/stream/sdp', methods=['POST'])
def submit_sdp():
    data = request.json
    stream_id = data.get('stream_id')
    answer = data.get('answer')
    session_id = data.get('session_id')
    
    if not stream_id or not answer or not session_id:
        return jsonify({"error": "Missing parameters"}), 400
        
    result = avatar.submit_sdp(stream_id, answer, session_id)
    return jsonify(result)

@app.route('/api/avatar/stream/ice', methods=['POST'])
def submit_ice():
    data = request.json
    stream_id = data.get('stream_id')
    candidate = data.get('candidate')
    sdp_mid = data.get('sdpMid')
    sdp_m_line_index = data.get('sdpMLineIndex')
    session_id = data.get('session_id')
    
    if not stream_id or not session_id:
        return jsonify({"error": "Missing parameters"}), 400
        
    result = avatar.submit_ice(stream_id, candidate, sdp_mid, sdp_m_line_index, session_id)
    return jsonify(result)

@app.route('/api/avatar/stream/speak', methods=['POST'])
def speak_stream():
    data = request.json
    stream_id = data.get('stream_id')
    session_id = data.get('session_id')
    text = data.get('text', '')
    lang = data.get('lang', 'en')
    
    if not stream_id or not session_id or not text:
        return jsonify({"error": "Missing parameters"}), 400
        
    result = avatar.speak_stream(stream_id, session_id, text, lang)
    return jsonify(result)

@app.route('/api/avatar/stream/close', methods=['DELETE'])
def close_stream():
    data = request.json
    stream_id = data.get('stream_id')
    session_id = data.get('session_id')
    
    if not stream_id or not session_id:
        return jsonify({"error": "Missing parameters"}), 400
        
    result = avatar.close_stream(stream_id, session_id)
    return jsonify(result)

if __name__ == '__main__':
    # Run on port 5000
    app.run(debug=True, port=5000)

