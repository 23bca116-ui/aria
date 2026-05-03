/* =============================================
   ARIA — Memory Controller v2.0
   Local-only memory system (no backend needed)
   ============================================= */

const MemoryController = (() => {
    'use strict';

    // Memory is now handled by AriaBrain in app.js
    // This file provides the MemoryUI interface for compatibility

    return {
        refresh() {
            // Trigger memory UI update from AriaBrain
            if (window.AriaBrain) {
                window.AriaBrain.updateMemoryUI();
            }
        }
    };
})();

window.MemoryUI = MemoryController;
