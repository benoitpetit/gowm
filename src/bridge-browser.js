export default class WasmBridge {
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
            console.error(`Error calling ${funcName}:`, error);
            throw error;
        }
    }

    // Appel asynchrone de fonction
    async callAsync(funcName, ...args) {
        return new Promise((resolve, reject) => {
            try {
                const result = this.call(funcName, ...args);
                if (result instanceof Promise) {
                    result.then(resolve).catch(reject);
                } else {
                    resolve(result);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    // Créer un buffer en mémoire WASM
    createBuffer(data) {
        let buffer;
        let size;

        if (data instanceof Float64Array) {
            buffer = data;
            size = data.length * 8; // 8 bytes par float64
        } else if (data instanceof Uint8Array) {
            buffer = data;
            size = data.length;
        } else if (typeof data === 'string') {
            const encoder = new TextEncoder();
            buffer = encoder.encode(data);
            size = buffer.length;
        } else {
            throw new Error('Unsupported data type for buffer');
        }

        // Allouer de la mémoire dans WASM
        const ptr = this.call('malloc', size);
        if (!ptr) {
            throw new Error('Failed to allocate memory in WASM');
        }

        // Copier les données dans la mémoire WASM
        const wasmMemory = new Uint8Array(this.module.exports.memory.buffer, ptr, size);
        wasmMemory.set(buffer);

        return {
            ptr,
            buffer: wasmMemory,
            size,
            free: () => {
                try {
                    this.call('free', ptr);
                } catch (e) {
                    // Ignorer les erreurs de libération
                }
            }
        };
    }

    // Enregistrer un callback JavaScript appelable depuis WASM
    registerCallback(name, callback) {
        this.callbacks.set(name, callback);
        globalThis[`__gowm_callback_${name}`] = callback;
    }

    // Désinscrire un callback
    unregisterCallback(name) {
        this.callbacks.delete(name);
        delete globalThis[`__gowm_callback_${name}`];
    }

    // Obtenir la liste des fonctions disponibles
    getAvailableFunctions() {
        const functions = [];

        // Fonctions exports WASM
        if (this.module.exports) {
            Object.keys(this.module.exports).forEach(key => {
                if (typeof this.module.exports[key] === 'function') {
                    functions.push(key);
                }
            });
        }

        // Fonctions globales (pour Go WASM)
        Object.keys(globalThis).forEach(key => {
            if (typeof globalThis[key] === 'function' && !key.startsWith('__gowm_')) {
                functions.push(key);
            }
        });

        return [...new Set(functions)].sort();
    }

    // Vérifier si une fonction existe
    hasFunction(funcName) {
        return (
            (this.module.exports && typeof this.module.exports[funcName] === 'function') ||
            (typeof globalThis[funcName] === 'function')
        );
    }

    // Obtenir les statistiques du module
    getStats() {
        return {
            ready: this.module.ready,
            functions: this.getAvailableFunctions(),
            callbacks: Array.from(this.callbacks.keys()),
            memoryUsage: this.module.exports.memory ? this.module.exports.memory.buffer.byteLength : 0,
            name: this.name
        };
    }

    // Nettoyage des ressources
    cleanup() {
        // Désinscrire tous les callbacks
        for (const name of this.callbacks.keys()) {
            this.unregisterCallback(name);
        }

        // Arrêter le runtime Go si possible
        if (this.module.go && typeof this.module.go.exit === 'function') {
            try {
                this.module.go.exit(0);
            } catch (e) {
                // Ignorer les erreurs
            }
        }
    }
}
