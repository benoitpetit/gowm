/**
 * Unified WASM Loader
 * Supports loading from local files, HTTP URLs, and GitHub repositories
 * Works in both Node.js and browser environments
 */
class UnifiedWasmLoader {
    constructor() {
        this.modules = new Map();
        this.isNode = typeof window === 'undefined';
        this.nodeModulesLoaded = false;
        
        // Node.js modules will be imported dynamically when needed
        this.fs = null;
        this.path = null;
    }

    /**
     * Dynamically load Node.js modules to avoid bundling issues
     */
    async ensureNodeModules() {
        if (this.isNode && !this.nodeModulesLoaded) {
            try {
                this.fs = this.dynamicRequire('fs');
                this.path = this.dynamicRequire('path');
                this.nodeModulesLoaded = true;
            } catch (error) {
                console.warn('Failed to load Node.js modules:', error.message);
            }
        }
    }

    /**
     * Dynamic require to avoid bundler issues
     */
    dynamicRequire(module) {
        if (typeof require !== 'undefined') {
            return require(module);
        }
        throw new Error(`Module ${module} not available`);
    }

    /**
     * Main module loading method - supports file paths, URLs, and GitHub repos
     * @param {string} source - Can be file path, HTTP URL, or GitHub repo (owner/repo)
     * @param {object} options - Loading options
     * @returns {Promise<object>} Loaded WASM module
     */
    async loadModule(source, options = {}) {
        await this.ensureNodeModules();
        
        const moduleId = options.name || this.extractModuleId(source);

        if (this.modules.has(moduleId)) {
            return this.modules.get(moduleId);
        }

        try {
            // Load wasm_exec.js if necessary
            if (!globalThis.Go) {
                await this.loadGoRuntime(options.goRuntimePath);
            }

            const go = new globalThis.Go();
            const wasmBytes = await this.loadWasmBytes(source, options);

            const result = await WebAssembly.instantiate(wasmBytes, go.importObject);

            // Pre-initialization to optimize performance
            if (options.preInit !== false) {
                // Start Go in the background to avoid blocking
                go.run(result.instance);

                // Wait for the module to be ready
                await this.waitForReady(moduleId, options.timeout);
            }

            const module = {
                instance: result.instance,
                go: go,
                exports: result.instance.exports,
                ready: true,
                source: source,
                loadedAt: new Date().toISOString()
            };

            this.modules.set(moduleId, module);
            return module;

        } catch (error) {
            throw new Error(`Failed to load WASM module ${moduleId}: ${error.message}`);
        }
    }

    /**
     * Load WASM bytes from various sources
     * @param {string} source - Source identifier
     * @param {object} options - Loading options
     * @returns {Promise<ArrayBuffer>} WASM bytes
     */
    async loadWasmBytes(source, options = {}) {
        // GitHub repository loading
        if (this.isGitHubRepo(source)) {
            return this.loadFromGitHub(source, options);
        }
        
        // HTTP/HTTPS URL loading
        if (this.isHttpUrl(source)) {
            return this.loadFromHttp(source);
        }
        
        // Local file loading (Node.js only)
        if (this.isNode) {
            return this.loadFromFile(source);
        }
        
        // Browser: treat as relative URL
        return this.loadFromHttp(source);
    }

    /**
     * Load from local file system (Node.js)
     * @param {string} filePath - Path to WASM file
     * @returns {Promise<ArrayBuffer>} WASM bytes
     */
    async loadFromFile(filePath) {
        if (!this.fs) {
            throw new Error('File system not available');
        }

        if (!this.fs.existsSync(filePath)) {
            throw new Error(`WASM file not found: ${filePath}`);
        }

        const buffer = this.fs.readFileSync(filePath);
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }

