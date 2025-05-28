const WasmLoader = require('./loader');
const WasmBridge = require('./bridge');

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
        try {
            // Essayer de résoudre le chemin vers le fichier WASM
            let packagePath;

            try {
                // Essayer main.wasm en premier
                packagePath = require.resolve(`${packageName}/main.wasm`);
            } catch (e) {
                try {
                    // Essayer index.wasm
                    packagePath = require.resolve(`${packageName}/index.wasm`);
                } catch (e2) {
                    try {
                        // Essayer le nom du package avec .wasm
                        packagePath = require.resolve(`${packageName}/${packageName}.wasm`);
                    } catch (e3) {
                        throw new Error(`Could not find WASM file for package ${packageName}. Tried main.wasm, index.wasm, and ${packageName}.wasm`);
                    }
                }
            }

            return this.load(packagePath, { ...options, name: packageName });
        } catch (error) {
            throw new Error(`Failed to load NPM package ${packageName}: ${error.message}`);
        }
    }

    unload(name = 'default') {
        const entry = this.modules.get(name);
        if (entry) {
            // Nettoyer les ressources
            this.loader.unloadModule(name);
        }
        return this.modules.delete(name);
    }

    // Obtenir la liste des modules chargés
    listModules() {
        return Array.from(this.modules.keys());
    }

    // Obtenir les statistiques de tous les modules
    getStats() {
        const stats = {};
        for (const [name, entry] of this.modules) {
            stats[name] = entry.bridge.getStats();
        }
        return stats;
    }

    // Nettoyer tous les modules
    unloadAll() {
        for (const name of this.modules.keys()) {
            this.unload(name);
        }
    }
}

// Instance singleton pour l'API simplifiée
const gowm = new GoWM();

// API simplifiée pour usage direct
module.exports = {
    GoWM,
    load: (wasmPath, options) => gowm.load(wasmPath, options),
    get: (name) => gowm.get(name),
    loadFromNPM: (packageName, options) => gowm.loadFromNPM(packageName, options),
    unload: (name) => gowm.unload(name),
    listModules: () => gowm.listModules(),
    getStats: () => gowm.getStats(),
    unloadAll: () => gowm.unloadAll()
};
