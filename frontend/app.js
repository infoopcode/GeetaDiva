document.addEventListener('DOMContentLoaded', () => {
    fetchShlokas();

    const shlokaSelect = document.getElementById('shloka-select');
    const langSelect = document.getElementById('lang-select');

    // Trigger translation when a new shloka or language is selected
    shlokaSelect.addEventListener('change', translateSelected);
    langSelect.addEventListener('change', translateSelected);
});

async function fetchShlokas() {
    try {
        const res = await fetch('/api/shlokas');
        const shlokas = await res.json();
        
        const select = document.getElementById('shloka-select');
        shlokas.forEach(s => {
            const option = document.createElement('option');
            option.value = s.id;
            option.textContent = s.preview;
            select.appendChild(option);
        });
    } catch (err) {
        console.error("Failed to fetch shlokas", err);
    }
}

async function translateSelected() {
    const shlokaId = document.getElementById('shloka-select').value;
    const lang = document.getElementById('lang-select').value;

    if (!shlokaId) return;

    // Show loading states
    document.getElementById('sanskrit-text').innerText = "Loading...";
    document.getElementById('essence-text').innerText = "Translating...";
    document.getElementById('story-text').innerText = "Translating...";

    try {
        const res = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: shlokaId, target_lang: lang })
        });
        
        const data = await res.json();
        
        // Update UI
        document.getElementById('sanskrit-text').innerText = data.sanskrit;
        document.getElementById('essence-text').innerText = data.essence;
        document.getElementById('story-text').innerText = data.story;
    } catch (err) {
        console.error("Translation failed", err);
        document.getElementById('essence-text').innerText = "Failed to translate.";
    }
}

async function speakText(elementId) {
    const text = document.getElementById(elementId).innerText;
    const lang = document.getElementById('lang-select').value;
    if (!text) return;

    const mascot = document.getElementById('mascot');
    const mascotStatus = document.getElementById('mascot-status');
    const video = document.getElementById('avatar-video');
    const waves = document.getElementById('audio-waves');
    
    // Show generating state
    mascot.style.display = 'flex';
    video.style.display = 'none';
    mascot.classList.add('speaking');
    mascotStatus.innerHTML = "Generating<br>Video...";

    try {
        // Call backend Avatar generator (D-ID)
        const res = await fetch('/api/avatar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, lang: lang })
        });
        
        const data = await res.json();
        
        mascot.classList.remove('speaking');
        
        if (data.error) {
            console.warn("Avatar failed, falling back to local TTS.", data.error);
            mascotStatus.innerHTML = "Avatar<br>Error";
            // Fallback to local offline TTS if API key is missing or internet fails
            fetch('/api/speak', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text })
            });
            waves.classList.add('active');
            setTimeout(() => { waves.classList.remove('active'); }, 5000);
        } else if (data.video_url) {
            // Success! Hide placeholder and show video
            mascot.style.display = 'none';
            video.src = data.video_url;
            video.style.display = 'block';
            waves.classList.add('active');
            
            // Wait for video to end to hide waves
            video.onended = () => {
                waves.classList.remove('active');
                video.style.display = 'none';
                mascot.style.display = 'flex';
                mascotStatus.innerHTML = "Avatar<br>Ready";
            };
        }
    } catch (err) {
        console.error("Avatar fetch failed", err);
        mascot.classList.remove('speaking');
        mascotStatus.innerHTML = "Network<br>Error";
    }
}
