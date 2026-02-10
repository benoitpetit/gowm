/**
 * GoWM - ESM wrapper
 * 
 * Provides proper ES Module named exports for Node.js ESM consumers.
 * Wraps the CommonJS module to enable `import { loadFromGitHub } from 'gowm'`.
 */
import gowmModule from './index.js';

export const {
    load,
    loadFromGitHub,
    loadFromUrl,
    loadFromFile,
    loadFromNPM,
    get,
    unload,
    unloadAll,
    listModules,
    getStats,
    isLoaded,
    getTotalMemoryUsage,
    testAll,
    getHelp,
    clearCache,
    getModuleMetadata,
    describeFunction,
    GoWM,
    UnifiedWasmLoader,
    UnifiedWasmBridge,
    WasmLoader,
    WasmBridge,
    generateTypes,
    generateTypesFromGitHub,
    GoWMError,
    ErrorCodes,
    version,
    create
} = gowmModule;

export default gowmModule.default;
