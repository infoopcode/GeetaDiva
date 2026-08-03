import pyttsx3
import threading

class LocalTTS:
    def __init__(self):
        # Initialize the engine once
        self.engine = pyttsx3.init()
        self.engine.setProperty('rate', 150) # Speed of speech
        
        # Lock to prevent multiple threads from speaking at once
        self.lock = threading.Lock()

    def speak(self, text):
        """
        Synthesizes text to speech using the local OS TTS engine.
        Runs in a separate thread so it doesn't block the Flask server.
        """
        def _speak_thread():
            with self.lock:
                # Re-initialize to avoid macOS core foundation thread issues sometimes
                engine = pyttsx3.init()
                engine.setProperty('rate', 150)
                engine.say(text)
                engine.runAndWait()
                
        thread = threading.Thread(target=_speak_thread)
        thread.start()
