// =============================================
// ARIA — Auth & Onboarding (Phase 1)
// Mock auth service, form handling, onboarding
// =============================================

// ─────────────── Backend API Auth Service ───────────────

const AuthService = (() => {
    'use strict';

    const API_URL = 'https://aria-xot7.onrender.com/api/v1';
    
    // Supabase Auth Integration
    const SUPABASE_URL = 'https://wevplvryoibvotbipagw.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndldnBsdnJ5b2lidm90YmlwYWd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMzY1NTAsImV4cCI6MjA5MjYxMjU1MH0.vt85YB3hAj_hbm0tc2SHr0zUbj4H0JLKd1p2RC1wqj4'; // Correct Public Anon Key
    const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

    // We keep storing basic info in localStorage for offline PWA capabilities
    const USER_KEY = 'aria_user';
    const SESSION_KEY = 'aria_session';
    const ONBOARDED_KEY = 'aria_onboarded';
    const PREFS_KEY = 'aria_preferences';

    function getSession() {
        return localStorage.getItem(SESSION_KEY);
    }

    // Auto-handle redirect from Google
    if (supabase) {
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                console.log("Supabase OAuth Success:", session);
                
                // Set local storage so isAuthenticated() becomes true immediately
                localStorage.setItem(SESSION_KEY, session.access_token);
                
                // If we don't have a user object yet, or it's a supabase user, try to get/create backend profile
                const currentUser = localStorage.getItem(USER_KEY);
                if (!currentUser || event === 'SIGNED_IN') {
                    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
                    
                    const meRes = await _fetchAPI('/user/me', 'GET');
                    if (meRes.success) {
                        localStorage.setItem(USER_KEY, JSON.stringify(meRes.data.user));
                        if (meRes.data.settings && Object.keys(meRes.data.settings).length > 0) {
                            localStorage.setItem(ONBOARDED_KEY, 'true');
                        }
                    }
                }
                
                // Only reload if we are still on an auth view
                const activeView = document.querySelector('.view.active');
                if (activeView && activeView.id.startsWith('view-auth')) {
                    window.location.reload();
                }
            }
        });
    }

    async function _fetchAPI(endpoint, method = 'GET', body = null) {
        const headers = { 
            'Content-Type': 'application/json',
        };
        const sessionToken = getSession();
        
        if (sessionToken) {
            headers['Authorization'] = `Bearer ${sessionToken}`;
        }
        
        const config = { method, headers };
        if (body) {
            config.body = JSON.stringify(body);
        }

        // Add timeout for sleeping Render instances
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        config.signal = controller.signal;

        try {
            const res = await fetch(`${API_URL}${endpoint}`, config);
            clearTimeout(timeoutId);

            const text = await res.text();
            let data;
            try {
                data = text ? JSON.parse(text) : {};
            } catch (e) {
                return { success: false, error: 'Server returned invalid response. It may be starting up — try again in a moment.' };
            }

            if (!res.ok) {
                throw new Error(data.detail || data.message || 'API Error');
            }
            return { success: true, data };
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                return { success: false, error: 'Server is waking up (free Render tier sleeps after inactivity). Please try again in 30 seconds.' };
            }
            return { success: false, error: err.message || 'Network error' };
        }
    }

    return {
        getUser() {
            const d = localStorage.getItem(USER_KEY);
            return d ? JSON.parse(d) : null;
        },

        isAuthenticated() {
            return !!getSession() && !!this.getUser();
        },

        isOnboarded() {
            return localStorage.getItem(ONBOARDED_KEY) === 'true';
        },

        async login(email, password) {
            const res = await _fetchAPI('/auth/login', 'POST', { email, password });
            if (res.success) {
                // Store JWT token and user info
                localStorage.setItem(SESSION_KEY, res.data.session.access_token);
                localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
                
                // Fetch preferences to see if onboarded
                const meRes = await _fetchAPI('/user/me', 'GET');
                if (meRes.success && meRes.data.settings && Object.keys(meRes.data.settings).length > 0) {
                     localStorage.setItem(ONBOARDED_KEY, 'true');
                     localStorage.setItem(PREFS_KEY, JSON.stringify({
                         theme: meRes.data.settings.theme,
                         language: meRes.data.settings.language,
                         voice: meRes.data.settings.voice,
                         consent: meRes.data.consent,
                         name: meRes.data.user.name
                     }));
                }
            }
            return res;
        },

        async signInWithGoogle() {
            if (!supabase) {
                alert("Supabase client not initialized. Check your credentials.");
                return;
            }
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) {
                console.error("Google Auth Error:", error.message);
                alert("Google Sign-In failed: " + error.message);
            }
        },

        async signup(name, email, password) {
            const res = await _fetchAPI('/auth/signup', 'POST', { name, email, password });
            if (res.success) {
                if (res.data.session) {
                   localStorage.setItem(SESSION_KEY, res.data.session.access_token);
                }
                localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
            }
            return res;
        },

        async forgotPassword(email) {
            // Future implementation in backend
            return new Promise(resolve => setTimeout(() => resolve({ success: true }), 1500));
        },

        async savePreferences(data) {
            // Update local first for instant UI response
            localStorage.setItem(PREFS_KEY, JSON.stringify(data));
            localStorage.setItem(ONBOARDED_KEY, 'true');
            
            const user = this.getUser();
            if (user && data.name) {
                user.name = data.name;
                localStorage.setItem(USER_KEY, JSON.stringify(user));
            }
            
            // Sync with backend async (only if we have a token and a real user)
            const session = getSession();
            if (session && user && !user.isGuest) {
                _fetchAPI('/user/preferences', 'POST', data).catch(e => console.warn('Sync failed', e));
            }
        },

        getPreferences() {
            const d = localStorage.getItem(PREFS_KEY);
            return d ? JSON.parse(d) : null;
        },

        guestMode() {
            const user = { name: 'Guest', email: '', isGuest: true, createdAt: Date.now() };
            localStorage.setItem(USER_KEY, JSON.stringify(user));
            localStorage.setItem(ONBOARDED_KEY, 'true');
        },

        async logout() {
            if (getSession() && !this.getUser()?.isGuest) {
                await _fetchAPI('/auth/logout', 'POST');
            }
            localStorage.removeItem(USER_KEY);
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(ONBOARDED_KEY);
            localStorage.removeItem(PREFS_KEY);
        }
    };
})();


