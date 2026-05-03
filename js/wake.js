/* =============================================
   ARIA — Wake Word Engine v2.0
   Stub — no backend needed
   ============================================= */

// Wake word detection is disabled for the demo.
// The orb uses hold-to-talk instead.

window.wakeEngine = {
    settings: { wakeWordEnabled: false },
    start() { console.log('[ARIA] Wake word disabled in demo mode.'); },
    stop() {}
};
