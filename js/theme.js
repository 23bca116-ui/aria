/* =============================================
   ARIA — Theme & Typography Manager v2.0
   4 Mesmerising Themes with Live Previews
   ============================================= */

const ThemeStudio = (function() {
    const THEMES = [
        {
            id: 'cloud-blush',
            name: 'Cloud Blush',
            desc: 'Soft Pink',
            bg: '#F5EDE8',
            primary: '#A37E84',
            accent: '#CDADAB',
            swatches: ['#A37E84', '#CDADAB', '#EBD7CE', '#917F88', '#836871']
        },
        {
            id: 'glacier',
            name: 'Glacier',
            desc: 'Cool Blue',
            bg: '#E8F2F6',
            primary: '#447F98',
            accent: '#B9DBE1',
            swatches: ['#447F98', '#629BB5', '#DADEE1', '#B9DBE1', '#D6EBF3']
        },
        {
            id: 'golden-hour',
            name: 'Golden Hour',
            desc: 'Warm Gold',
            bg: '#F7EEDC',
            primary: '#9F6920',
            accent: '#E9C579',
            swatches: ['#462506', '#9F6920', '#DAA755', '#E9C579', '#F1DEA8']
        },
        {
            id: 'velvet-rose',
            name: 'Velvet Rose',
            desc: 'Dark Cherry',
            bg: '#190A0E',
            primary: '#F15A7E',
            accent: '#E6258A',
            swatches: ['#190A0E', '#A0163A', '#F15A7E', '#E6258A', '#B59CB6']
        }
    ];

    const FONTS = [
        { id: 'outfit', name: 'Outfit', family: "'Outfit', sans-serif", sample: 'Aa' },
        { id: 'inter', name: 'Inter', family: "'Inter', sans-serif", sample: 'Aa' },
        { id: 'playfair', name: 'Playfair', family: "'Playfair Display', serif", sample: 'Aa' },
        { id: 'lora', name: 'Lora', family: "'Lora', serif", sample: 'Aa' }
    ];

    function render() {
        const themeGrid = document.getElementById('theme-grid');
        const fontGrid = document.getElementById('font-grid');

        if (!themeGrid || !fontGrid) return;

        const currentTheme = localStorage.getItem('aria_theme') || 'cloud-blush';
        const currentFont = localStorage.getItem('aria_font') || 'outfit';

        // Render Theme Cards
        themeGrid.innerHTML = THEMES.map(t => `
            <div class="theme-card ${t.id === currentTheme ? 'active' : ''}" 
                 onclick="ThemeStudio.applyTheme('${t.id}')">
                <div class="theme-preview" style="background: ${t.bg};">
                    <div class="theme-swatches">
                        ${t.swatches.map(s => `<div class="theme-swatch" style="background:${s}"></div>`).join('')}
                    </div>
                </div>
                <div class="theme-card__info">
                    <span class="theme-card__name">${t.name}</span>
                    <span class="theme-card__desc">${t.desc}</span>
                </div>
            </div>
        `).join('');

        // Render Font Cards
        fontGrid.innerHTML = FONTS.map(f => `
            <div class="font-card ${f.id === currentFont ? 'active' : ''}" 
                 onclick="ThemeStudio.applyFont('${f.id}')">
                <div class="font-sample" style="font-family: ${f.family}">${f.sample}</div>
                <span class="font-card__name">${f.name}</span>
            </div>
        `).join('');
    }

    function applyTheme(themeId) {
        const theme = THEMES.find(t => t.id === themeId);
        if (!theme) return;

        document.documentElement.setAttribute('data-theme', themeId);
        localStorage.setItem('aria_theme', themeId);

        // Update meta theme color
        const meta = document.getElementById('meta-theme-color');
        if (meta) meta.setAttribute('content', theme.bg);

        // Orb pulse feedback
        const orb = document.querySelector('.orb-core');
        if (orb) {
            orb.style.transition = 'none';
            orb.style.transform = 'scale(1.3)';
            orb.style.filter = 'brightness(1.5)';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    orb.style.transition = 'all 0.8s var(--ease-out)';
                    orb.style.transform = 'scale(1)';
                    orb.style.filter = 'brightness(1)';
                });
            });
        }

        // Update label in settings
        const themeLabel = document.getElementById('current-theme-label');
        if (themeLabel) themeLabel.textContent = theme.name;

        render();
    }

    function applyFont(fontId) {
        const font = FONTS.find(f => f.id === fontId);
        if (!font) return;

        document.documentElement.style.setProperty('--font-display', font.family);
        document.documentElement.style.setProperty('--font-body', font.family);
        localStorage.setItem('aria_font', fontId);
        render();
    }

    function init() {
        const savedTheme = localStorage.getItem('aria_theme') || 'cloud-blush';
        const savedFont = localStorage.getItem('aria_font') || 'outfit';

        document.documentElement.setAttribute('data-theme', savedTheme);
        applyFont(savedFont);
    }

    return { render, applyTheme, applyFont, init };
})();

window.ThemeStudio = ThemeStudio;
document.addEventListener('DOMContentLoaded', ThemeStudio.init);
