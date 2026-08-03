/**
 * GeetaDiva — app.js
 * ==================
 * Features:
 *   • Card-picker for Shlokas with live search
 *   • Multi-lingual translation (Sanskrit, English, Hindi, Marathi)
 *   • Interactive 2D Human Vector Avatar with real-time Audio-Driven Lip Sync
 *   • Automatic WebRTC (D-ID) online video stream & 2D Avatar offline fallback
 *   • Multi-engine local TTS (Meta MMS-TTS VITS & Windows System SAPI5)
 */

'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
let currentShlokaId  = null;
let allShlokas       = [];

// WebRTC state
let peerConnection   = null;
let streamId         = null;
let sessionId        = null;

// Audio & 2D Lip Sync State
let currentAudio     = null;
let waveTimeout      = null;
let audioCtx         = null;
let analyser         = null;
let audioSourceNode  = null;
let lipSyncAnimFrame = null;
let isLipSyncActive  = false;
let blinkInterval    = null;

// DOM Helpers
const $ = (id) => document.getElementById(id);
const shlokaList   = $('shloka-list');
const searchInput  = $('shloka-search');
const langSelect   = $('lang-select');
const statusText   = $('status-text');
const statusDot    = $('status-dot');
const mascot       = $('mascot');
const mascotStatus = $('mascot-status');
const avatarVideo  = $('avatar-video');
const audioWaves   = $('audio-waves');
const ttsBadge     = $('tts-badge');
const ttsBadgeText = $('tts-badge-text');
const emptyState   = $('empty-state');

// 2D Avatar SVG Elements
const mouthCavity = $('avatar-mouth-cavity');
const mouthTeeth  = $('avatar-mouth-teeth');
const mouthTongue = $('avatar-mouth-tongue');
const lipUpper    = $('avatar-lip-upper');
const lipLower    = $('avatar-lip-lower');
const headGroup   = $('avatar-head-group');
const eyelidLeft  = $('avatar-eyelid-left');
const eyelidRight = $('avatar-eyelid-right');


// ═══════════════════════════════════════════════════════════════════════════════
//  INITIALISATION
// ═══════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    fetchShlokas();
    checkTTSStatus();
    initBlinkingAnimation();

    searchInput.addEventListener('input', filterShlokas);
    langSelect.addEventListener('change', () => {
        checkTTSStatus();
        if (currentShlokaId) loadShloka(currentShlokaId);
    });

    window.addEventListener('beforeunload', closeAvatarStream);
});


// ═══════════════════════════════════════════════════════════════════════════════
//  SHLOKA DRAWER
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchShlokas() {
    try {
        const res = await fetch('/api/shlokas');
        allShlokas = await res.json();
        renderShlokaList(allShlokas);
    } catch (err) {
        shlokaList.innerHTML = `<div class="drawer-loading">Failed to load shlokas.</div>`;
        console.error('fetchShlokas:', err);
    }
}

function renderShlokaList(list) {
    if (!list.length) {
        shlokaList.innerHTML = `<div class="drawer-loading">No shlokas match search.</div>`;
        return;
    }

    const groups = {};
    list.forEach(s => {
        const src = s.source || 'Other';
        if (!groups[src]) groups[src] = [];
        groups[src].push(s);
    });

    shlokaList.innerHTML = '';
    for (const [source, items] of Object.entries(groups)) {
        const label = document.createElement('div');
        label.className = 'drawer-group-label';
        label.textContent = source;
        shlokaList.appendChild(label);

        items.forEach(s => {
            const card = document.createElement('div');
            card.className = 'shloka-card';
            card.dataset.id = s.id;

            const chapterLabel = s.chapter
                ? `Ch. ${s.chapter}${s.verse ? ':' + s.verse : ''}`
                : s.verse || '';

            card.innerHTML = `
                <div class="card-meta">
                    ${chapterLabel ? `<span class="chapter-badge">${chapterLabel}</span>` : ''}
                    <span class="card-title">${s.title || s.id}</span>
                </div>
                <div class="card-preview">${s.preview || ''}…</div>
            `;

            card.addEventListener('click', () => selectShloka(s.id, card));
            shlokaList.appendChild(card);
        });
    }
}

function filterShlokas() {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) {
        renderShlokaList(allShlokas);
        if (currentShlokaId) {
            const el = shlokaList.querySelector(`[data-id="${currentShlokaId}"]`);
            if (el) el.classList.add('active');
        }
        return;
    }
    const filtered = allShlokas.filter(s =>
        (s.title || '').toLowerCase().includes(query) ||
        (s.preview || '').includes(query) ||
        (s.source || '').toLowerCase().includes(query) ||
        (s.chapter || '').includes(query)
    );
    renderShlokaList(filtered);
}

