// Secure version of the loader that avoids bundling issues
class WasmLoader {
    constructor() {
        this.modules = new Map();
        this.isNode = typeof window === 'undefined';
        this.nodeModulesLoaded = false;
        this.fs = null;
        this.path = null;
    }

    async ensureNodeModules() {
        if (this.isNode && !this.nodeModulesLoaded) {
            try {
                // Dynamic import to avoid issues with bundlers
                this.fs = await this.dynamicRequire('fs');
                this.path = await this.dynamicRequire('path');
                this.nodeModulesLoaded = true;
            } catch (error) {
                console.warn('Failed to load Node.js modules:', error.message);
            }
        }
    }

    async dynamicRequire(module) {
        if (typeof require !== 'undefined') {
            return require(module);
        }
        throw new Error(`Module ${module} not available`);
    }

    async loadModule(wasmPath, options = {}) {
        await this.ensureNodeModules();
        
        const moduleId = options.name || (
            this.isNode && this.path 
                ? this.path.basename(wasmPath, '.wasm') 
                : wasmPath.split('/').pop().replace('.wasm', '')
        );

        if (this.modules.has(moduleId)) {
            return this.modules.get(moduleId);
        }

        try {
            // Load wasm_exec.js if necessary
            if (!globalThis.Go) {
                await this.loadGoRuntime(options.goRuntimePath);
            }

            const go = new globalThis.Go();
            let wasmBytes;

            if (this.isNode && this.fs) {
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

            // Pre-initialization to optimize performance
            if (options.preInit !== false) {
                // Start Go in the background to avoid blocking
                go.run(result.instance);

                // Wait for the module to be ready
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
                // Check multiple ready signals
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

        if (this.isNode && this.fs) {
            // Check that the file exists
            if (!this.fs.existsSync(runtimePath)) {
                console.warn(`Go runtime not found at ${runtimePath}, using fallback`);
                // Use fallback from runtime folder
                const fallbackPath = this.path ? this.path.join(__dirname, '../runtime/wasm_exec.js') : null;
                if (fallbackPath && this.fs.existsSync(fallbackPath)) {
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
            if (typeof document === 'undefined') {
                reject(new Error('Cannot load script in non-browser environment'));
                return;
            }
            
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
            // Clean up Go resources
            try {
                module.go.exit(0);
            } catch (e) {
                // Ignore cleanup errors
            }
        }
        return this.modules.delete(name);
    }

    listModules() {
        return Array.from(this.modules.keys());
    }
}

module.exports = WasmLoader;