// ─────────────── Auth UI Controller ───────────────

const AuthController = (() => {
    'use strict';

    function init() {
        console.log('[ARIA] AuthController Initializing...');
        bindForms();
        bindPasswordToggles();
        bindPasswordStrength();
    }

    function bindForms() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.removeEventListener('submit', handleLogin);
            loginForm.addEventListener('submit', handleLogin);
        }

        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.removeEventListener('submit', handleSignup);
            signupForm.addEventListener('submit', handleSignup);
        }

        const forgotForm = document.getElementById('forgot-form');
        if (forgotForm) {
            forgotForm.removeEventListener('submit', handleForgot);
            forgotForm.addEventListener('submit', handleForgot);
        }
    }

    function bindPasswordToggles() {
        document.querySelectorAll('.password-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = btn.closest('.input-with-toggle').querySelector('input');
                const isHidden = input.type === 'password';
                input.type = isHidden ? 'text' : 'password';
                btn.querySelector('.eye-open').style.display = isHidden ? 'none' : 'block';
                btn.querySelector('.eye-closed').style.display = isHidden ? 'block' : 'none';
            });
        });
    }

    function bindPasswordStrength() {
        const input = document.getElementById('signup-password');
        if (input) {
            input.addEventListener('input', () => {
                const fill = document.getElementById('pw-strength-fill');
                if (!fill) return;
                const v = input.value;
                let s = 0;
                if (v.length >= 6) s++;
                if (v.length >= 10) s++;
                if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
                if (/[0-9]/.test(v)) s++;
                if (/[^A-Za-z0-9]/.test(v)) s++;
                const levels = ['', 'weak', 'fair', 'good', 'good', 'strong'];
                fill.setAttribute('data-strength', v.length === 0 ? '' : levels[s]);
            });
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        const email = form.querySelector('[name="email"]').value;
        const password = form.querySelector('[name="password"]').value;
        const btn = form.querySelector('.btn-primary');

        setLoading(btn, true);
        clearMessage('login-message');

        const result = await AuthService.login(email, password);
        setLoading(btn, false);

        if (result.success) {
            showMessage('login-message', 'Welcome back!', 'success');
            setTimeout(() => {
                if (AuthService.isOnboarded()) {
                    enterApp();
                } else {
                    navigateAuth('view-onboarding');
                    OnboardingController.init();
                }
            }, 700);
        } else {
            showMessage('login-message', result.error, 'error');
        }
    }

    async function handleSignup(e) {
        e.preventDefault();
        const form = e.target;
        const name = form.querySelector('[name="name"]').value;
        const email = form.querySelector('[name="email"]').value;
        const password = form.querySelector('[name="password"]').value;
        const terms = form.querySelector('[name="terms"]');
        const btn = form.querySelector('.btn-primary');

        if (terms && !terms.checked) {
            showMessage('signup-message', 'Please accept the terms to continue', 'error');
            return;
        }

        setLoading(btn, true);
        clearMessage('signup-message');

        const result = await AuthService.signup(name, email, password);
        setLoading(btn, false);

        if (result.success) {
            showMessage('signup-message', 'Welcome aboard!', 'success');
            setTimeout(() => {
                navigateAuth('view-onboarding');
                OnboardingController.init();
            }, 700);
        } else {
            showMessage('signup-message', result.error, 'error');
        }
    }

    async function handleForgot(e) {
        e.preventDefault();
        const form = e.target;
        const email = form.querySelector('[name="email"]').value;
        const btn = form.querySelector('.btn-primary');

        setLoading(btn, true);
        clearMessage('forgot-message');

        const result = await AuthService.forgotPassword(email);
        setLoading(btn, false);

        if (result.success) {
            showMessage('forgot-message', 'Reset link sent! Check your email.', 'success');
        } else {
            showMessage('forgot-message', result.error, 'error');
        }
    }

    // Loading
    function setLoading(btn, loading) {
        btn.classList.toggle('btn-loading', loading);
    }

    // Messages
    function showMessage(id, text, type) {
        const el = document.getElementById(id);
        if (!el) return;
        el.className = `form-message visible ${type}`;
        const icon = type === 'error' ? '⚠' : '✓';
        el.innerHTML = `<span class="form-message__icon">${icon}</span> ${text}`;
    }

    function clearMessage(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.className = 'form-message';
        el.innerHTML = '';
    }

    return { init };
})();