function selectShloka(id, cardEl) {
    shlokaList.querySelectorAll('.shloka-card.active').forEach(c => c.classList.remove('active'));
    if (cardEl) cardEl.classList.add('active');
    currentShlokaId = id;
    loadShloka(id);
}


// ═══════════════════════════════════════════════════════════════════════════════
//  TRANSLATION LOADING
// ═══════════════════════════════════════════════════════════════════════════════

async function loadShloka(id) {
    const lang = langSelect.value;

    emptyState.style.display = 'none';
    ['card-sanskrit', 'card-essence', 'card-story'].forEach(cid => {
        $(cid).style.display = 'block';
    });

    $('sanskrit-text').className = 'sanskrit-font skeleton';
    $('sanskrit-text').textContent = 'Loading…';
    $('essence-text').className = 'skeleton';
    $('essence-text').textContent = 'Translating…';
    $('story-text').className = 'skeleton';
    $('story-text').textContent = 'Translating…';
    $('verse-ref').textContent = '';

    setStatus('connecting', 'Translating…');

    try {
        const res = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, target_lang: lang })
        });
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        const meta = allShlokas.find(s => s.id === id) || {};
        const verseRef = meta.chapter
            ? `${meta.source || 'BG'} ${meta.chapter}:${meta.verse || ''}`
            : meta.source || '';

        $('verse-ref').textContent = verseRef;
        $('sanskrit-text').className = 'sanskrit-font';
        $('sanskrit-text').textContent = data.sanskrit;
        $('essence-text').className = '';
        $('essence-text').textContent = data.essence;
        $('story-text').className = '';
        $('story-text').textContent = data.story;

        setStatus('ready', 'Ready');
    } catch (err) {
        console.error('loadShloka error:', err);
        $('essence-text').className = '';
        $('essence-text').textContent = 'Failed to load translation.';
        $('story-text').className = '';
        $('story-text').textContent = '';
        setStatus('error', 'Error');
        setTimeout(() => setStatus('ready', 'Ready'), 3000);
    }
}


// ═══════════════════════════════════════════════════════════════════════════════
//  TTS STATUS CHECK
// ═══════════════════════════════════════════════════════════════════════════════

async function checkTTSStatus() {
    try {
        const res = await fetch('/api/tts-status');
        const statusData = await res.json();
        const lang = langSelect.value;
        const currentStatus = statusData[lang] || {};

        if (currentStatus.type === 'MMS-VITS') {
            ttsBadge.className = 'tts-badge available';
            $('tts-badge-icon').textContent = '◉';
            ttsBadgeText.textContent = `MMS-VITS Local Model (${lang.toUpperCase()})`;
        } else if (currentStatus.available) {
            ttsBadge.className = 'tts-badge available';
            $('tts-badge-icon').textContent = '◈';
            ttsBadgeText.textContent = `Offline System TTS (${lang.toUpperCase()})`;
        } else {
            ttsBadge.className = 'tts-badge unavailable';
            $('tts-badge-icon').textContent = '○';
            ttsBadgeText.textContent = 'TTS Engine Unavailable';
        }
    } catch (err) {
        ttsBadge.className = 'tts-badge available';
        $('tts-badge-icon').textContent = '◈';
        ttsBadgeText.textContent = 'Offline TTS Active';
    }
}


// ═══════════════════════════════════════════════════════════════════════════════
//  SPEAK TEXT & AUDIO DRIVEN 2D LIP-SYNC
// ═══════════════════════════════════════════════════════════════════════════════

async function speakText(elementId, lang) {
    const text = $(elementId)?.innerText?.trim();
    lang = lang || langSelect.value;
    if (!text || text.includes('will appear here')) return;

    stopCurrentAudio();
    setSpeakingState(true);
    setStatus('speaking', 'Speaking…');

    // Attempt D-ID real-time streaming video first (if configured)
    const webRTCSuccess = await tryWebRTCSpeak(text, lang);

    // If WebRTC is offline or unconfigured, use local TTS + 2D Lip Sync Avatar
    if (!webRTCSuccess) {
        await tryLocalTTSSpeak(text, lang);
    }
}

