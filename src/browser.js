/**
 * GoWM - Browser-specific exports
 * 
 * Browser-optimized version of GoWM for client-side applications.
 * Provides ES6 module exports and browser-compatible functionality.
 * 
 * @author devbyben
 * @license MIT
 */

// Browser-specific implementation using unified system
(function (global) {
    'use strict';

    // Check if we're in a module system (CommonJS) or browser global
    const isModule = typeof module !== 'undefined' && module.exports;
    const isES6 = typeof window !== 'undefined' && typeof window.GoWM === 'undefined';

    // Import classes - adapt based on environment
    let GoWM, UnifiedWasmLoader, UnifiedWasmBridge;

    if (isModule) {
        // CommonJS environment (Node.js with browser bundle)
        GoWM = require('./core/gowm');
        UnifiedWasmLoader = require('./loaders/unified-loader');
        UnifiedWasmBridge = require('./bridges/unified-bridge');
    } else {
        // Browser global environment - classes should be available
        GoWM = global.GoWM;
        UnifiedWasmLoader = global.UnifiedWasmLoader;
        UnifiedWasmBridge = global.UnifiedWasmBridge;
    }

    // Create main instance for browser
    const gowm = new GoWM();

    // Browser-specific optimizations
    gowm.isBrowser = true;

    // Override loadFromFile to throw error in browser
    const originalLoadFromFile = gowm.loadFromFile;
    gowm.loadFromFile = function (filePath, options = {}) {
        throw new Error('loadFromFile is not available in browser environment. Use loadFromUrl or loadFromGitHub instead.');
    };

    // Export object
    const GoWMBrowser = {
        // Main instance
        default: gowm,

        // Classes
        GoWM,
        UnifiedWasmLoader,
        UnifiedWasmBridge,

        // Legacy class exports for backward compatibility
        WasmLoader: UnifiedWasmLoader,
        WasmBridge: UnifiedWasmBridge,

        // Convenience methods bound to instance
        load: gowm.load.bind(gowm),
        loadFromGitHub: gowm.loadFromGitHub.bind(gowm),
        loadFromUrl: gowm.loadFromUrl.bind(gowm),
        get: gowm.get.bind(gowm),
        unload: gowm.unload.bind(gowm),
        unloadAll: gowm.unloadAll.bind(gowm),
        listModules: gowm.listModules.bind(gowm),
        getStats: gowm.getStats.bind(gowm),
        isLoaded: gowm.isLoaded.bind(gowm),
        getTotalMemoryUsage: gowm.getTotalMemoryUsage.bind(gowm),
        testAll: gowm.testAll.bind(gowm),
        getHelp: gowm.getHelp.bind(gowm),

        // Version info
        version: '1.1.0-browser',

        // Create new instance
        create: () => new GoWM()
    };

    // Export based on environment
    if (isModule) {
        // CommonJS export
        module.exports = GoWMBrowser;
    } else {
        // Browser global registration
        global.GoWM = gowm;
        global.WasmLoader = UnifiedWasmLoader;
        global.WasmBridge = UnifiedWasmBridge;
        global.GoWMBrowser = GoWMBrowser;

        // Also support ES6 imports if available
        if (typeof window !== 'undefined' && typeof window.define === 'function' && window.define.amd) {
            // AMD support
            window.define('gowm', [], function () {
                return GoWMBrowser;
            });
        }
    }

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
