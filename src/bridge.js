class WasmBridge {
    constructor(wasmModule, options = {}) {
        this.module = wasmModule;
        this.callbacks = new Map();
        this.name = options.name || 'unnamed';
    }

    // Appel de fonction avec gestion d'erreurs
    call(funcName, ...args) {
        try {
            // Vérifier d'abord dans les exports WASM
            if (this.module.exports && this.module.exports[funcName]) {
                return this.module.exports[funcName](...args);
            }
            // Puis dans les fonctions globales JavaScript (pour Go WASM)
            else if (globalThis[funcName] && typeof globalThis[funcName] === 'function') {
                return globalThis[funcName](...args);
            }
            else {
                throw new Error(`Function ${funcName} not found`);
            }
        } catch (error) {
            throw new Error(`Error calling ${funcName}: ${error.message}`);
        }
    }

    // Appel asynchrone avec promesses
    async callAsync(funcName, ...args) {
        return new Promise((resolve, reject) => {
            try {
                const result = this.call(funcName, ...args);

                // Si le résultat est une promesse, l'attendre
                if (result && typeof result.then === 'function') {
                    result.then(resolve).catch(reject);
                } else {
                    resolve(result);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    // Gestion de buffers pour transfert de données (corrigé)
    createBuffer(data) {
        if (!this.module.go) {
            throw new Error('Go runtime not available for buffer management');
        }

        const go = this.module.go;
        let buffer, ptr;

        if (data instanceof Float64Array) {
            // Allouer de la mémoire dans l'espace WASM
            const size = data.length * data.BYTES_PER_ELEMENT;
            ptr = this.allocateMemory(size);
            buffer = new Float64Array(go.mem.buffer, ptr, data.length);
            buffer.set(data);
        } else if (data instanceof Uint8Array) {
            ptr = this.allocateMemory(data.length);
            buffer = new Uint8Array(go.mem.buffer, ptr, data.length);
            buffer.set(data);
        } else if (typeof data === 'string') {
            const encoder = new TextEncoder();
            const encodedData = encoder.encode(data);
            ptr = this.allocateMemory(encodedData.length);
            buffer = new Uint8Array(go.mem.buffer, ptr, encodedData.length);
            buffer.set(encodedData);
        } else {
            throw new Error('Unsupported data type');
        }

        return {
            ptr,
            buffer,
            size: buffer.length,
            free: () => this.freeMemory(ptr)
        };
    }

    // Méthodes d'allocation mémoire simplifiées
    allocateMemory(size) {
        // Pour Go WASM, on utilise une approche simplifiée
        // En réalité, Go gère sa propre mémoire
        if (globalThis.__gowm_alloc) {
            return globalThis.__gowm_alloc(size);
        }

        // Fallback : utiliser une zone mémoire temporaire
        const mem = this.module.go.mem;
        const offset = mem.buffer.byteLength;
        return offset;
    }

    freeMemory(ptr) {
        // Pour Go WASM, le garbage collector s'occupe du nettoyage
        if (globalThis.__gowm_free) {
            globalThis.__gowm_free(ptr);
        }
    }

    // Enregistrement de callbacks JavaScript
    registerCallback(name, callback) {
        this.callbacks.set(name, callback);
        globalThis[`__gowm_callback_${name}`] = callback;
    }

    // Supprimer un callback
    unregisterCallback(name) {
        this.callbacks.delete(name);
        delete globalThis[`__gowm_callback_${name}`];
    }

    // Obtenir la liste des fonctions disponibles
    getAvailableFunctions() {
        const functions = [];

        // Fonctions WASM exports
        if (this.module.exports) {
            functions.push(...Object.keys(this.module.exports).filter(key =>
                typeof this.module.exports[key] === 'function'
            ));
        }

        // Fonctions globales (Go WASM)
        for (const key in globalThis) {
            if (typeof globalThis[key] === 'function' && !key.startsWith('__gowm_')) {
                functions.push(key);
            }
        }

        return [...new Set(functions)]; // Supprimer les doublons
    }

    // Vérifier si une fonction existe
    hasFunction(funcName) {
        return (this.module.exports && this.module.exports[funcName]) ||
            (globalThis[funcName] && typeof globalThis[funcName] === 'function');
    }

    // Obtenir les statistiques du module
    getStats() {
        return {
            ready: this.module.ready,
            functions: this.getAvailableFunctions(),
            callbacks: Array.from(this.callbacks.keys()),
            memoryUsage: this.module.go ? this.module.go.mem.buffer.byteLength : 0,
            name: this.name
        };
    }

    // Méthode de nettoyage pour libérer les ressources
    cleanup() {
        // Supprimer tous les callbacks
        for (const name of this.callbacks.keys()) {
            this.unregisterCallback(name);
        }

        // Nettoyer les ressources Go si possible
        if (this.module.go && typeof this.module.go.exit === 'function') {
            try {
                this.module.go.exit(0);
            } catch (e) {
                // Ignorer les erreurs de nettoyage
            }
        }
    }
}

module.exports = WasmBridge;