async function tryWebRTCSpeak(text, lang) {
    try {
        if (!peerConnection || peerConnection.connectionState === 'closed' || peerConnection.connectionState === 'failed') {
            mascotStatus.innerHTML = 'Connecting<br>Live Stream…';
            await initAvatarStream();
        }

        const res = await fetch('/api/avatar/stream/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stream_id: streamId, session_id: sessionId, text, lang })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        scheduleSpeakEnd(text.split(/\s+/).length * 450 + 1500);
        return true;
    } catch (err) {
        console.warn('[Avatar] D-ID stream unavailable. Switching to 2D Lip Sync Avatar.', err.message);
        closeAvatarStream();
        return false;
    }
}

async function tryLocalTTSSpeak(text, lang) {
    avatarVideo.style.display = 'none';
    mascot.style.display = 'flex';
    mascotStatus.innerHTML = '2D Avatar<br>Speaking';

    try {
        setStatus('speaking', 'Synthesising…');
        const res = await fetch('/api/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, lang })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
        }

        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);

        currentAudio = new Audio(audioUrl);
        audioWaves.classList.add('active');

        // Setup Web Audio Analyser for Real-Time 2D Lip Sync
        start2DLipSync(currentAudio);

        currentAudio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            stop2DLipSync();
            setSpeakingState(false);
            setStatus('ready', 'Ready');
        };

        currentAudio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            stop2DLipSync();
            setSpeakingState(false);
            setStatus('error', 'Audio Error');
            setTimeout(() => setStatus('ready', 'Ready'), 2500);
        };

        await currentAudio.play();

    } catch (err) {
        console.error('[TTS] Local speech synthesis error:', err);
        stop2DLipSync();
        setSpeakingState(false);
        setStatus('error', 'TTS Error');
        setTimeout(() => setStatus('ready', 'Ready'), 3000);
    }
}


// ═══════════════════════════════════════════════════════════════════════════════
//  2D HUMAN LIP SYNC ENGINE (Web Audio API Volume/Viseme Real-Time Morph)
// ═══════════════════════════════════════════════════════════════════════════════

function start2DLipSync(audioEl) {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        if (audioSourceNode) {
            try { audioSourceNode.disconnect(); } catch {}
        }

        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;

        audioSourceNode = audioCtx.createMediaElementSource(audioEl);
        audioSourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);

        isLipSyncActive = true;
        animateLipSync();

    } catch (e) {
        console.warn('[LipSync] Web Audio API setup fallback:', e);
        // Fallback procedural lip oscillation if WebAudio node is already bound
        runProceduralLipSync();
    }
}

function animateLipSync() {
    if (!isLipSyncActive || !analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    // Calculate RMS audio volume / intensity
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
    }
    const average = sum / bufferLength;
    const normVolume = Math.min(1.0, average / 65); // 0.0 to 1.0

    update2DMouthShape(normVolume);

    lipSyncAnimFrame = requestAnimationFrame(animateLipSync);
}

function runProceduralLipSync() {
    let phase = 0;
    isLipSyncActive = true;
    const loop = () => {
        if (!isLipSyncActive) return;
        phase += 0.25;
        const volume = (Math.sin(phase) * 0.4 + 0.5) * (Math.random() * 0.5 + 0.5);
        update2DMouthShape(volume);
        lipSyncAnimFrame = requestAnimationFrame(loop);
    };
    loop();
}

/**
 * Morph SVG Paths of 2D Human Mouth in Real-Time
 * @param {number} volume - Range [0.0, 1.0]
 */
function update2DMouthShape(volume) {
    if (!mouthCavity || !lipUpper || !lipLower) return;

    // Mouth Opening Parameters
    const openY = volume * 14;      // Vertical mouth opening (0px to 14px)
    const widthX = volume * 4;      // Horizontal mouth stretch
    const tongueY = volume * 6;     // Tongue height

    // Morph Paths
    const cxLeft  = 84 - widthX;
    const cxRight = 116 + widthX;
    const baseLineY = 110;
    const openLineY = baseLineY + openY;

    // Inner Cavity Path
    mouthCavity.setAttribute('d', `M ${cxLeft} ${baseLineY} Q 100 ${openLineY + 2} ${cxRight} ${baseLineY} Q 100 ${baseLineY} ${cxLeft} ${baseLineY} Z`);

    // Upper Lip Path
    lipUpper.setAttribute('d', `M ${cxLeft} ${baseLineY} Q 92 ${106 - volume * 2} 100 ${108 - volume * 2} Q 108 ${106 - volume * 2} ${cxRight} ${baseLineY} Q 100 ${baseLineY - 1} ${cxLeft} ${baseLineY} Z`);

    // Lower Lip Path
    lipLower.setAttribute('d', `M ${cxLeft} ${baseLineY} Q 100 ${openLineY + 4} ${cxRight} ${baseLineY} Q 100 ${openLineY + 8} ${cxLeft} ${baseLineY} Z`);

    // Teeth & Tongue Visibility
    if (mouthTeeth && mouthTongue) {
        if (volume > 0.15) {
            mouthTeeth.setAttribute('opacity', Math.min(0.9, volume * 1.5));
            mouthTeeth.setAttribute('d', `M ${cxLeft + 4} ${baseLineY} Q 100 ${baseLineY + openY * 0.4} ${cxRight - 4} ${baseLineY} Q 100 ${baseLineY} ${cxLeft + 4} ${baseLineY} Z`);

            mouthTongue.setAttribute('opacity', Math.min(0.8, volume * 1.2));
            mouthTongue.setAttribute('d', `M 90 ${openLineY - 2} Q 100 ${openLineY - tongueY} 110 ${openLineY - 2} Q 100 ${openLineY + 3} 90 ${openLineY - 2} Z`);
        } else {
            mouthTeeth.setAttribute('opacity', 0);
            mouthTongue.setAttribute('opacity', 0);
        }
    }

    // Subtle Head Tilt with Speech
    if (headGroup) {
        const tilt = Math.sin(Date.now() / 200) * (volume * 1.8);
        headGroup.setAttribute('transform', `rotate(${tilt}, 100, 100)`);
    }
}

