/**
 * GoWM - Browser-specific exports
 * 
 * Browser-optimized version of GoWM for client-side applications.
 * Provides ES6 module exports and browser-compatible functionality.
 * 
 * @author devbyben
 * @license MIT
 */

// Import core GoWM functionality
import { GoWM } from './index.js';

/**
 * GoWM class for browser environments
 * Extends the base GoWM functionality with browser-specific optimizations
 */
class BrowserGoWM extends GoWM {
    constructor() {
        super();
        // Browser-specific initialization
        this.isBrowser = true;
    }

    /**
     * Legacy NPM loading method for browsers
     * @deprecated This method is deprecated and will be removed in future versions. Use loadFromGitHub instead.
     * @param {string} packageName - NPM package name
     * @param {Object} [options={}] - Loading options
     * @returns {Promise<WasmBridge>} Promise that resolves to a WasmBridge instance
     * @throws {Error} If package loading fails or is not supported in browser
     */
    async loadFromNPM(packageName, options = {}) {
        console.warn('⚠️  WARNING: loadFromNPM is deprecated and will be removed in a future version. Use loadFromGitHub instead for better reliability and performance.');
        console.warn('⚠️  NOTE: NPM loading in browser environments is not recommended. Consider using loadFromGitHub instead.');
        
        // In browser environments, NPM loading is not directly supported
        // This method is kept for compatibility but will throw an error
        throw new Error('NPM loading is not supported in browser environments. Please use loadFromGitHub instead.');
    }
}

// Create singleton instance for browser usage
const gowm = new BrowserGoWM();

/**
 * ES6 module exports for browser environments
 * Provides both named exports and default export for maximum compatibility
 */

// Core class export
export { BrowserGoWM as GoWM };

// Primary API functions
export const load = (wasmPath, options) => gowm.load(wasmPath, options);
export const get = (name) => gowm.get(name);
export const loadFromGitHub = (githubRepo, options) => gowm.loadFromGitHub(githubRepo, options);

// Deprecated functions (kept for backward compatibility)
/** @deprecated Use loadFromGitHub instead */
export const loadFromNPM = (packageName, options) => gowm.loadFromNPM(packageName, options);

// Utility functions
export const unload = (name) => gowm.unload(name);
export const listModules = () => gowm.listModules();
export const getStats = () => gowm.getStats();
export const unloadAll = () => gowm.unloadAll();
export const isLoaded = (name) => gowm.isLoaded(name);
export const getTotalMemoryUsage = () => gowm.getTotalMemoryUsage();

// Default export for convenience
export default {
    GoWM: BrowserGoWM,
    load,
    get,
    loadFromGitHub,
    loadFromNPM, // Deprecated
    unload,
    listModules,
    getStats,
    unloadAll,
    isLoaded,
    getTotalMemoryUsage
};
