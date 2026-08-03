# Divya.ai — Sanskrit Shloka AI Avatar

A highly advanced digital AI avatar application that translates Sanskrit Shlokas into **English, Hindi, and Marathi** in real-time, featuring a professional human avatar with synchronized lip-sync and speech output.

Designed specifically to meet strict hackathon constraints, this application features a **hybrid architecture** that supports both high-fidelity cloud APIs and fully offline local AI models to ensure it runs flawlessly even without Wi-Fi.

---

## 🌟 Key Features

| Feature | Description |
| --- | --- |
| **Professional Lip-Sync Avatar** | Integrates with the **D-ID Cloud API** to generate a photorealistic human video that lip-syncs perfectly with the translated text in real-time. |
| **Local Offline AI Translation** | Uses **Hugging Face `transformers`** (Neural Machine Translation) to translate the essence and stories of Shlokas into regional languages (Hindi, Marathi) completely offline. |
| **Offline Text-to-Speech (Fallback)** | Features a smart fallback mechanism using `pyttsx3`. If the internet drops or the D-ID API fails, it seamlessly switches to native offline TTS to ensure the presentation never crashes. |
| **Rich Scriptural Database** | A pre-populated JSON repository of authenticated verses from the Bhagavad Gita, including the Sanskrit text, its deep spiritual essence, and the background story. |
| **Premium UI Design** | Built with modern **Glassmorphism** aesthetics (frosted glass, dynamic gradients, CSS micro-animations) for a stunning first impression. |

---

## 🏗️ Architecture Stack

- **Backend:** Python 3, Flask, PyTorch
- **AI Translation:** Hugging Face `transformers` (`Helsinki-NLP` models)
- **AI Avatar & Speech:** D-ID Talks API (Cloud) & `pyttsx3` (Offline Local)
- **Frontend:** HTML5, CSS3, Vanilla JS

---

## 🚀 Setup & Installation (Mac M2)

To comply with the 120-minute compilation lock and the offline presentation rule, follow these steps to pre-download everything onto your machine.

### 1. Create a Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```
*(This installs Flask, PyTorch, Transformers, and pyttsx3).*

### 3. Pre-Download Offline AI Models
To ensure the translation works without Wi-Fi on the event day, cache the Hugging Face models by running:
```bash
python download_models.py
```

### 4. Configure the D-ID Avatar (Optional)
If you want to use the photorealistic human avatar, you must provide a D-ID API key.
1. Go to [studio.d-id.com](https://studio.d-id.com) and create an account.
2. Open `backend/services/ai_avatar.py` and paste your API key on Line 9.

---

## 💻 Running the Application

Once the setup is complete, simply start the Flask server:
```bash
python app.py
```

Open your browser and navigate to `http://localhost:5000` to interact with the AI Avatar.
