/**
 * Unified WASM Loader
 * Supports loading from local files, HTTP URLs, and GitHub repositories
 * Works in both Node.js and browser environments
 * 
 * @version 1.1.2
 * Features:
 * - Auto-download and parse module.json metadata from GitHub repos
 * - SHA256 integrity verification via .wasm.integrity files
 * - Auto-discover readySignal from module.json gowmConfig
 * - Function call validation (parameter count + type warnings)
 * - bridge.describe(funcName) for inline documentation
 * - Multi-level cache (memory → filesystem/IndexedDB → network)
 * - Promise-based readiness signals (callback-first, polling fallback)
 * - WebAssembly.instantiateStreaming() for HTTP loads
 * - Retry with exponential backoff on network failures
 * - Support for compressed WASM files (.wasm.gz, .wasm.br)
 * - Fixed source detection (local paths no longer misidentified as GitHub repos)
 * - Auto-detect default branch via GitHub API (fallback: main → master)
 * - Module namespace isolation via __gowm_modules_ prefix
 */
class UnifiedWasmLoader {
    constructor() {
        this.modules = new Map();
        this.isNode = typeof window === 'undefined';
        this.nodeModulesLoaded = false;
        
        // Cache for GitHub default branches
        this._defaultBranchCache = new Map();

        // L1 Cache: in-memory WASM bytes (Map<cacheKey, {bytes, timestamp}>)
        this._wasmBytesCache = new Map();

        // Cache configuration defaults
        this._cacheDefaults = {
            enabled: true,
            ttl: 3600000, // 1 hour in ms
            diskCache: true,
            memoryCacheMaxSize: 50 // max modules in memory cache
        };

        // Retry configuration defaults
        this._retryDefaults = {
            retries: 3,
            retryDelay: 1000,
            timeout: 30000
        };

        // Module metadata cache (Map<moduleId, moduleJsonData>)
        this._metadataCache = new Map();

        // Node.js modules will be imported dynamically when needed
        this.fs = null;
        this.path = null;
        this.zlib = null;
        this.crypto = null;
        this.os = null;
    }