    /**
     * Load from HTTP/HTTPS URL
     * @param {string} url - URL to WASM file
     * @returns {Promise<ArrayBuffer>} WASM bytes
     */
    async loadFromHttp(url) {
        // Ensure fetch is available
        await this.ensureFetch();

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch WASM file: ${response.status} ${response.statusText}`);
        }
        
        return response.arrayBuffer();
    }

    /**
     * Load from GitHub repository
     * @param {string} repoIdentifier - GitHub repo in format "owner/repo"
     * @param {object} options - Loading options
     * @returns {Promise<ArrayBuffer>} WASM bytes
     */
    async loadFromGitHub(repoIdentifier, options = {}) {
        const repoInfo = this.parseGitHubRepo(repoIdentifier);
        const wasmUrl = await this.buildGitHubWasmUrl(repoInfo, options);
        
        console.log(`🔄 Loading WASM from GitHub: ${wasmUrl}`);
        return this.loadFromHttp(wasmUrl);
    }

    /**
     * Parse GitHub repository identifier
     * @param {string} repo - Repository identifier
     * @returns {object} Parsed repository information
     */
    parseGitHubRepo(repo) {
        // Handle full GitHub URLs
        if (repo.includes('github.com')) {
            const match = repo.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
            if (!match) {
                throw new Error('Invalid GitHub URL format');
            }
            return {
                owner: match[1],
                repo: match[2].replace(/\.git$/, ''),
                fullRepo: `${match[1]}/${match[2].replace(/\.git$/, '')}`
            };
        }
        
        // Handle "owner/repo" format
        const parts = repo.split('/');
        if (parts.length !== 2) {
            throw new Error('GitHub repository must be in format "owner/repo"');
        }
        
        return {
            owner: parts[0],
            repo: parts[1],
            fullRepo: repo
        };
    }

    /**
     * Build GitHub raw URL for WASM file with fallback strategy
     * @param {object} repoInfo - Repository information
     * @param {object} options - Loading options
     * @returns {Promise<string>} URL to WASM file
     */
    async buildGitHubWasmUrl(repoInfo, options) {
        const { owner, repo } = repoInfo;
        const branch = options.tag || options.branch || 'main';
        const basePath = options.path ? `${options.path}/` : '';
        
        // If specific filename is provided
        if (options.filename) {
            return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${basePath}${options.filename}`;
        }

        // Try different common WASM filenames
        const possibleFilenames = [
            'main.wasm',
            'index.wasm',
            `${repo}.wasm`,
            'module.wasm',
            'wasm/main.wasm',
            'wasm/index.wasm',
            'dist/main.wasm',
            'dist/index.wasm',
            'build/main.wasm',
            'build/index.wasm'
        ];

