class WasmLoader {
    constructor() {
        this.modules = new Map();
        this.isNode = typeof window === 'undefined';
        
        // Node.js modules will be imported dynamically when needed
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
        // Ensure Node.js modules are loaded if necessary
        await this.ensureNodeModules();
        
        const moduleId = options.name || (this.isNode ? this.path.basename(wasmPath, '.wasm') : wasmPath.split('/').pop().replace('.wasm', ''));

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

            // Check if wasmPath is a URL
            const isUrl = wasmPath.startsWith('http://') || wasmPath.startsWith('https://');

            if (this.isNode && !isUrl) {
                // Local file path in Node.js
                if (!this.fs.existsSync(wasmPath)) {
                    throw new Error(`WASM file not found: ${wasmPath}`);
                }
                wasmBytes = this.fs.readFileSync(wasmPath);
            } else {
                // Use fetch for URLs in both Node.js and browser
                if (this.isNode && typeof fetch === 'undefined') {
                    // Import node-fetch for Node.js environments that don't have fetch
                    try {
                        const nodeFetch = require('node-fetch');
                        global.fetch = nodeFetch;
                    } catch (e) {
                        // Fall back to built-in fetch (Node.js 18+) or throw error
                        if (typeof fetch === 'undefined') {
                            throw new Error('fetch is not available. Please install node-fetch: npm install node-fetch');
                        }
                    }
                }

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

    async waitForReady(moduleId, timeout = 15000) {
        const startTime = Date.now();

        return new Promise((resolve, reject) => {
            let checkCount = 0;
            const maxChecks = timeout / 50; // Check every 50ms instead of 10ms

            const checkReady = () => {
                checkCount++;
                
                // Enhanced ready signal detection
                const signals = {
                    gowmReady: globalThis.__gowm_ready === true,
                    goInitialized: globalThis.Go && globalThis.Go._initialized,
                    functionsAvailable: typeof globalThis.getAvailableFunctions === 'function',
                    moduleSpecificFunctions: typeof globalThis.add === 'function' || 
                                           typeof globalThis.get === 'function' || 
                                           typeof globalThis.post === 'function',
                    moduleReady: globalThis[`__${moduleId}_ready`] === true
                };

                const isReady = signals.gowmReady || signals.goInitialized || 
                               signals.functionsAvailable || signals.moduleSpecificFunctions || 
                               signals.moduleReady;

                // Debug logging for troubleshooting
                if (checkCount % 20 === 0) { // Log every second (20 * 50ms = 1000ms)
                    console.log(`🔍 GoWM: Checking readiness for ${moduleId} (attempt ${checkCount}/${maxChecks}):`, signals);
                }

                const timeElapsed = Date.now() - startTime;
                
                if (isReady) {
                    console.log(`✅ GoWM: Module ${moduleId} is ready after ${timeElapsed}ms`);
                    // Reset the ready flag to prevent interference with other modules
                    if (globalThis.__gowm_ready) {
                        globalThis.__gowm_ready = false;
                    }
                    resolve();
                } else if (timeElapsed > timeout) {
                    console.error(`❌ GoWM: Module ${moduleId} timeout after ${timeElapsed}ms. Signals:`, signals);
                    console.error(`Available global functions:`, Object.keys(globalThis).filter(key => typeof globalThis[key] === 'function'));
                    reject(new Error(`Module ${moduleId} failed to initialize within ${timeout}ms. Ready signals: ${JSON.stringify(signals)}`));
                } else {
                    setTimeout(checkReady, 50);
                }
            };
            
            // Start checking after a small delay to let the module initialize
            setTimeout(checkReady, 100);
        });
    }

    async loadGoRuntime(customPath) {
        await this.ensureNodeModules();
        
        const runtimePath = customPath || this.getDefaultRuntimePath();

        if (this.isNode) {
            // Check that the file exists
            if (!this.fs.existsSync(runtimePath)) {
                console.warn(`Go runtime not found at ${runtimePath}, using fallback`);
                // Use fallback from runtime folder
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