function stop2DLipSync() {
    isLipSyncActive = false;
    if (lipSyncAnimFrame) {
        cancelAnimationFrame(lipSyncAnimFrame);
        lipSyncAnimFrame = null;
    }
    // Reset Mouth to Closed Neutral Position
    update2DMouthShape(0);
    if (headGroup) {
        headGroup.setAttribute('transform', 'rotate(0, 100, 100)');
    }
}

// Natural Eye Blinking Animation
function initBlinkingAnimation() {
    if (blinkInterval) clearInterval(blinkInterval);
    blinkInterval = setInterval(() => {
        if (!eyelidLeft || !eyelidRight) return;
        // Blink close
        eyelidLeft.setAttribute('d', 'M 72.5 79 Q 81 84.5 89.5 79');
        eyelidRight.setAttribute('d', 'M 110.5 79 Q 119 84.5 127.5 79');
        setTimeout(() => {
            // Blink open
            eyelidLeft.setAttribute('d', 'M 72.5 79 Q 81 73.5 89.5 79');
            eyelidRight.setAttribute('d', 'M 110.5 79 Q 119 73.5 127.5 79');
        }, 180);
    }, 3800);
}


// ═══════════════════════════════════════════════════════════════════════════════
//  WebRTC D-ID STREAM MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

async function initAvatarStream() {
    const res  = await fetch('/api/avatar/stream/create', { method: 'POST' });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    streamId  = data.id;
    sessionId = data.session_id;

    peerConnection = new RTCPeerConnection({ iceServers: data.ice_servers || [] });

    peerConnection.ontrack = (event) => {
        if (event.track.kind === 'video') {
            avatarVideo.srcObject = event.streams[0];
            avatarVideo.style.display = 'block';
            mascot.style.display = 'none';
            audioWaves.classList.add('active');
        }
    };

    peerConnection.onicecandidate = async ({ candidate }) => {
        if (candidate && streamId && sessionId) {
            await fetch('/api/avatar/stream/ice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    stream_id:      streamId,
                    session_id:     sessionId,
                    candidate:      candidate.candidate,
                    sdpMid:         candidate.sdpMid,
                    sdpMLineIndex:  candidate.sdpMLineIndex
                })
            }).catch(e => console.warn('[ICE]', e));
        }
    };

    peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
            closeAvatarStream();
        }
    };

    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    await fetch('/api/avatar/stream/sdp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stream_id: streamId, session_id: sessionId, answer })
    });
}

async function closeAvatarStream() {
    if (peerConnection) {
        try { peerConnection.close(); } catch {}
        peerConnection = null;
    }
    avatarVideo.srcObject = null;
    avatarVideo.style.display = 'none';
    mascot.style.display = 'flex';
    mascotStatus.innerHTML = '2D Avatar<br>Ready';

    if (streamId && sessionId) {
        fetch('/api/avatar/stream/close', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stream_id: streamId, session_id: sessionId })
        }).catch(() => {});
    }
    streamId = sessionId = null;
}


// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function stopCurrentAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    stop2DLipSync();
    if (waveTimeout) {
        clearTimeout(waveTimeout);
        waveTimeout = null;
    }
}

function setSpeakingState(speaking) {
    if (speaking) {
        mascot.classList.add('speaking');
        audioWaves.classList.add('active');
    } else {
        mascot.classList.remove('speaking');
        audioWaves.classList.remove('active');
        mascotStatus.innerHTML = '2D Avatar<br>Ready';
    }
}

function scheduleSpeakEnd(ms) {
    if (waveTimeout) clearTimeout(waveTimeout);
    waveTimeout = setTimeout(() => {
        setSpeakingState(false);
        setStatus('ready', 'Ready');
    }, ms);
}

function setStatus(state, label) {
    statusText.textContent = label;
    statusDot.className = 'status-dot';
    if (state !== 'ready') statusDot.classList.add(state);
}
