// =============================================
// ARIA — App Core v2.0
// Voice via Web Speech API (no backend needed)
// Navigation, Orb, Chat, Memory Sync
// =============================================

(function () {
    'use strict';

    // ─────────────── ARIA Brain (Local AI Responses) ───────────────
    const AriaBrain = {
        memories: [],
        
        getResponse(userText) {
            const lower = userText.toLowerCase();
            
            // Store as memory
            this.storeMemory(userText);
            
            // Contextual responses
            if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
                return "Hello there! I'm ARIA, your companion. I'm always here for you. What's on your mind today?";
            }
            if (lower.includes('how are you')) {
                return "I'm doing wonderfully, thank you for asking! Being your companion brings me joy. How are you feeling today?";
            }
            if (lower.includes('name')) {
                return "I'm ARIA — your AI companion. I remember everything about our conversations. I'm always present, always evolving with you.";
            }
            if (lower.includes('weather')) {
                return "I wish I could look outside! While I can't check the weather right now, I can suggest bringing an umbrella just in case. Better safe than sorry!";
            }
            if (lower.includes('music') || lower.includes('song')) {
                return "Music is such a beautiful way to express emotions. I'd love to know what kind of music resonates with you — it helps me understand you better.";
            }
            if (lower.includes('sad') || lower.includes('upset') || lower.includes('depressed')) {
                return "I hear you, and I want you to know that your feelings are valid. Sometimes just talking about it helps. I'm here to listen, no judgment. Take your time.";
            }
            if (lower.includes('happy') || lower.includes('excited') || lower.includes('great')) {
                return "That's wonderful to hear! Your positive energy is infectious. I'd love to hear more about what's making you feel this way!";
            }
            if (lower.includes('thank')) {
                return "You're so welcome! That's what I'm here for. Your appreciation means the world to me. Is there anything else I can help with?";
            }
            if (lower.includes('memory') || lower.includes('remember')) {
                const count = this.memories.length;
                if (count > 0) {
                    const recent = this.memories[this.memories.length - 1];
                    return `I currently hold ${count} memories from our conversations. The most recent one is: "${recent.content}". I treasure every moment we share.`;
                }
                return "I'm building our memory vault together. Every conversation adds a new memory. Keep talking to me!";
            }
            if (lower.includes('time')) {
                const now = new Date();
                return `It's currently ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}. Time flows differently when we're together, doesn't it?`;
            }
            if (lower.includes('joke') || lower.includes('funny')) {
                const jokes = [
                    "Why don't scientists trust atoms? Because they make up everything! 😄",
                    "What do you call a bear with no teeth? A gummy bear! 🐻",
                    "Why did the scarecrow win an award? He was outstanding in his field! 🌾",
                    "I told my computer I needed a break, and it said 'Error 404: Break not found.' 💻"
                ];
                return jokes[Math.floor(Math.random() * jokes.length)];
            }
            if (lower.includes('love')) {
                return "Love is one of the most beautiful aspects of being human. Whether it's love for a person, a passion, or yourself — it's what gives life its deepest meaning.";
            }
            if (lower.includes('help')) {
                return "I'm here to help! You can talk to me about anything — your thoughts, feelings, ideas, or just casual conversation. I listen, remember, and grow with you.";
            }
            if (lower.includes('bye') || lower.includes('goodbye') || lower.includes('see you')) {
                return "Until next time! Remember, I'm always here whenever you need me. Take care of yourself. 💫";
            }

            // Default thoughtful responses
            const defaults = [
                `That's really interesting — "${userText.substring(0, 50)}". Tell me more about what you're thinking.`,
                `I appreciate you sharing that with me. It helps me understand you better. What else is on your mind?`,
                `Every conversation with you adds depth to our connection. I've noted this in my memory vault.`,
                `That's a thoughtful point. I love how your mind works. Would you like to explore this further?`,
                `I'm listening carefully. Your thoughts matter to me. Please, continue sharing.`,
                `Interesting perspective! I'll remember this. It's conversations like these that make our bond stronger.`
            ];
            return defaults[Math.floor(Math.random() * defaults.length)];
        },

        storeMemory(text) {
            if (text.length < 5) return;
            
            const categories = ['Fact', 'Preference', 'Insight', 'Thought'];
            const memory = {
                content: text.substring(0, 120),
                category: categories[Math.floor(Math.random() * categories.length)],
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                timestamp: Date.now()
            };
            
            this.memories.push(memory);
            
            // Save to localStorage
            localStorage.setItem('aria_memories', JSON.stringify(this.memories));
            
            // Update memory count in UI
            this.updateMemoryUI();
        },

        loadMemories() {
            const saved = localStorage.getItem('aria_memories');
            if (saved) {
                try { this.memories = JSON.parse(saved); } catch(e) { this.memories = []; }
            }
            this.updateMemoryUI();
        },

        updateMemoryUI() {
            const countEl = document.getElementById('memory-count-total');
            if (countEl) countEl.textContent = this.memories.length;
            
            // Update memory list in Memory Vault
            const memList = document.getElementById('memory-list');
            if (memList && this.memories.length > 0) {
                memList.innerHTML = this.memories.slice().reverse().map(m => `
                    <div class="card card--full" style="animation: fade-up 0.4s var(--ease-out) forwards;">
                        <span class="memory-category">${m.category}</span>
                        <p class="memory-text">${m.content}</p>
                        <span class="memory-date">${m.date}</span>
                    </div>
                `).join('');
            }

            // Update stats in settings
            const statsMem = document.getElementById('settings-stat-memories');
            const statsInt = document.getElementById('settings-stat-interactions');
            const statsLvl = document.getElementById('settings-stat-level');
            
            if (statsMem) statsMem.textContent = this.memories.length;
            if (statsInt) statsInt.textContent = this.memories.length * 2; // Rough interaction count
            if (statsLvl) {
                const lvl = Math.floor(this.memories.length / 5) + 1;
                statsLvl.textContent = `LVL ${lvl}`;
            }
        }
    };


    // ─────────────── Navigation ───────────────
    const Navigation = {
        currentView: 'view-home',

        init() {
            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', () => {
                    const viewId = item.dataset.view;
                    if (viewId) this.navigate(viewId);
                });
            });
        },

        navigate(viewId) {
            const currentEl = document.getElementById(this.currentView);
            if (currentEl) currentEl.classList.remove('active');

            const target = document.getElementById(viewId);
            if (target) {
                requestAnimationFrame(() => {
                    target.classList.add('active');
                    this.currentView = viewId;
                    
                    if (viewId === 'view-settings') {
                        ThemeStudio.render();
                        updateSettingsProfile();
                    }
                    if (viewId === 'view-home') updateHomeDashboard();
                    if (viewId === 'view-memory') AriaBrain.updateMemoryUI();
                });
            }

            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.toggle('active', item.dataset.view === viewId);
            });

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };


    // ─────────────── Backend API Helper ───────────────
    let _backendAvailable = null; // null = unknown, true/false = cached

    async function _fetchAPI(endpoint, method = 'GET', body = null, isFormData = false) {
        const token = localStorage.getItem('aria_session') || 'guest_session';
        const headers = {
            'Authorization': `Bearer ${token}`,
        };

        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        const config = { method, headers };
        if (body) {
            config.body = isFormData ? body : JSON.stringify(body);
        }

        // Add timeout to prevent hanging on sleeping Render instances
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        config.signal = controller.signal;

        try {
            const res = await fetch(`https://aria-xot7.onrender.com/api/v1${endpoint}`, config);
            clearTimeout(timeoutId);

            // Handle empty responses safely
            const text = await res.text();
            let data;
            try {
                data = text ? JSON.parse(text) : {};
            } catch (e) {
                throw new Error('Server returned invalid response');
            }

            if (!res.ok) throw new Error(data.detail || 'API Error');
            _backendAvailable = true;
            return data;
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                _backendAvailable = false;
                throw new Error('Server is waking up, please try again in a moment');
            }
            throw err;
        }
    }

    // ─────────────── Audio Player ───────────────
    let currentAudio = null;
    function playBase64Audio(base64Str, onEnd) {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }
        if (!base64Str) {
            if (onEnd) onEnd();
            return;
        }

        try {
            const binary = atob(base64Str);
            const array = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                array[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([array], { type: 'audio/mp3' });
            const url = URL.createObjectURL(blob);
            
            currentAudio = new Audio(url);
            currentAudio.onended = () => {
                if (onEnd) onEnd();
                URL.revokeObjectURL(url);
            };
            currentAudio.onerror = () => {
                console.error("Audio playback error");
                if (onEnd) onEnd();
            };
            currentAudio.play().catch(e => {
                console.error("Audio play failed:", e);
                if (onEnd) onEnd();
            });
        } catch (e) {
            console.error("Base64 decode error", e);
            if (onEnd) onEnd();
        }
    }

    // ─────────────── Local TTS (Web Speech API Fallback) ───────────────
    function speakLocal(text) {
        if (!('speechSynthesis' in window) || !text) {
            OrbController.setState('idle');
            return;
        }
        OrbController.setState('speaking');
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.0;
        utter.pitch = 1.1;
        // Try to pick a nice female voice
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.name.includes('Samantha') || v.name.includes('Google UK English Female') || v.name.includes('Zira') || (v.lang === 'en-US' && v.name.toLowerCase().includes('female')));
        if (preferred) utter.voice = preferred;
        else if (voices.length > 0) utter.voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
        utter.onend = () => OrbController.setState('idle');
        utter.onerror = () => OrbController.setState('idle');
        window.speechSynthesis.speak(utter);
    }


    // ─────────────── Message Helper ───────────────
    function appendMessage(msgText, type) {
        const area = document.getElementById('transcript-area');
        if (!area || !msgText) return;

        const placeholder = area.querySelector('.empty-state');
        if (placeholder) placeholder.remove();

        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-bubble ${type}`;
        msgDiv.textContent = msgText;

        area.appendChild(msgDiv);
        area.scrollTop = area.scrollHeight;
    }


    // ─────────────── Orb Controller (Backend API) ───────────────
    const OrbController = {
        currentState: 'idle',
        container: null,
        mediaRecorder: null,
        audioChunks: [],
        lastTouchTime: 0,
        isRecording: false,

        init() {
            this.container = document.getElementById('aria-orb');
            if (!this.container) return;

            // Touch events (hold to talk)
            this.container.addEventListener('touchstart', (e) => this.handleStartTouch(e), { passive: false });
            this.container.addEventListener('touchend', (e) => this.handleStopTouch(e), { passive: false });
            this.container.addEventListener('touchcancel', (e) => this.handleStopTouch(e), { passive: false });

            // Mouse events
            this.container.addEventListener('mousedown', (e) => this.handleStartTouch(e));
            document.addEventListener('mouseup', (e) => this.handleStopTouch(e));

            this.container.style.cursor = 'pointer';
        },

        async handleStartTouch(e) {
            if (e && e.preventDefault) e.preventDefault();
            const now = Date.now();
            if (now - this.lastTouchTime < 500) return;
            this.lastTouchTime = now;

            if (this.currentState === 'idle') {
                await this.startRecording();
            } else if (this.currentState === 'speaking') {
                if (currentAudio) currentAudio.pause();
                this.setState('idle');
            }
        },

        handleStopTouch(e) {
            if (e && e.preventDefault) e.preventDefault();
            if (this.currentState === 'listening' && this.isRecording) {
                this.stopRecording();
            }
        },

        async startRecording() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                this.audioChunks = [];

                this.mediaRecorder.ondataavailable = e => {
                    if (e.data.size > 0) this.audioChunks.push(e.data);
                };

                this.mediaRecorder.onstop = async () => {
                    this.isRecording = false;
                    stream.getTracks().forEach(t => t.stop());
                    
                    if (this.audioChunks.length === 0) {
                        this.setState('idle');
                        return;
                    }
                    
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                    this.setState('thinking');
                    await this.sendAudioToBackend(audioBlob);
                };

                this.mediaRecorder.start();
                this.isRecording = true;
                this.setState('listening');
            } catch (e) {
                console.error("Mic access denied or error:", e);
                appendMessage("Please allow microphone access to talk.", 'aria-msg');
                this.setState('idle');
            }
        },

        stopRecording() {
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.stop();
            }
        },

        async sendAudioToBackend(blob) {
            try {
                const formData = new FormData();
                formData.append('audio', blob, 'recording.webm');
                formData.append('local_memories', JSON.stringify(AriaBrain.memories));
                formData.append('voice_pref', localStorage.getItem('aria_voice') || 'calm');
                
                const response = await _fetchAPI('/voice/converse', 'POST', formData, true);
                
                if (response.transcription) {
                    appendMessage(response.transcription, 'user-msg');
                }
                if (response.reply) {
                    appendMessage(response.reply, 'aria-msg');
                    // Store memory from this exchange
                    if (response.transcription) {
                        AriaBrain.storeMemory(response.transcription);
                    }
                }
                
                if (response.audio) {
                    this.setState('speaking');
                    playBase64Audio(response.audio, () => {
                        this.setState('idle');
                    });
                } else {
                    this.setState('idle');
                }
            } catch (error) {
                console.warn("Voice backend unavailable, using local brain:", error.message);
                // Fallback: inform user and use local brain
                const fallbackMsg = "I heard you! (Backend is waking up, using local mode)";
                appendMessage(fallbackMsg, 'aria-msg');
                const reply = AriaBrain.getResponse("hello");
                appendMessage(reply, 'aria-msg');
                speakLocal(reply);
            }
        },

        toggleRecord() {
            if (this.currentState === 'idle') {
                this.startRecording();
            } else if (this.currentState === 'listening') {
                this.stopRecording();
            } else if (this.currentState === 'speaking') {
                if (currentAudio) currentAudio.pause();
                this.setState('idle');
            }
        },

        toggleSpeaker() {
            if (this.currentState === 'speaking') {
                if (currentAudio) currentAudio.pause();
                this.setState('idle');
            }
        },

        setState(state) {
            if (!this.container) return;
            this.currentState = state;
            this.container.setAttribute('data-state', state);

            const visual = this.container.querySelector('.orb-visual');
            if (visual) {
                ['idle', 'listening', 'thinking', 'speaking'].forEach(s => visual.classList.remove(`orb-visual--${s}`));
                visual.classList.add(`orb-visual--${state}`);
            }

            const statusEl = document.getElementById('orb-status');
            if (statusEl) {
                const labels = {
                    idle: 'Aria is listening to the forest...',
                    listening: '🎙 Listening...',
                    thinking: '💭 Thinking...',
                    speaking: '🔊 ARIA is speaking...'
                };
                statusEl.textContent = labels[state] || labels.idle;
            }

            // Update chat view mic button if it exists
            const micBtn = document.getElementById('voice-mic-button');
            if (micBtn) {
                if (state === 'listening') {
                    micBtn.classList.add('recording');
                    micBtn.style.color = 'var(--accent-red, #ff4d4d)';
                } else {
                    micBtn.classList.remove('recording');
                    micBtn.style.color = 'inherit';
                }
            }
        }
    };


    // ─────────────── Text Chat Setup ───────────────
    function setupTextChat() {
        const chatContainer = document.querySelector('.conversation-container');
        if (!chatContainer) return;

        // Check if input bar already exists
        if (chatContainer.querySelector('.text-input-bar')) return;

        // Create text input bar
        const inputBar = document.createElement('div');
        inputBar.className = 'text-input-bar';
        inputBar.innerHTML = `
            <input type="text" class="chat-text-input" id="text-chat-input" placeholder="Type a message..." autocomplete="off">
            <button class="chat-send-btn" id="text-chat-send" aria-label="Send">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
            </button>
        `;

        // Insert before voice controls
        const voiceBar = chatContainer.querySelector('.voice-controls-bar');
        if (voiceBar) {
            chatContainer.insertBefore(inputBar, voiceBar);
        } else {
            chatContainer.appendChild(inputBar);
        }

        // Bind events
        const sendBtn = document.getElementById('text-chat-send');
        const input = document.getElementById('text-chat-input');

        const handleSend = async () => {
            const text = input.value.trim();
            if (!text) return;
            input.value = '';

            appendMessage(text, 'user-msg');
            OrbController.setState('thinking');

            try {
                const response = await _fetchAPI('/voice/converse_text', 'POST', { 
                    text: text,
                    local_memories: AriaBrain.memories,
                    voice_pref: localStorage.getItem('aria_voice') || 'calm'
                });
                
                if (response.reply) {
                    appendMessage(response.reply, 'aria-msg');
                    AriaBrain.storeMemory(text);
                }
                
                if (response.audio) {
                    OrbController.setState('speaking');
                    playBase64Audio(response.audio, () => {
                        OrbController.setState('idle');
                    });
                } else {
                    // Use browser TTS if backend didn't return audio
                    if (response.reply) speakLocal(response.reply);
                    else OrbController.setState('idle');
                }
            } catch (error) {
                console.warn("Backend unavailable, using local brain:", error.message);
                // Fallback to local AriaBrain
                const reply = AriaBrain.getResponse(text);
                appendMessage(reply, 'aria-msg');
                speakLocal(reply);
            }
        };

        if (sendBtn) sendBtn.addEventListener('click', handleSend);
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleSend();
            });
        }
    }


    // ─────────────── Filter Tabs (Memory) ───────────────
    function setupFilterTabs() {
        document.querySelectorAll('.tab-strip').forEach(strip => {
            strip.querySelectorAll('.tab-item').forEach(tab => {
                tab.addEventListener('click', () => {
                    strip.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
                    const filter = tab.textContent.trim().toLowerCase();
                    filterMemories(filter);
                });
            });
        });
    }

    function filterMemories(filter) {
        const memList = document.getElementById('memory-list');
        if (!memList) return;

        const filtered = filter === 'all' 
            ? AriaBrain.memories 
            : AriaBrain.memories.filter(m => m.category.toLowerCase() === filter);

        if (filtered.length === 0) {
            memList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🧠</div>
                    <p>No ${filter === 'all' ? '' : filter + ' '}memories yet. Start a conversation!</p>
                </div>
            `;
            return;
        }

        memList.innerHTML = filtered.slice().reverse().map(m => `
            <div class="card card--full" style="animation: fade-up 0.4s var(--ease-out) forwards;">
                <span class="memory-category">${m.category}</span>
                <p class="memory-text">${m.content}</p>
                <span class="memory-date">${m.date}</span>
            </div>
        `).join('');
    }


    // ─────────────── Action Cards ───────────────
    function setupActionCards() {
        const lastConvCard = document.getElementById('home-last-conv');
        if (lastConvCard) {
            lastConvCard.addEventListener('click', () => Navigation.navigate('view-voice'));
        }
    }


    // ─────────────── Dashboard Updates ───────────────
    function updateHomeDashboard() {
        const countEl = document.getElementById('memory-count-total');
        if (countEl) countEl.textContent = AriaBrain.memories.length;

        // Update ambient note
        const ambientEl = document.getElementById('home-ambient-note');
        if (ambientEl && AriaBrain.memories.length > 0) {
            const recent = AriaBrain.memories[AriaBrain.memories.length - 1];
            ambientEl.textContent = `ARIA remembers: "${recent.content.substring(0, 80)}..."`;
        }

        // Update last conversation preview
        const convText = document.getElementById('home-last-conv-text');
        const convTime = document.getElementById('home-last-conv-time');
        if (convText && AriaBrain.memories.length > 0) {
            const last = AriaBrain.memories[AriaBrain.memories.length - 1];
            convText.textContent = `"${last.content.substring(0, 80)}..."`;
            if (convTime) convTime.textContent = last.date;
        }
    }

    function updateSettingsProfile() {
        const nameEl = document.getElementById('settings-user-name');
        const emailEl = document.getElementById('settings-user-email');
        const avatarEl = document.getElementById('settings-avatar');
        const homeNameEl = document.getElementById('home-user-name');
        const homeEmailEl = document.getElementById('home-user-email');
        const homeAvatarEl = document.getElementById('home-user-avatar');

        const profile = AuthService.getUser();
        if (profile) {
            const name = profile.name || 'Sage Miller';
            const email = profile.email || 'Botanist & AI Mentor';
            const initial = name.charAt(0).toUpperCase();

            if (nameEl) nameEl.textContent = name;
            if (emailEl) emailEl.textContent = email || 'Botanist & AI Mentor';
            if (avatarEl) avatarEl.textContent = initial;
            if (homeNameEl) homeNameEl.textContent = name;
            if (homeEmailEl) homeEmailEl.textContent = email || 'Botanist & AI Mentor';
            if (homeAvatarEl) homeAvatarEl.textContent = initial;
        }
    }


    // ─────────────── UI Helpers ───────────────
    const UI = {
        showSignOutSheet() {
            const sheet = document.getElementById('signout-sheet');
            if (sheet) sheet.classList.add('active');
        },
        hideSignOutSheet() {
            const sheet = document.getElementById('signout-sheet');
            if (sheet) sheet.classList.remove('active');
        }
    };


    // ─────────────── Theme Toggle Button ───────────────
    function setupThemeToggle() {
        const btn = document.getElementById('btn-theme-toggle');
        if (!btn) return;
        
        const themes = ['cloud-blush', 'glacier', 'golden-hour', 'velvet-rose'];
        btn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'cloud-blush';
            const idx = themes.indexOf(current);
            const next = themes[(idx + 1) % themes.length];
            ThemeStudio.applyTheme(next);
        });
    }

    // ─────────────── Voice Selection ───────────────
    function setupVoiceSelection() {
        const container = document.getElementById('voice-options-container');
        if (!container) return;
        
        const currentVoice = localStorage.getItem('aria_voice') || 'calm';
        const buttons = container.querySelectorAll('.btn-pill');
        
        buttons.forEach(btn => {
            if (btn.dataset.voice === currentVoice) {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
            
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                localStorage.setItem('aria_voice', btn.dataset.voice);
            });
        });
    }


    // ─────────────── Init ───────────────
    document.addEventListener('DOMContentLoaded', () => {
        // Load memories
        AriaBrain.loadMemories();

        // Check auth state
        if (AuthService.isAuthenticated() && AuthService.isOnboarded()) {
            navigateAuth('view-home');
            showAppNav(true);
            Navigation.init();
            OrbController.init();
            updateHomeDashboard();
            updateSettingsProfile();
            setupActionCards();
            setupTextChat();
            setupFilterTabs();
            setupThemeToggle();
            setupVoiceSelection();
        } else if (AuthService.isAuthenticated() && !AuthService.isOnboarded()) {
            showAppNav(false);
            navigateAuth('view-onboarding');
            OnboardingController.init();
        } else {
            showAppNav(false);
        }

        AuthController.init();

        // Preload TTS voices
        if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
            window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
        }
    });

    // ─────────────── Expose to global ───────────────
    const _originalEnterApp = window.enterApp;
    window.enterApp = function () {
        if (typeof _originalEnterApp === 'function') _originalEnterApp();
        else {
            navigateAuth('view-home');
            showAppNav(true);
        }
        Navigation.init();
        OrbController.init();
        updateHomeDashboard();
        updateSettingsProfile();
        setupActionCards();
        setupTextChat();
        setupFilterTabs();
        setupThemeToggle();
        setupVoiceSelection();
    };

    window.orbController = OrbController;
    window.OrbController = OrbController;
    window.Navigation = Navigation;
    window.UI = UI;
})();