        // Try each possible filename
        for (const filename of possibleFilenames) {
            const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${basePath}${filename}`;
            
            try {
                const exists = await this.checkUrlExists(url);
                if (exists) {
                    return url;
                }
            } catch (e) {
                continue;
            }
        }

        throw new Error(`Could not find WASM file in repository ${repoInfo.fullRepo}`);
    }

    /**
     * Check if URL exists
     * @param {string} url - URL to check
     * @returns {Promise<boolean>} Whether URL exists
     */
    async checkUrlExists(url) {
        await this.ensureFetch();

        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Ensure fetch is available (for Node.js environments)
     */
    async ensureFetch() {
        if (this.isNode && typeof fetch === 'undefined') {
            try {
                const nodeFetch = this.dynamicRequire('node-fetch');
                global.fetch = nodeFetch;
            } catch (e) {
                if (typeof fetch === 'undefined') {
                    throw new Error('fetch is not available. Please install node-fetch: npm install node-fetch');
                }
            }
        }
    }

    /**
     * Wait for module to be ready
     * @param {string} moduleId - Module identifier
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<void>}
     */
    async waitForReady(moduleId, timeout = 15000) {
        const startTime = Date.now();

        return new Promise((resolve, reject) => {
            let checkCount = 0;
            const maxChecks = timeout / 50;

            const checkReady = () => {
                checkCount++;
                
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

                if (checkCount % 20 === 0) {
                    console.log(`🔍 GoWM: Checking readiness for ${moduleId} (attempt ${checkCount}/${maxChecks}):`, signals);
                }

                const timeElapsed = Date.now() - startTime;
                
                if (isReady) {
                    console.log(`✅ GoWM: Module ${moduleId} is ready after ${timeElapsed}ms`);
                    if (globalThis.__gowm_ready) {
                        globalThis.__gowm_ready = false;
                    }
                    resolve();
                } else if (timeElapsed > timeout) {
                    console.error(`❌ GoWM: Module ${moduleId} timeout after ${timeElapsed}ms. Signals:`, signals);
                    reject(new Error(`Module ${moduleId} failed to initialize within ${timeout}ms`));
                } else {
                    setTimeout(checkReady, 50);
                }
            };
            
            setTimeout(checkReady, 100);
        });
    }

    /**
     * Load Go runtime (wasm_exec.js)
     * @param {string} customPath - Custom path to runtime
     */
    async loadGoRuntime(customPath) {
        await this.ensureNodeModules();
        
        const runtimePath = customPath || this.getDefaultRuntimePath();

        if (this.isNode) {
            if (!this.fs || !this.fs.existsSync(runtimePath)) {
                console.warn(`Go runtime not found at ${runtimePath}, using fallback`);
                const fallbackPath = this.path ? this.path.join(__dirname, '../../runtime/wasm_exec.js') : null;
                if (fallbackPath && this.fs && this.fs.existsSync(fallbackPath)) {
                    this.dynamicRequire(fallbackPath);
                } else {
                    throw new Error('Go runtime not found. Please ensure wasm_exec.js is available');
                }
            } else {
                this.dynamicRequire(runtimePath);
            }
        } else {
            await this.loadScript(runtimePath);
        }
    }

    /**
     * Get default runtime path
     * @returns {string} Default runtime path
     */
    getDefaultRuntimePath() {
        if (this.isNode && this.path) {
            return this.path.join(__dirname, '../../runtime/wasm_exec.js');
        }
        return '/wasm_exec.js';
    }

    /**
     * Load script in browser
     * @param {string} src - Script source
     * @returns {Promise<void>}
     */
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

    /**
     * Extract module ID from source
     * @param {string} source - Source identifier
     * @returns {string} Module ID
     */
    extractModuleId(source) {
        if (this.isGitHubRepo(source)) {
            return source.split('/')[1]; // repo name
        }
        
        if (this.isNode && this.path) {
            return this.path.basename(source, '.wasm');
        }
        
        return source.split('/').pop().replace('.wasm', '');
    }

    /**
     * Check if source is GitHub repository
     * @param {string} source - Source identifier
     * @returns {boolean}
     */
    isGitHubRepo(source) {
        return (source.includes('/') && !source.includes('.') && !source.startsWith('http')) ||
               source.includes('github.com');
    }

    /**
     * Check if source is HTTP URL
     * @param {string} source - Source identifier
     * @returns {boolean}
     */
    isHttpUrl(source) {
        return source.startsWith('http://') || source.startsWith('https://');
    }

    /**
     * Get loaded module
     * @param {string} name - Module name
     * @returns {object|null} Module or null
     */
    getModule(name) {
        return this.modules.get(name);
    }

    /**
     * Unload module
     * @param {string} name - Module name
     * @returns {boolean} Success
     */
    unloadModule(name) {
        const module = this.modules.get(name);
        if (module && module.go) {
            try {
                module.go.exit(0);
            } catch (e) {
                // Ignore cleanup errors
            }
        }
        return this.modules.delete(name);
    }

    /**
     * List all loaded modules
     * @returns {Array<string>} Module names
     */
    listModules() {
        return Array.from(this.modules.keys());
    }

    /**
     * Get loader statistics
     * @returns {object} Statistics
     */
    getStats() {
        const modules = Array.from(this.modules.entries()).map(([name, module]) => ({
            name,
            ready: module.ready,
            source: module.source,
            loadedAt: module.loadedAt,
            memoryUsage: module.go ? module.go.mem.buffer.byteLength : 0
        }));

        return {
            totalModules: this.modules.size,
            environment: this.isNode ? 'Node.js' : 'Browser',
            modules
        };
    }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedWasmLoader;
} else {
    window.UnifiedWasmLoader = UnifiedWasmLoader;
} 