const GoWM = require('./core/gowm');
const UnifiedWasmLoader = require('./loaders/unified-loader');
const UnifiedWasmBridge = require('./bridges/unified-bridge');

// Create main instance
const gowm = new GoWM();

// Export both the instance and the classes for advanced usage
module.exports = {
    // Main GoWM instance (default export)
    default: gowm,

    // Backward compatibility - export main methods directly
    load: gowm.load.bind(gowm),
    loadFromGitHub: gowm.loadFromGitHub.bind(gowm),
    loadFromUrl: gowm.loadFromUrl.bind(gowm),
    loadFromFile: gowm.loadFromFile.bind(gowm),
    loadFromNPM: gowm.loadFromNPM.bind(gowm), // deprecated
    get: gowm.get.bind(gowm),
    unload: gowm.unload.bind(gowm),
    unloadAll: gowm.unloadAll.bind(gowm),
    listModules: gowm.listModules.bind(gowm),
    getStats: gowm.getStats.bind(gowm),
    isLoaded: gowm.isLoaded.bind(gowm),
    getTotalMemoryUsage: gowm.getTotalMemoryUsage.bind(gowm),
    testAll: gowm.testAll.bind(gowm),
    getHelp: gowm.getHelp.bind(gowm),

    // Classes for advanced usage
    GoWM,
    UnifiedWasmLoader,
    UnifiedWasmBridge,

    // Legacy class exports for backward compatibility
    WasmLoader: UnifiedWasmLoader,
    WasmBridge: UnifiedWasmBridge,

    // Version info
    version: '1.1.0',

    // Create new instance
    create: () => new GoWM()
};
