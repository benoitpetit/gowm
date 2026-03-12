const GoWM = require('./core/gowm');
const UnifiedWasmLoader = require('./loaders/unified-loader');
const UnifiedWasmBridge = require('./bridges/unified-bridge');
const WasmWorkerManager = require('./core/wasm-worker');
const { generateTypes, generateTypesFromGitHub } = require('./tools/type-generator');

// Import error classes and codes
const { GoWMError, ErrorCodes } = UnifiedWasmBridge;

// Create main instance
const gowm = new GoWM();

// Detect browser environment
const isBrowser = typeof window !== 'undefined';

// Export both the instance and the classes for advanced usage
// Expose to browser global scope
if (isBrowser && window) {
    window.GoWM = GoWM;
    window.UnifiedWasmLoader = UnifiedWasmLoader;
    window.UnifiedWasmBridge = UnifiedWasmBridge;
    window.WasmWorkerManager = WasmWorkerManager;
    window.Gowm = gowm; // Legacy lowercase
}

module.exports = {
    // Main GoWM instance (default export)
    default: gowm,

    // Backward compatibility - export main methods directly
    load: gowm.load.bind(gowm),
    loadFromGitHub: gowm.loadFromGitHub.bind(gowm),
    loadFromUrl: gowm.loadFromUrl.bind(gowm),
    loadFromFile: gowm.loadFromFile.bind(gowm),
    loadFromNPM: gowm.loadFromNPM.bind(gowm), // deprecated
    loadInWorker: gowm.loadInWorker.bind(gowm),
    get: gowm.get.bind(gowm),
    unload: gowm.unload.bind(gowm),
    unloadAll: gowm.unloadAll.bind(gowm),
    listModules: gowm.listModules.bind(gowm),
    getStats: gowm.getStats.bind(gowm),
    isLoaded: gowm.isLoaded.bind(gowm),
    getTotalMemoryUsage: gowm.getTotalMemoryUsage.bind(gowm),
    testAll: gowm.testAll.bind(gowm),
    getHelp: gowm.getHelp.bind(gowm),
    clearCache: gowm.clearCache.bind(gowm),
    getModuleMetadata: gowm.getModuleMetadata.bind(gowm),
    describeFunction: gowm.describeFunction.bind(gowm),

    // Classes for advanced usage
    GoWM,
    UnifiedWasmLoader,
    UnifiedWasmBridge,
    WasmWorkerManager,

    // Legacy class exports for backward compatibility
    WasmLoader: UnifiedWasmLoader,
    WasmBridge: UnifiedWasmBridge,
    WasmWorker: WasmWorkerManager,

    // Type generator
    generateTypes,
    generateTypesFromGitHub,

    // Error handling
    GoWMError,
    ErrorCodes,

    // Version info (from package.json)
    version: require('../package.json').version,

    // Create new instance with custom options
    create: (options) => new GoWM(options)
};