    /**
     * Dynamically load Node.js modules to avoid bundling issues
     */
    async ensureNodeModules() {
        if (this.isNode && !this.nodeModulesLoaded) {
            try {
                this.fs = this.dynamicRequire('fs');
                this.path = this.dynamicRequire('path');
                try { this.zlib = this.dynamicRequire('zlib'); } catch (e) { /* optional */ }
                try { this.crypto = this.dynamicRequire('crypto'); } catch (e) { /* optional */ }
                try { this.os = this.dynamicRequire('os'); } catch (e) { /* optional */ }
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
            let result;

            // Use instantiateStreaming for HTTP sources when not cached
            const useStreaming = this.isHttpUrl(source) && 
                                typeof WebAssembly.instantiateStreaming === 'function' &&
                                !(options.cache !== false && this._hasCachedBytes(source));

            if (useStreaming) {
                result = await this._instantiateStreaming(source, go.importObject, options);
            } else {
                const wasmBytes = await this.loadWasmBytes(source, options);
                result = await WebAssembly.instantiate(wasmBytes, go.importObject);
            }

            // Pre-initialization to optimize performance
            if (options.preInit !== false) {
                // Capture globalThis keys before Go starts to detect new functions
                const keysBefore = new Set(Object.keys(globalThis));

                // Auto-discover readySignal from module.json metadata (Phase 3.3)
                const metadata = this._metadataCache.get(moduleId);
                const readySignal = metadata?.gowmConfig?.readySignal || null;

                // Start Go in the background to avoid blocking
                go.run(result.instance);

                // Wait for the module to be ready (use metadata readySignal if available)
                await this.waitForReady(moduleId, options.timeout, readySignal);

                // Isolate new global functions into namespace
                this._isolateModuleFunctions(moduleId, keysBefore);
            }

            // Attach metadata to the module object
            const metadata = this._metadataCache.get(moduleId) || null;

            const module = {
                instance: result.instance,
                go: go,
                exports: result.instance.exports,
                ready: true,
                source: source,
                moduleId: moduleId,
                loadedAt: new Date().toISOString(),
                metadata: metadata
            };

            this.modules.set(moduleId, module);
            return module;

        } catch (error) {
            throw new Error(`Failed to load WASM module ${moduleId}: ${error.message}`);
        }
    }

    /**
     * Isolate module functions into a namespace to prevent globalThis pollution.
     * Functions registered by Go are moved from globalThis to
     * globalThis.__gowm_modules_[moduleId]_[funcName]
     * The original globalThis reference is also kept for backward compatibility
     * but can be cleaned up on unload.
     * @param {string} moduleId - Module identifier
     * @param {Set<string>} keysBefore - Keys on globalThis before module load
     */
    _isolateModuleFunctions(moduleId, keysBefore) {
        const internalPrefixes = ['__gowm_', 'go:', 'gojs'];
        const newKeys = Object.keys(globalThis).filter(k => !keysBefore.has(k));

        // Initialize namespace registry
        if (!globalThis.__gowm_modules_) {
            globalThis.__gowm_modules_ = {};
        }
        if (!globalThis.__gowm_modules_[moduleId]) {
            globalThis.__gowm_modules_[moduleId] = {};
        }

        for (const key of newKeys) {
            // Skip internal gowm signals and Go runtime internals
            if (internalPrefixes.some(prefix => key.startsWith(prefix))) continue;
            if (key.startsWith('__') && key.endsWith('_ready')) continue;

            const value = globalThis[key];
            if (typeof value === 'function') {
                // Register in namespace
                globalThis.__gowm_modules_[moduleId][key] = value;
            }
        }
    }

    /**
     * Load WASM bytes from various sources
     * Detection priority: local path → HTTP URL → GitHub repo
     * @param {string} source - Source identifier
     * @param {object} options - Loading options
     * @returns {Promise<ArrayBuffer>} WASM bytes
     */
    async loadWasmBytes(source, options = {}) {
        const cacheOpts = this._resolveCacheOptions(options);

        // Check cache if enabled
        if (cacheOpts.enabled) {
            const cacheKey = this._getCacheKey(source);
            const cached = await this._getFromCache(cacheKey, cacheOpts);
            if (cached) {
                return cached;
            }
        }

        let bytes;

        // 1. Local file path detection (highest priority)
        if (this.isLocalPath(source)) {
            if (this.isNode) {
                bytes = await this.loadFromFile(source);
            } else {
                // In browser, local-looking relative paths are treated as relative URLs
                bytes = await this.loadFromHttp(source, options);
            }
        }
        // 2. HTTP/HTTPS URL loading
        else if (this.isHttpUrl(source)) {
            bytes = await this.loadFromHttp(source, options);
        }
        // 3. GitHub repository loading
        else if (this.isGitHubRepo(source)) {
            bytes = await this.loadFromGitHub(source, options);
        }
        // 4. Fallback: try as file in Node.js, or as relative URL in browser
        else if (this.isNode) {
            bytes = await this.loadFromFile(source);
        } else {
            bytes = await this.loadFromHttp(source, options);
        }

        // Save to cache
        if (cacheOpts.enabled && bytes) {
            const cacheKey = this._getCacheKey(source);
            await this._saveToCache(cacheKey, bytes, cacheOpts);
        }

        return bytes;
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
    async loadFromHttp(url, options = {}) {
        // Ensure fetch is available
        await this.ensureFetch();

        // Try compressed versions first if not already a compressed URL
        if (!url.endsWith('.gz') && !url.endsWith('.br')) {
            const compressedBytes = await this._tryCompressedVariants(url, options);
            if (compressedBytes) {
                return compressedBytes;
            }
        }

        const response = await this.fetchWithRetry(url, options);
        if (!response.ok) {
            throw new Error(`Failed to fetch WASM file: ${response.status} ${response.statusText}`);
        }
        
        const bytes = await response.arrayBuffer();
        
        // Auto-detect and decompress based on Content-Encoding or URL extension
        const contentEncoding = response.headers && response.headers.get 
            ? response.headers.get('content-encoding') 
            : null;

        if (contentEncoding === 'br' || url.endsWith('.br')) {
            return this._decompressBytes(new Uint8Array(bytes), 'br');
        }
        if (contentEncoding === 'gzip' || url.endsWith('.gz')) {
            return this._decompressBytes(new Uint8Array(bytes), 'gzip');
        }

        return bytes;
    }

    /**
     * Load from GitHub repository.
     * Automatically fetches module.json metadata and integrity hash.
     * @param {string} repoIdentifier - GitHub repo in format "owner/repo"
     * @param {object} options - Loading options
     * @returns {Promise<ArrayBuffer>} WASM bytes
     */
    async loadFromGitHub(repoIdentifier, options = {}) {
        const repoInfo = this.parseGitHubRepo(repoIdentifier);
        const wasmUrl = await this.buildGitHubWasmUrl(repoInfo, options);
        
        console.log(`🔄 Loading WASM from GitHub: ${wasmUrl}`);

        // Fetch module.json metadata in parallel with the WASM bytes
        const moduleId = options.name || repoInfo.repo;
        const branch = options.tag || options.branch || await this.detectDefaultBranch(repoInfo.owner, repoInfo.repo);
        const basePath = options.path ? `${options.path}/` : '';

        // Fetch metadata and integrity in parallel (non-blocking)
        const metadataPromise = options.metadata !== false 
            ? this.fetchModuleMetadata(repoInfo, branch, basePath, moduleId, options)
            : Promise.resolve(null);

        const integrityPromise = options.integrity !== false
            ? this.fetchIntegrityHash(repoInfo, branch, basePath, options)
            : Promise.resolve(null);

        const [metadata, integrityHash] = await Promise.all([metadataPromise, integrityPromise]);

        // Load WASM bytes
        const bytes = await this.loadFromHttp(wasmUrl, options);

        // Verify integrity if hash was found
        if (integrityHash && options.integrity !== false) {
            await this.verifyIntegrity(bytes, integrityHash, moduleId);
        }

        // Store metadata on the pending module context so loadModule can access it
        if (metadata) {
            this._metadataCache.set(moduleId, metadata);
        }

        return bytes;
    }

    /**
     * Fetch module.json metadata from a GitHub repository.
     * @param {object} repoInfo - Parsed repo info {owner, repo}
     * @param {string} branch - Branch name
     * @param {string} basePath - Path prefix within the repo
     * @param {string} moduleId - Module identifier
     * @param {object} options - Loading options
     * @returns {Promise<object|null>} Parsed module.json or null
     */
    async fetchModuleMetadata(repoInfo, branch, basePath, moduleId, options = {}) {
        try {
            const metadataUrl = `https://raw.githubusercontent.com/${repoInfo.owner}/${repoInfo.repo}/${branch}/${basePath}module.json`;
            const response = await this.fetchWithRetry(metadataUrl, { retries: 1, retryDelay: 500 });
            if (!response.ok) return null;

            const metadata = await response.json();
            return metadata;
        } catch (e) {
            // module.json not available — not critical
            return null;
        }
    }

    /**
     * Fetch the integrity hash from main.wasm.integrity file.
     * @param {object} repoInfo - Parsed repo info
     * @param {string} branch - Branch name
     * @param {string} basePath - Path prefix
     * @param {object} options - Loading options
     * @returns {Promise<string|null>} Integrity hash string or null
     */
    async fetchIntegrityHash(repoInfo, branch, basePath, options = {}) {
        try {
            const filename = options.filename || 'main.wasm';
            const integrityUrl = `https://raw.githubusercontent.com/${repoInfo.owner}/${repoInfo.repo}/${branch}/${basePath}${filename}.integrity`;
            const response = await this.fetchWithRetry(integrityUrl, { retries: 1, retryDelay: 500 });
            if (!response.ok) return null;

            const hash = (await response.text()).trim();
            return hash || null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Verify WASM bytes integrity against a SRI hash.
     * Supports format: sha256-<base64hash>
     * @param {ArrayBuffer} bytes - WASM bytes to verify
     * @param {string} expectedHash - Expected SRI hash string
     * @param {string} moduleId - Module ID for error messages
     * @throws {Error} If integrity check fails
     */
    async verifyIntegrity(bytes, expectedHash, moduleId) {
        try {
            // Parse SRI format: sha256-<base64>
            const match = expectedHash.match(/^(sha256)-(.+)$/);
            if (!match) {
                console.warn(`⚠️ Unknown integrity format for ${moduleId}: ${expectedHash}`);
                return;
            }

            const [, algorithm, expectedBase64] = match;
            let actualBase64;

            if (this.isNode && this.crypto) {
                // Node.js: use native crypto
                const hash = this.crypto.createHash('sha256').update(Buffer.from(bytes)).digest('base64');
                actualBase64 = hash;
            } else if (typeof crypto !== 'undefined' && crypto.subtle) {
                // Browser: use Web Crypto API
                const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
                const hashArray = new Uint8Array(hashBuffer);
                actualBase64 = btoa(String.fromCharCode(...hashArray));
            } else {
                console.warn(`⚠️ Crypto not available — skipping integrity check for ${moduleId}`);
                return;
            }

            if (actualBase64 !== expectedBase64) {
                throw new Error(
                    `Integrity check failed for module '${moduleId}': ` +
                    `expected sha256-${expectedBase64}, got sha256-${actualBase64}`
                );
            }

            console.log(`✅ Integrity verified for module '${moduleId}'`);
        } catch (error) {
            if (error.message.includes('Integrity check failed')) {
                throw error;
            }
            // Non-critical errors (crypto not available, etc.)
            console.warn(`⚠️ Could not verify integrity for ${moduleId}: ${error.message}`);
        }
    }

    /**
     * Get cached metadata for a module.
     * @param {string} moduleId - Module identifier
     * @returns {object|null} Module metadata or null
     */
    getModuleMetadata(moduleId) {
        return this._metadataCache.get(moduleId) || null;
    }

    /**
     * Parse GitHub repository identifier
     * @param {string} repo - Repository identifier
     * @returns {object} Parsed repository information
     */
    parseGitHubRepo(repo) {
        // Handle full GitHub URLs (must be github.com, not notgithub.com etc.)
        const isGitHubUrl = /(?:^|\/\/)(?:www\.)?github\.com\//i.test(repo);
        if (isGitHubUrl) {
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

        // Handle URLs that are NOT github.com
        if (repo.startsWith('http://') || repo.startsWith('https://')) {
            throw new Error('Invalid GitHub URL format: not a GitHub URL');
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
     * Auto-detect default branch for a GitHub repository.
     * Uses the GitHub API, falls back to trying 'main' then 'master'.
     * Results are cached per repository.
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @returns {Promise<string>} Default branch name
     */
    async detectDefaultBranch(owner, repo) {
        const cacheKey = `${owner}/${repo}`;
        if (this._defaultBranchCache.has(cacheKey)) {
            return this._defaultBranchCache.get(cacheKey);
        }

        try {
            await this.ensureFetch();
            const response = await this.fetchWithRetry(
                `https://api.github.com/repos/${owner}/${repo}`,
                { headers: { 'Accept': 'application/vnd.github.v3+json' }, retries: 2, retryDelay: 500 }
            );
            if (response.ok) {
                const data = await response.json();
                if (data.default_branch) {
                    this._defaultBranchCache.set(cacheKey, data.default_branch);
                    return data.default_branch;
                }
            }
        } catch (e) {
            // API call failed, try fallback
        }

        // Fallback: try 'main', then 'master'
        for (const branch of ['main', 'master']) {
            try {
                const readmeUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`;
                const readmeResp = await this.fetchWithRetry(readmeUrl, { method: 'HEAD', retries: 1, retryDelay: 500 });
                if (readmeResp.ok) {
                    this._defaultBranchCache.set(cacheKey, branch);
                    return branch;
                }
            } catch (e) {
                continue;
            }
        }

        // Ultimate fallback
        const fallback = 'main';
        this._defaultBranchCache.set(cacheKey, fallback);
        return fallback;
    }

    /**
     * Build GitHub raw URL for WASM file with fallback strategy
     * @param {object} repoInfo - Repository information
     * @param {object} options - Loading options
     * @returns {Promise<string>} URL to WASM file
     */
    async buildGitHubWasmUrl(repoInfo, options) {
        const { owner, repo } = repoInfo;
        // Use explicit branch/tag, or auto-detect the default branch
        const branch = options.tag || options.branch || await this.detectDefaultBranch(owner, repo);
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
            const response = await this.fetchWithRetry(url, { method: 'HEAD', retries: 1, retryDelay: 500 });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Ensure fetch is available (for Node.js environments)
     * Node.js >= 18 has native fetch; for older versions, try node-fetch as fallback
     */
    async ensureFetch() {
        if (this.isNode && typeof globalThis.fetch === 'undefined') {
            try {
                const nodeFetch = this.dynamicRequire('node-fetch');
                globalThis.fetch = nodeFetch;
            } catch (e) {
                if (typeof globalThis.fetch === 'undefined') {
                    throw new Error('fetch is not available. Upgrade to Node.js >= 18 or install node-fetch: npm install node-fetch');
                }
            }
        }
    }

    /**
     * Wait for module to be ready.
     * First tries a Promise-based callback signal (__gowm_[moduleId]_ready_callback),
     * then falls back to polling known readiness signals.
     * When readySignal is provided (from module.json gowmConfig), it is also
     * checked during polling for faster detection.
     * @param {string} moduleId - Module identifier
     * @param {number} timeout - Timeout in milliseconds
     * @param {string|null} readySignal - Custom readySignal from module.json (Phase 3.3)
     * @returns {Promise<void>}
     */
    async waitForReady(moduleId, timeout = 15000, readySignal = null) {
        const callbackKey = `__gowm_${moduleId}_ready_callback`;

        return new Promise((resolve, reject) => {
            let resolved = false;
            const startTime = Date.now();

            const finish = () => {
                if (resolved) return;
                resolved = true;
                if (globalThis.__gowm_ready) {
                    globalThis.__gowm_ready = false;
                }
                delete globalThis[callbackKey];
                if (timeoutTimer) clearTimeout(timeoutTimer);
                resolve();
            };

            // Timeout guard
            const timeoutTimer = setTimeout(() => {
                if (resolved) return;
                resolved = true;
                delete globalThis[callbackKey];
                reject(new Error(`Module ${moduleId} failed to initialize within ${timeout}ms`));
            }, timeout);

            // PRIMARY: Register callback that Go SDK can call
            globalThis[callbackKey] = finish;

            // FALLBACK: Polling for modules not using the callback SDK
            // Uses shorter initial delay and adaptive interval
            const checkReady = () => {
                if (resolved) return;
                
                const signals = {
                    gowmReady: globalThis.__gowm_ready === true,
                    goInitialized: globalThis.Go && globalThis.Go._initialized,
                    functionsAvailable: typeof globalThis.getAvailableFunctions === 'function',
                    moduleReady: globalThis[`__${moduleId}_ready`] === true
                };

                // Phase 3.3: Check custom readySignal from module.json
                if (readySignal && globalThis[readySignal] === true) {
                    signals.metadataReady = true;
                }

                const isReady = signals.gowmReady || signals.goInitialized || 
                               signals.functionsAvailable || signals.moduleReady ||
                               signals.metadataReady;

                if (isReady) {
                    finish();
                } else {
                    // Adaptive polling: start fast (10ms), slow down over time
                    const elapsed = Date.now() - startTime;
                    const interval = elapsed < 500 ? 10 : elapsed < 2000 ? 25 : 50;
                    setTimeout(checkReady, interval);
                }
            };
            
            // Start polling quickly in case callback is not used
            setTimeout(checkReady, 10);
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
     * Extract module ID from source.
     * For paths like './foo/bar-wasm/main.wasm', returns 'bar-wasm' (parent dir).
     * For GitHub repos in 'owner/repo' format, returns the repo name.
     * @param {string} source - Source identifier
     * @returns {string} Module ID
     */
    extractModuleId(source) {
        if (this.isGitHubRepo(source)) {
            // For full GitHub URLs, extract repo name
            if (source.includes('github.com')) {
                const match = source.match(/github\.com\/[^\/]+\/([^\/\?#]+)/);
                if (match) return match[1].replace(/\.git$/, '');
            }
            return source.split('/')[1]; // repo name from owner/repo
        }

        // For file paths: if basename is generic (main, index, module),
        // use the parent directory name instead
        const genericNames = ['main', 'index', 'module'];
        let basename;
        if (this.isNode && this.path) {
            basename = this.path.basename(source, '.wasm');
            if (genericNames.includes(basename)) {
                const dir = this.path.basename(this.path.dirname(source));
                if (dir && dir !== '.' && dir !== '..') return dir;
            }
        } else {
            const parts = source.split('/');
            basename = parts.pop().replace('.wasm', '');
            if (genericNames.includes(basename) && parts.length > 0) {
                const dir = parts[parts.length - 1];
                if (dir && dir !== '.' && dir !== '..') return dir;
            }
        }
        
        return basename || 'default';
    }

    /**
     * Check if source is a local file path.
     * Matches: starts with './', '../', '/', '~/', or contains backslash (Windows),
     * or ends with '.wasm' (but NOT if it starts with http/https).
     * @param {string} source - Source identifier
     * @returns {boolean}
     */
    isLocalPath(source) {
        // HTTP(S) URLs are never local paths
        if (source.startsWith('http://') || source.startsWith('https://')) {
            return false;
        }
        return source.startsWith('./') || 
               source.startsWith('../') || 
               source.startsWith('/') || 
               source.startsWith('~') || 
               source.includes('\\') || 
               source.endsWith('.wasm');
    }

    /**
     * Check if source is GitHub repository.
     * Strict format: 'owner/repo' (exactly two alphanumeric segments with no path prefix)
     * or contains 'github.com'.
     * @param {string} source - Source identifier
     * @returns {boolean}
     */
    isGitHubRepo(source) {
        if (/(?:^|\/\/)(?:www\.)?github\.com\//i.test(source)) return true;
        // Strict owner/repo format: exactly two segments, no path prefix, no dots
        if (source.startsWith('./') || source.startsWith('../') || source.startsWith('/')) return false;
        if (source.startsWith('http://') || source.startsWith('https://')) return false;
        const parts = source.split('/');
        return parts.length === 2 && 
               parts[0].length > 0 && 
               parts[1].length > 0 && 
               /^[a-zA-Z0-9_.-]+$/.test(parts[0]) && 
               /^[a-zA-Z0-9_.-]+$/.test(parts[1]);
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
     * Unload module and clean up its namespace from globalThis
     * @param {string} name - Module name
     * @returns {boolean} Success
     */
    unloadModule(name) {
        const module = this.modules.get(name);
        if (module) {
            // Clean up namespaced functions
            if (globalThis.__gowm_modules_ && globalThis.__gowm_modules_[name]) {
                const funcs = globalThis.__gowm_modules_[name];
                for (const funcName of Object.keys(funcs)) {
                    // Only delete from globalThis if it's the same reference we stored
                    if (globalThis[funcName] === funcs[funcName]) {
                        delete globalThis[funcName];
                    }
                }
                delete globalThis.__gowm_modules_[name];
            }

            // Clean up ready signals
            delete globalThis[`__${name}_ready`];
            delete globalThis[`__gowm_${name}_ready_callback`];

            if (module.go) {
                try {
                    module.go.exit(0);
                } catch (e) {
                    // Ignore cleanup errors
                }
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
            cacheSize: this._wasmBytesCache.size,
            modules
        };
    }

    // =========================================================================
    // Retry with exponential backoff (Phase 2.4)
    // =========================================================================

    /**
     * Fetch with retry and exponential backoff.
     * @param {string} url - URL to fetch
     * @param {object} options - Fetch options + retry config
     * @param {number} [options.retries=3] - Max retry attempts
     * @param {number} [options.retryDelay=1000] - Base delay in ms
     * @param {number} [options.timeout=30000] - Request timeout in ms
     * @param {string} [options.method] - HTTP method
     * @param {object} [options.headers] - HTTP headers
     * @returns {Promise<Response>} Fetch response
     */
    async fetchWithRetry(url, options = {}) {
        const maxRetries = options.retries !== undefined ? options.retries : this._retryDefaults.retries;
        const baseDelay = options.retryDelay || this._retryDefaults.retryDelay;
        const timeout = options.timeout || this._retryDefaults.timeout;

        const fetchOpts = {};
        if (options.method) fetchOpts.method = options.method;
        if (options.headers) fetchOpts.headers = options.headers;

        // Use AbortSignal.timeout if available (Node 18+, modern browsers)
        if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
            fetchOpts.signal = AbortSignal.timeout(timeout);
        }

        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fetch(url, fetchOpts);
            } catch (error) {
                lastError = error;
                if (attempt < maxRetries) {
                    const delay = baseDelay * Math.pow(2, attempt);
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        }
        throw lastError;
    }

    // =========================================================================
    // WebAssembly.instantiateStreaming (Phase 2.3)
    // =========================================================================

    /**
     * Use WebAssembly.instantiateStreaming for HTTP sources.
     * Allows compilation during download for better performance.
     * Falls back to standard instantiate if streaming fails.
     * @param {string} url - HTTP URL to WASM file
     * @param {object} importObject - WebAssembly import object
     * @param {object} options - Loading options (retry config)
     * @returns {Promise<WebAssembly.WebAssemblyInstantiatedSource>}
     */
    async _instantiateStreaming(url, importObject, options = {}) {
        await this.ensureFetch();

        try {
            // Try compressed variant first
            const compressedUrl = await this._findCompressedUrl(url, options);
            const targetUrl = compressedUrl || url;

            // If compressed, can't use streaming — need to decompress first
            if (compressedUrl) {
                const bytes = await this.loadFromHttp(compressedUrl, options);
                return WebAssembly.instantiate(bytes, importObject);
            }

            // Use streaming instantiation with retry
            const response = await this.fetchWithRetry(targetUrl, options);
            if (!response.ok) {
                throw new Error(`Failed to fetch WASM: ${response.status}`);
            }

            // instantiateStreaming requires correct MIME type (application/wasm)
            const contentType = response.headers && response.headers.get 
                ? response.headers.get('content-type') 
                : '';
            
            if (contentType && contentType.includes('application/wasm')) {
                return WebAssembly.instantiateStreaming(response, importObject);
            }

            // Fallback: if MIME type is wrong, use standard instantiate
            const bytes = await response.arrayBuffer();
            return WebAssembly.instantiate(bytes, importObject);
        } catch (error) {
            // Final fallback to standard path
            const bytes = await this.loadWasmBytes(url, { ...options, cache: false });
            return WebAssembly.instantiate(bytes, importObject);
        }
    }

    /**
     * Check if cached WASM bytes exist for a source
     * @param {string} source - Source identifier
     * @returns {boolean}
     */
    _hasCachedBytes(source) {
        const cacheKey = this._getCacheKey(source);
        const cached = this._wasmBytesCache.get(cacheKey);
        if (!cached) return false;
        // Check TTL
        const ttl = this._cacheDefaults.ttl;
        return (Date.now() - cached.timestamp) < ttl;
    }

    // =========================================================================
    // Compressed WASM support (Phase 2.6)
    // =========================================================================

    /**
     * Try loading compressed variants of a WASM URL (.wasm.br, .wasm.gz)
     * Compressed files are smaller and reduce bandwidth usage.
     * @param {string} url - Base WASM URL
     * @param {object} options - Loading options
     * @returns {Promise<ArrayBuffer|null>} Decompressed bytes or null
     */
    async _tryCompressedVariants(url, options = {}) {
        // Only try compression for .wasm URLs
        if (!url.endsWith('.wasm')) return null;

        const variants = [
            { ext: '.br', encoding: 'br' },
            { ext: '.gz', encoding: 'gzip' }
        ];

        for (const { ext, encoding } of variants) {
            try {
                const compressedUrl = url + ext;
                const response = await this.fetchWithRetry(compressedUrl, { 
                    ...options, 
                    retries: 0 // Don't retry compressed variant checks
                });
                if (response.ok) {
                    const compressedBytes = await response.arrayBuffer();
                    return this._decompressBytes(new Uint8Array(compressedBytes), encoding);
                }
            } catch (e) {
                // Compressed variant not available, continue
            }
        }

        return null;
    }

    /**
     * Find a compressed URL variant if available.
     * @param {string} url - Base WASM URL
     * @param {object} options - Options for fetch
     * @returns {Promise<string|null>} Compressed URL or null
     */
    async _findCompressedUrl(url, options = {}) {
        if (!url.endsWith('.wasm')) return null;

        for (const ext of ['.br', '.gz']) {
            try {
                const compressedUrl = url + ext;
                const exists = await this.checkUrlExists(compressedUrl);
                if (exists) return compressedUrl;
            } catch (e) {
                continue;
            }
        }
        return null;
    }

    /**
     * Decompress WASM bytes.
     * Node.js: uses native zlib (brotli, gzip).
     * Browser: uses DecompressionStream API.
     * @param {Uint8Array} bytes - Compressed bytes
     * @param {string} encoding - 'br' for Brotli, 'gzip' for gzip
     * @returns {Promise<ArrayBuffer>} Decompressed WASM bytes
     */
    async _decompressBytes(bytes, encoding) {
        // Node.js: use native zlib
        if (this.isNode && this.zlib) {
            if (encoding === 'br') {
                const decompressed = this.zlib.brotliDecompressSync(Buffer.from(bytes));
                return decompressed.buffer.slice(decompressed.byteOffset, decompressed.byteOffset + decompressed.byteLength);
            }
            if (encoding === 'gzip') {
                const decompressed = this.zlib.gunzipSync(Buffer.from(bytes));
                return decompressed.buffer.slice(decompressed.byteOffset, decompressed.byteOffset + decompressed.byteLength);
            }
        }

        // Browser: use DecompressionStream API
        if (typeof DecompressionStream !== 'undefined') {
            const format = encoding === 'br' ? 'deflate' : 'gzip';
            // Brotli is not supported by DecompressionStream in all browsers
            // For brotli, use 'deflate-raw' or fall back
            try {
                const ds = new DecompressionStream(encoding === 'gzip' ? 'gzip' : 'deflate');
                const writer = ds.writable.getWriter();
                const reader = ds.readable.getReader();
                
                writer.write(bytes);
                writer.close();

                const chunks = [];
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                }

                const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
                const result = new Uint8Array(totalLength);
                let offset = 0;
                for (const chunk of chunks) {
                    result.set(chunk, offset);
                    offset += chunk.length;
                }
                return result.buffer;
            } catch (e) {
                // DecompressionStream failed, data might not be compressed as expected
            }
        }

        // If no decompression available, return bytes as-is (may fail at instantiate)
        console.warn(`Decompression not available for encoding: ${encoding}`);
        return bytes.buffer;
    }

    // =========================================================================
    // Multi-level cache (Phase 2.1)
    // =========================================================================

    /**
     * Resolve cache options from user options and defaults.
     * @param {object} options - User options
     * @returns {object} Resolved cache options
     */
    _resolveCacheOptions(options) {
        if (options.cache === false) {
            return { enabled: false };
        }
        const cacheOpts = typeof options.cache === 'object' ? options.cache : {};
        return {
            enabled: cacheOpts.enabled !== undefined ? cacheOpts.enabled : this._cacheDefaults.enabled,
            ttl: cacheOpts.ttl || this._cacheDefaults.ttl,
            diskCache: cacheOpts.diskCache !== undefined ? cacheOpts.diskCache : this._cacheDefaults.diskCache
        };
    }

    /**
     * Generate a stable cache key from source identifier.
     * Uses SHA256 hash in Node.js, simple hash in browser.
     * @param {string} source - Source identifier
     * @returns {string} Cache key
     */
    _getCacheKey(source) {
        if (this.isNode && this.crypto) {
            return this.crypto.createHash('sha256').update(source).digest('hex');
        }
        // Simple string hash for browser
        let hash = 0;
        for (let i = 0; i < source.length; i++) {
            const char = source.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return 'gowm_' + Math.abs(hash).toString(16);
    }

    /**
     * Get WASM bytes from cache (L1 memory → L2 disk/IndexedDB).
     * @param {string} cacheKey - Cache key
     * @param {object} cacheOpts - Cache options with TTL
     * @returns {Promise<ArrayBuffer|null>} Cached bytes or null
     */
    async _getFromCache(cacheKey, cacheOpts) {
        // L1: Memory cache
        const memCached = this._wasmBytesCache.get(cacheKey);
        if (memCached && (Date.now() - memCached.timestamp) < cacheOpts.ttl) {
            return memCached.bytes;
        }
        // Remove expired entry
        if (memCached) {
            this._wasmBytesCache.delete(cacheKey);
        }

        // L2: Disk cache (Node.js) or IndexedDB (Browser)
        if (cacheOpts.diskCache) {
            const diskBytes = await this._getFromDiskCache(cacheKey, cacheOpts.ttl);
            if (diskBytes) {
                // Promote to L1
                this._wasmBytesCache.set(cacheKey, { bytes: diskBytes, timestamp: Date.now() });
                this._evictMemoryCacheIfNeeded();
                return diskBytes;
            }
        }

        return null;
    }

    /**
     * Save WASM bytes to cache (L1 + L2).
     * @param {string} cacheKey - Cache key
     * @param {ArrayBuffer} bytes - WASM bytes
     * @param {object} cacheOpts - Cache options
     */
    async _saveToCache(cacheKey, bytes, cacheOpts) {
        // L1: Memory
        this._wasmBytesCache.set(cacheKey, { bytes, timestamp: Date.now() });
        this._evictMemoryCacheIfNeeded();

        // L2: Disk/IndexedDB
        if (cacheOpts.diskCache) {
            await this._saveToDiskCache(cacheKey, bytes);
        }
    }

    /**
     * Evict oldest entries from memory cache if max size exceeded.
     */
    _evictMemoryCacheIfNeeded() {
        const maxSize = this._cacheDefaults.memoryCacheMaxSize;
        if (this._wasmBytesCache.size <= maxSize) return;

        // Remove oldest entries (Map preserves insertion order)
        const keysToRemove = [];
        let count = 0;
        const excess = this._wasmBytesCache.size - maxSize;
        for (const key of this._wasmBytesCache.keys()) {
            if (count >= excess) break;
            keysToRemove.push(key);
            count++;
        }
        keysToRemove.forEach(k => this._wasmBytesCache.delete(k));
    }

    /**
     * Get WASM bytes from disk cache (Node.js: ~/.cache/gowm/).
     * @param {string} cacheKey - Cache key
     * @param {number} ttl - TTL in ms
     * @returns {Promise<ArrayBuffer|null>}
     */
    async _getFromDiskCache(cacheKey, ttl) {
        if (this.isNode && this.fs && this.path && this.os) {
            try {
                const cacheDir = this.path.join(this.os.homedir(), '.cache', 'gowm');
                const cachePath = this.path.join(cacheDir, `${cacheKey}.wasm`);
                
                if (!this.fs.existsSync(cachePath)) return null;

                const stat = this.fs.statSync(cachePath);
                if ((Date.now() - stat.mtimeMs) > ttl) {
                    // Expired — remove
                    try { this.fs.unlinkSync(cachePath); } catch (e) { /* ignore */ }
                    return null;
                }

                const buffer = this.fs.readFileSync(cachePath);
                return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
            } catch (e) {
                return null;
            }
        }

        // Browser: IndexedDB via simple wrapper
        if (!this.isNode && typeof indexedDB !== 'undefined') {
            return this._getFromIndexedDB(cacheKey, ttl);
        }

        return null;
    }

    /**
     * Save WASM bytes to disk cache.
     * @param {string} cacheKey - Cache key
     * @param {ArrayBuffer} bytes - WASM bytes
     */
    async _saveToDiskCache(cacheKey, bytes) {
        if (this.isNode && this.fs && this.path && this.os) {
            try {
                const cacheDir = this.path.join(this.os.homedir(), '.cache', 'gowm');
                if (!this.fs.existsSync(cacheDir)) {
                    this.fs.mkdirSync(cacheDir, { recursive: true });
                }
                const cachePath = this.path.join(cacheDir, `${cacheKey}.wasm`);
                this.fs.writeFileSync(cachePath, Buffer.from(bytes));
            } catch (e) {
                // Disk cache write failed, not critical
            }
            return;
        }

        // Browser: IndexedDB
        if (!this.isNode && typeof indexedDB !== 'undefined') {
            await this._saveToIndexedDB(cacheKey, bytes);
        }
    }

    /**
     * Get WASM bytes from IndexedDB (Browser L2 cache).
     * @param {string} cacheKey - Cache key
     * @param {number} ttl - TTL in ms
     * @returns {Promise<ArrayBuffer|null>}
     */
    async _getFromIndexedDB(cacheKey, ttl) {
        return new Promise((resolve) => {
            try {
                const request = indexedDB.open('gowm-cache', 1);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('wasm-bytes')) {
                        db.createObjectStore('wasm-bytes');
                    }
                };
                request.onsuccess = (e) => {
                    try {
                        const db = e.target.result;
                        const tx = db.transaction('wasm-bytes', 'readonly');
                        const store = tx.objectStore('wasm-bytes');
                        const getReq = store.get(cacheKey);
                        getReq.onsuccess = () => {
                            const entry = getReq.result;
                            if (entry && (Date.now() - entry.timestamp) < ttl) {
                                resolve(entry.bytes);
                            } else {
                                resolve(null);
                            }
                        };
                        getReq.onerror = () => resolve(null);
                    } catch (err) {
                        resolve(null);
                    }
                };
                request.onerror = () => resolve(null);
            } catch (err) {
                resolve(null);
            }
        });
    }

    /**
     * Save WASM bytes to IndexedDB (Browser L2 cache).
     * @param {string} cacheKey - Cache key
     * @param {ArrayBuffer} bytes - WASM bytes
     */
    async _saveToIndexedDB(cacheKey, bytes) {
        return new Promise((resolve) => {
            try {
                const request = indexedDB.open('gowm-cache', 1);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('wasm-bytes')) {
                        db.createObjectStore('wasm-bytes');
                    }
                };
                request.onsuccess = (e) => {
                    try {
                        const db = e.target.result;
                        const tx = db.transaction('wasm-bytes', 'readwrite');
                        const store = tx.objectStore('wasm-bytes');
                        store.put({ bytes, timestamp: Date.now() }, cacheKey);
                        tx.oncomplete = () => resolve();
                        tx.onerror = () => resolve();
                    } catch (err) {
                        resolve();
                    }
                };
                request.onerror = () => resolve();
            } catch (err) {
                resolve();
            }
        });
    }

    /**
     * Clear the WASM cache (memory + disk).
     * @param {object} options - { memory: true, disk: true }
     */
    async clearCache(options = {}) {
        const clearMemory = options.memory !== false;
        const clearDisk = options.disk !== false;

        if (clearMemory) {
            this._wasmBytesCache.clear();
        }

        if (clearDisk) {
            // Node.js: remove cache directory contents
            if (this.isNode && this.fs && this.path && this.os) {
                try {
                    const cacheDir = this.path.join(this.os.homedir(), '.cache', 'gowm');
                    if (this.fs.existsSync(cacheDir)) {
                        const files = this.fs.readdirSync(cacheDir);
                        for (const file of files) {
                            if (file.endsWith('.wasm')) {
                                this.fs.unlinkSync(this.path.join(cacheDir, file));
                            }
                        }
                    }
                } catch (e) {
                    // Ignore cleanup errors
                }
            }

            // Browser: clear IndexedDB store
            if (!this.isNode && typeof indexedDB !== 'undefined') {
                try {
                    const request = indexedDB.open('gowm-cache', 1);
                    request.onsuccess = (e) => {
                        try {
                            const db = e.target.result;
                            const tx = db.transaction('wasm-bytes', 'readwrite');
                            tx.objectStore('wasm-bytes').clear();
                        } catch (err) { /* ignore */ }
                    };
                } catch (e) { /* ignore */ }
            }
        }
    }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedWasmLoader;
} else {
    window.UnifiedWasmLoader = UnifiedWasmLoader;
} 