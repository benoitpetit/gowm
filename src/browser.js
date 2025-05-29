// Version navigateur de GOWM sans dépendances Node.js
import WasmLoader from './loader-browser.js';
import WasmBridge from './bridge-browser.js';

class GoWM {
    constructor() {
        this.loader = new WasmLoader();
        this.modules = new Map();
    }

    async load(wasmPath, options = {}) {
        const module = await this.loader.loadModule(wasmPath, options);
        const bridge = new WasmBridge(module, options);

        const moduleId = options.name || 'default';
        this.modules.set(moduleId, { module, bridge });

        return bridge;
    }

    get(name = 'default') {
        const entry = this.modules.get(name);
        return entry ? entry.bridge : null;
    }

    async loadFromNPM(packageName, options = {}) {
        // Pour le navigateur, on assume que le fichier est dans /wasm/{packageName}.wasm
        const wasmPath = `/wasm/${packageName}.wasm`;
        return this.load(wasmPath, { ...options, name: packageName });
    }

    unload(name = 'default') {
        const entry = this.modules.get(name);
        if (entry) {
            entry.bridge.cleanup();
            this.loader.unloadModule(name);
            return this.modules.delete(name);
        }
        return false;
    }

    listModules() {
        return Array.from(this.modules.keys());
    }

    getStats() {
        const stats = {};
        for (const [name, entry] of this.modules) {
            stats[name] = entry.bridge.getStats();
        }
        return stats;
    }

    unloadAll() {
        for (const name of this.modules.keys()) {
            this.unload(name);
        }
    }
}

// Instance globale
const gowm = new GoWM();

// API simplifiée
export const load = (wasmPath, options) => gowm.load(wasmPath, options);
export const get = (name) => gowm.get(name);
export const loadFromNPM = (packageName, options) => gowm.loadFromNPM(packageName, options);
export const unload = (name) => gowm.unload(name);
export const listModules = () => gowm.listModules();
export const getStats = () => gowm.getStats();
export const unloadAll = () => gowm.unloadAll();

// Export des classes
export { GoWM, WasmLoader, WasmBridge };

// Export par défaut
export default gowm;
