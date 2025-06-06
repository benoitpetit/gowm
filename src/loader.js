class WasmLoader {
    constructor() {
        this.modules = new Map();
        this.isNode = typeof window === 'undefined';
        
        // Les modules Node.js seront importés de façon dynamique quand nécessaire
        this.fs = null;
        this.path = null;
    }

    async ensureNodeModules() {
        if (this.isNode && !this.fs) {
            this.fs = require('fs');
            this.path = require('path');
        }
    }

    async loadModule(wasmPath, options = {}) {
        // S'assurer que les modules Node.js sont chargés si nécessaire
        await this.ensureNodeModules();
        
        const moduleId = options.name || (this.isNode ? this.path.basename(wasmPath, '.wasm') : wasmPath.split('/').pop().replace('.wasm', ''));

        if (this.modules.has(moduleId)) {
            return this.modules.get(moduleId);
        }

        try {
            // Charger wasm_exec.js si nécessaire
            if (!globalThis.Go) {
                await this.loadGoRuntime(options.goRuntimePath);
            }

            const go = new globalThis.Go();
            let wasmBytes;

            if (this.isNode) {
                if (!this.fs.existsSync(wasmPath)) {
                    throw new Error(`WASM file not found: ${wasmPath}`);
                }
                wasmBytes = this.fs.readFileSync(wasmPath);
            } else {
                const response = await fetch(wasmPath);
                if (!response.ok) {
                    throw new Error(`Failed to fetch WASM file: ${response.status} ${response.statusText}`);
                }
                wasmBytes = await response.arrayBuffer();
            }

            const result = await WebAssembly.instantiate(wasmBytes, go.importObject);

            // Pré-initialisation pour optimiser les performances
            if (options.preInit !== false) {
                // Démarrer Go en arrière-plan pour éviter le blocage
                go.run(result.instance);

                // Attendre que le module soit prêt
                await this.waitForReady(moduleId);
            }

            const module = {
                instance: result.instance,
                go: go,
                exports: result.instance.exports,
                ready: true
            };

            this.modules.set(moduleId, module);
            return module;

        } catch (error) {
            throw new Error(`Failed to load WASM module ${moduleId}: ${error.message}`);
        }
    }

    async waitForReady(moduleId, timeout = 5000) {
        const startTime = Date.now();

        return new Promise((resolve, reject) => {
            const checkReady = () => {
                // Vérifier plusieurs signaux de prêt
                const isReady = globalThis.__gowm_ready ||
                    (globalThis.Go && globalThis.Go._initialized) ||
                    (globalThis.add && typeof globalThis.add === 'function');

                if (isReady || Date.now() - startTime > timeout) {
                    if (isReady) {
                        resolve();
                    } else {
                        reject(new Error(`Module ${moduleId} failed to initialize within ${timeout}ms`));
                    }
                } else {
                    setTimeout(checkReady, 10);
                }
            };
            checkReady();
        });
    }

    async loadGoRuntime(customPath) {
        await this.ensureNodeModules();
        
        const runtimePath = customPath || this.getDefaultRuntimePath();

        if (this.isNode) {
            // Vérifier que le fichier existe
            if (!this.fs.existsSync(runtimePath)) {
                console.warn(`Go runtime not found at ${runtimePath}, using fallback`);
                // Utiliser le fallback du dossier runtime
                const fallbackPath = this.path.join(__dirname, '../runtime/wasm_exec.js');
                if (this.fs.existsSync(fallbackPath)) {
                    require(fallbackPath);
                } else {
                    throw new Error(`Go runtime not found. Please ensure wasm_exec.js is available`);
                }
            } else {
                require(runtimePath);
            }
        } else {
            await this.loadScript(runtimePath);
        }
    }

    getDefaultRuntimePath() {
        if (this.isNode && this.path) {
            return this.path.join(__dirname, '../runtime/wasm_exec.js');
        }
        return '/wasm_exec.js';
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    getModule(name) {
        return this.modules.get(name);
    }

    unloadModule(name) {
        const module = this.modules.get(name);
        if (module && module.go) {
            // Nettoyage des ressources Go
            try {
                module.go.exit(0);
            } catch (e) {
                // Ignorer les erreurs de nettoyage
            }
        }
        return this.modules.delete(name);
    }

    listModules() {
        return Array.from(this.modules.keys());
    }
}

module.exports = WasmLoader;