// ─────────────── Onboarding Controller ───────────────

const OnboardingController = (() => {
    'use strict';

    let step = 1;
    const total = 5;
    const data = {
        name: '',
        language: 'en',
        voice: 'calm',
        theme: 'cloud-blush',
        consent: { conversations: true, preferences: true, emotional: true, voice: false }
    };

    function init() {
        step = 1;

        // Pre-fill name from signup
        const user = AuthService.getUser();
        if (user && user.name && user.name !== 'Guest') {
            data.name = user.name;
            const nameInput = document.getElementById('onboarding-name');
            if (nameInput) nameInput.value = user.name;
        }

        bindEvents();
        updateUI();
    }

    function bindEvents() {
        // Name input
        const nameInput = document.getElementById('onboarding-name');
        if (nameInput) {
            nameInput.addEventListener('input', (e) => { data.name = e.target.value; });
        }

        // Selector cards
        document.querySelectorAll('.selector-card[data-category]').forEach(card => {
            card.removeEventListener('click', handleCardClick);
            card.addEventListener('click', handleCardClick);
        });

        // Theme cards
        document.querySelectorAll('.theme-card[data-theme]').forEach(card => {
            card.removeEventListener('click', handleThemeClick);
            card.addEventListener('click', handleThemeClick);
        });

        // Consent toggles
        document.querySelectorAll('.consent-toggle').forEach(toggle => {
            toggle.removeEventListener('click', handleConsentClick);
            toggle.addEventListener('click', handleConsentClick);
        });
    }

    function handleCardClick(e) {
        const card = e.currentTarget;
        const category = card.dataset.category;
        const value = card.dataset.value;
        card.parentElement.querySelectorAll('.selector-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        data[category] = value;
    }

    function handleThemeClick(e) {
        const card = e.currentTarget;
        document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        data.theme = card.dataset.theme;
        // Live preview
        if (typeof ThemeStudio !== 'undefined') {
            ThemeStudio.applyTheme(card.dataset.theme);
        }
    }

    function handleConsentClick(e) {
        const toggle = e.currentTarget;
        const key = toggle.dataset.consent;
        const checked = toggle.getAttribute('aria-checked') === 'true';
        toggle.setAttribute('aria-checked', String(!checked));
        data.consent[key] = !checked;
    }

    function next() {
        if (step === 1 && !data.name.trim()) {
            const input = document.getElementById('onboarding-name');
            if (input) { input.focus(); input.classList.add('input-error'); }
            return;
        }
        if (step >= total) {
            complete();
            return;
        }
        step++;
        updateUI();
    }

    function prev() {
        if (step <= 1) {
            navigateAuth('view-auth-landing');
            return;
        }
        step--;
        updateUI();
    }

    function updateUI() {
        // Progress
        const fill = document.getElementById('ob-progress-fill');
        const label = document.getElementById('ob-progress-label');
        if (fill) fill.style.width = `${(step / total) * 100}%`;
        if (label) label.textContent = `${step} of ${total}`;

        // Steps
        document.querySelectorAll('.onboarding-step').forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.step) === step);
        });
    }

    function complete() {
        try { AuthService.savePreferences(data); } catch(e) { console.warn('Prefs save error:', e); }

        // Apply theme
        try {
            if (typeof ThemeStudio !== 'undefined' && data.theme) {
                ThemeStudio.applyTheme(data.theme);
            }
        } catch(e) { console.warn('Theme apply error:', e); }

        document.querySelectorAll('.onboarding-step').forEach(s => s.classList.remove('active'));
        const completion = document.getElementById('ob-completion');
        if (completion) completion.classList.add('active');

        const fill = document.getElementById('ob-progress-fill');
        if (fill) fill.style.width = '100%';
    }

    function finish() {
        enterApp();
    }

    return { init, next, prev, finish };
})();


// ─────────────── Auth Navigation Helpers ───────────────

function navigateAuth(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0 });
}

function showAppNav(show) {
    const nav = document.getElementById('app-nav');
    const content = document.getElementById('app-content');
    if (nav) nav.style.display = show ? 'flex' : 'none';
    if (content) content.style.paddingBottom = show ? '' : '0';
}

function enterApp() {
    navigateAuth('view-home');
    showAppNav(true);

    // Update greeting with user name
    const user = AuthService.getUser();
    const nameEl = document.querySelector('.greeting-name');
    if (nameEl && user && user.name && !user.isGuest) {
        nameEl.textContent = user.name;
    }
}

function enterAsGuest() {
    AuthService.guestMode();
    enterApp();
}

function logoutUser() {
    AuthService.logout();
    showAppNav(false);
    navigateAuth('view-auth-landing');
    location.reload(); // Hard refresh to clear all states
}

window.Auth = {
    signOut: logoutUser
};

// App init is handled by app.js — no duplicate DOMContentLoaded here
