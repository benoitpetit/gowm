export default class WasmLoader {
    constructor() {
        this.modules = new Map();
        this.isNode = false; // Toujours faux en environnement navigateur
    }

    async loadModule(wasmPath, options = {}) {
        const moduleId = options.name || wasmPath.split('/').pop().replace('.wasm', '');

        if (this.modules.has(moduleId)) {
            return this.modules.get(moduleId);
        }

        try {
            // Charger wasm_exec.js si nécessaire
            if (!globalThis.Go) {
                await this.loadGoRuntime(options.goRuntimePath);
            }

            const go = new globalThis.Go();

            const response = await fetch(wasmPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch WASM file: ${response.status} ${response.statusText}`);
            }
            const wasmBytes = await response.arrayBuffer();

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
        const runtimePath = customPath || '/wasm_exec.js';
        await this.loadScript(runtimePath);
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
