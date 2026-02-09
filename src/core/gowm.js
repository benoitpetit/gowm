const UnifiedWasmLoader = require('../loaders/unified-loader');
const UnifiedWasmBridge = require('../bridges/unified-bridge');

/**
 * GoWM - Go WebAssembly Manager
 * Main class that provides a simplified interface for loading and managing WASM modules
 * 
 * @version 1.1.2
 */
class GoWM {
    /**
     * @param {object} options - GoWM configuration options
     * @param {string} [options.logLevel='info'] - Log level: 'silent' | 'error' | 'warn' | 'info' | 'debug'
     * @param {object} [options.logger=console] - Custom logger (must have log, warn, error, debug methods)
     * @param {number} [options.memoryWarningThreshold] - Memory usage threshold in bytes to emit 'memory:warning'
     */
    constructor(options = {}) {
        this.loader = new UnifiedWasmLoader();
        this.modules = new Map();
        this.logLevel = options.logLevel || 'info';
        this.logger = options.logger || console;
        this._listeners = new Map();
        this._memoryWarningThreshold = options.memoryWarningThreshold || null;
    }

    /**
     * Internal logging with level filtering
     * @param {'error'|'warn'|'info'|'debug'} level
     * @param  {...any} args
     */
    _log(level, ...args) {
        const levels = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };
        const currentLevel = levels[this.logLevel] !== undefined ? levels[this.logLevel] : 3;
        const msgLevel = levels[level] !== undefined ? levels[level] : 3;
        if (msgLevel <= currentLevel) {
            if (level === 'error') this.logger.error(...args);
            else if (level === 'warn') this.logger.warn(...args);
            else if (level === 'debug' && this.logger.debug) this.logger.debug(...args);
            else this.logger.log(...args);
        }
    }

    /**
     * Load a WASM module from various sources
     * @param {string} source - Can be file path, HTTP URL, or GitHub repo
     * @param {object} options - Loading options
     * @returns {Promise<UnifiedWasmBridge>} Bridge to interact with the module
     */
    async load(source, options = {}) {
        if (!source || typeof source !== 'string') {
            throw new Error('source must be a non-empty string');
        }

        const moduleId = options.name || this.loader.extractModuleId(source);

        try {
            this._emit('module:loading', { name: moduleId, source });
            const startTime = Date.now();

            const module = await this.loader.loadModule(source, { ...options, name: moduleId });
            const bridge = new UnifiedWasmBridge(module, { 
                ...options, 
                name: moduleId,
                logLevel: this.logLevel 
            });

            this.modules.set(moduleId, { module, bridge, source });

            const loadTime = Date.now() - startTime;
            this._log('info', `GoWM: Successfully loaded module '${moduleId}' from ${source}`);
            this._emit('module:loaded', { name: moduleId, bridge, loadTime, source });
            this._checkMemoryWarning();
            return bridge;
        } catch (error) {
            this._emit('module:error', { name: moduleId, error, source });
            throw new Error(`Failed to load WASM module from ${source}: ${error.message}`);
        }
    }

    /**
     * Load a WASM module from GitHub repository
     * @param {string} githubRepo - GitHub repository in format "owner/repo" or full GitHub URL
     * @param {object} options - Loading options
     * @returns {Promise<UnifiedWasmBridge>} Bridge to interact with the module
     */
    async loadFromGitHub(githubRepo, options = {}) {
        if (!githubRepo || typeof githubRepo !== 'string') {
            throw new Error('githubRepo must be a non-empty string');
        }

        try {
            this._log('info', `GoWM: Loading WASM module from GitHub: ${githubRepo}`);

            // Extract repo name for module ID if not provided
            const repoInfo = this.loader.parseGitHubRepo(githubRepo);
            const enhancedOptions = {
                ...options,
                name: options.name || repoInfo.repo
            };

            return this.load(githubRepo, enhancedOptions);
        } catch (error) {
            throw new Error(`Failed to load GitHub repository ${githubRepo}: ${error.message}`);
        }
    }

    /**
     * Load a WASM module from HTTP/HTTPS URL
     * @param {string} url - URL to WASM file
     * @param {object} options - Loading options
     * @returns {Promise<UnifiedWasmBridge>} Bridge to interact with the module
     */
    async loadFromUrl(url, options = {}) {
        if (!url || typeof url !== 'string') {
            throw new Error('url must be a non-empty string');
        }

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            throw new Error('url must be a valid HTTP or HTTPS URL');
        }

        try {
            this._log('info', `GoWM: Loading WASM module from URL: ${url}`);
            return this.load(url, options);
        } catch (error) {
            throw new Error(`Failed to load from URL ${url}: ${error.message}`);
        }
    }

    /**
     * Load a WASM module from local file (Node.js only)
     * @param {string} filePath - Path to WASM file
     * @param {object} options - Loading options
     * @returns {Promise<UnifiedWasmBridge>} Bridge to interact with the module
     */
    async loadFromFile(filePath, options = {}) {
        if (!filePath || typeof filePath !== 'string') {
            throw new Error('filePath must be a non-empty string');
        }

        if (typeof window !== 'undefined') {
            throw new Error('loadFromFile is only available in Node.js environment');
        }

        try {
            this._log('info', `GoWM: Loading WASM module from file: ${filePath}`);
            return this.load(filePath, options);
        } catch (error) {
            throw new Error(`Failed to load from file ${filePath}: ${error.message}`);
        }
    }

    /**
     * Get a loaded module bridge by name
     * @param {string} name - Module name (default: 'default')
     * @returns {UnifiedWasmBridge|null} Module bridge or null
     */
    get(name = 'default') {
        const entry = this.modules.get(name);
        return entry ? entry.bridge : null;
    }

    /**
     * Check if a module is loaded
     * @param {string} name - Module name (default: 'default')
     * @returns {boolean} Whether module is loaded
     */
    isLoaded(name = 'default') {
        return this.modules.has(name);
    }

    /**
     * Unload a module and clean up resources
     * @param {string} name - Module name (default: 'default')
     * @returns {boolean} Success
     */
    unload(name = 'default') {
        const entry = this.modules.get(name);
        if (!entry) {
            return false;
        }

        try {
            // Cleanup bridge resources
            entry.bridge.cleanup();

            // Unload from loader
            this.loader.unloadModule(name);

            // Remove from modules map
            this.modules.delete(name);

            this._log('info', `GoWM: Unloaded module '${name}'`);
            this._emit('module:unloaded', { name });
            return true;
        } catch (error) {
            this._log('warn', `Failed to unload module ${name}:`, error.message);
            return false;
        }
    }

    /**
     * Unload all modules
     */
    unloadAll() {
        const moduleNames = Array.from(this.modules.keys());

        for (const name of moduleNames) {
            this.unload(name);
        }

        this._log('info', 'GoWM: Unloaded all modules');
    }

    /**
     * List all loaded modules
     * @returns {Array<string>} Module names
     */
    listModules() {
        return Array.from(this.modules.keys());
    }

    /**
     * Get detailed information about all modules
     * @returns {Array<object>} Module information
     */
    getModulesInfo() {
        return Array.from(this.modules.entries()).map(([name, entry]) => ({
            name,
            source: entry.source,
            ready: entry.module.ready,
            loadedAt: entry.module.loadedAt,
            stats: entry.bridge.getStats()
        }));
    }

    /**
     * Get GoWM statistics
     * @returns {object} Statistics
     */
    getStats() {
        const modules = this.getModulesInfo();
        const totalMemory = modules.reduce((sum, mod) =>
            sum + (mod.stats.memoryUsage?.total || 0), 0);

        return {
            version: this.getVersion(),
            totalModules: this.modules.size,
            environment: typeof window === 'undefined' ? 'Node.js' : 'Browser',
            totalMemoryUsage: totalMemory,
            loaderStats: this.loader.getStats(),
            modules
        };
    }

    /**
     * Get total memory usage across all modules
     * @returns {number} Total memory usage in bytes
     */
    getTotalMemoryUsage() {
        let total = 0;
        for (const [name, entry] of this.modules) {
            const memInfo = entry.bridge.getMemoryUsage();
            total += memInfo.total;
        }
        return total;
    }

    /**
     * Test all loaded modules
     * @returns {object} Test results for all modules
     */
    testAll() {
        const results = {};

        for (const [name, entry] of this.modules) {
            try {
                results[name] = entry.bridge.test();
            } catch (error) {
                results[name] = {
                    error: error.message,
                    success: false
                };
            }
        }

        return results;
    }

    /**
     * Get GoWM version (reads from package.json when possible)
     * @returns {string} Version string
     */
    getVersion() {
        try {
            if (typeof require !== 'undefined') {
                const pkg = require('../../package.json');
                return pkg.version;
            }
        } catch (e) {
            // Fallback for browser or if package.json is not available
        }
        return '1.1.2';
    }

    /**
     * Get help information
     * @returns {object} Help information
     */
    getHelp() {
        return {
            description: 'GoWM - Go WebAssembly Manager with unified loader system',
            version: this.getVersion(),
            methods: {
                'load(source, options)': 'Load WASM from any source (file, URL, GitHub)',
                'loadFromGitHub(repo, options)': 'Load WASM from GitHub repository',
                'loadFromUrl(url, options)': 'Load WASM from HTTP/HTTPS URL',
                'loadFromFile(path, options)': 'Load WASM from local file (Node.js only)',
                'get(name)': 'Get loaded module bridge',
                'unload(name)': 'Unload module and cleanup',
                'unloadAll()': 'Unload all modules',
                'listModules()': 'List loaded module names',
                'getStats()': 'Get system statistics',
                'testAll()': 'Test all loaded modules',
                'clearCache(options)': 'Clear WASM cache (memory + disk)',
                'getModuleMetadata(name)': 'Get module.json metadata for a loaded module',
                'describeFunction(name, funcName)': 'Get inline docs for a function'
            },
            loadingSources: {
                'Local file': 'gowm.loadFromFile("./module.wasm")',
                'HTTP URL': 'gowm.loadFromUrl("https://example.com/module.wasm")',
                'GitHub repo': 'gowm.loadFromGitHub("owner/repo")',
                'Auto-detect': 'gowm.load("source") // Auto-detects source type'
            },
            options: {
                'name': 'Module name (string)',
                'branch': 'Git branch for GitHub (string, auto-detected by default)',
                'tag': 'Git tag for GitHub (string)',
                'path': 'Path within repository (string)',
                'filename': 'Specific filename (string)',
                'preInit': 'Pre-initialize module (boolean, default: true)',
                'timeout': 'Initialization timeout (number, default: 15000)',
                'goRuntimePath': 'Custom Go runtime path (string)',
                'cache': 'Cache options (false to disable, or { ttl, diskCache })',
                'retries': 'Number of retry attempts (number, default: 3)',
                'retryDelay': 'Base retry delay in ms (number, default: 1000)',
                'metadata': 'Fetch module.json metadata (boolean, default: true)',
                'integrity': 'Verify SHA256 integrity (boolean, default: true)',
                'validateCalls': 'Validate function calls via metadata (boolean, default: true)'
            }
        };
    }

    /**
     * Get module.json metadata for a loaded module.
     * @param {string} name - Module name (default: 'default')
     * @returns {object|null} Module metadata or null
     */
    getModuleMetadata(name = 'default') {
        const entry = this.modules.get(name);
        if (!entry) return null;
        return entry.bridge.getMetadata();
    }

    /**
     * Get inline documentation for a function in a loaded module.
     * @param {string} name - Module name
     * @param {string} funcName - Function name
     * @returns {object|null} Function documentation or null
     */
    describeFunction(name, funcName) {
        const entry = this.modules.get(name);
        if (!entry) return null;
        return entry.bridge.describe(funcName);
    }

    /**
     * Register an event listener
     * @param {string} event - Event name: 'module:loading' | 'module:loaded' | 'module:error' | 'module:unloaded' | 'memory:warning'
     * @param {Function} callback - Listener function
     * @returns {GoWM} this (for chaining)
     */
    on(event, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Event callback must be a function');
        }
        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }
        this._listeners.get(event).push(callback);
        return this;
    }

    /**
     * Remove an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Listener to remove
     * @returns {GoWM} this (for chaining)
     */
    off(event, callback) {
        const listeners = this._listeners.get(event);
        if (listeners) {
            this._listeners.set(event, listeners.filter(fn => fn !== callback));
        }
        return this;
    }

    /**
     * Register a one-time event listener
     * @param {string} event - Event name
     * @param {Function} callback - Listener function (called once then removed)
     * @returns {GoWM} this (for chaining)
     */
    once(event, callback) {
        const wrapper = (data) => {
            this.off(event, wrapper);
            callback(data);
        };
        wrapper._original = callback;
        return this.on(event, wrapper);
    }

    /**
     * Emit an event to all registered listeners
     * @param {string} event - Event name
     * @param {object} data - Event data
     * @private
     */
    _emit(event, data) {
        const listeners = this._listeners.get(event);
        if (listeners) {
            for (const fn of [...listeners]) {
                try {
                    fn(data);
                } catch (e) {
                    this._log('error', `GoWM: Error in event listener for '${event}':`, e.message);
                }
            }
        }
    }

    /**
     * Check memory usage and emit warning if threshold exceeded
     * @private
     */
    _checkMemoryWarning() {
        if (!this._memoryWarningThreshold) return;
        const usage = this.getTotalMemoryUsage();
        if (usage > this._memoryWarningThreshold) {
            this._emit('memory:warning', {
                usage,
                threshold: this._memoryWarningThreshold,
                modules: this.listModules()
            });
        }
    }

    /**
     * Clear the WASM bytes cache (memory + disk/IndexedDB)
     * @param {object} options - { memory: true, disk: true }
     * @returns {Promise<void>}
     */
    async clearCache(options = {}) {
        await this.loader.clearCache(options);
        this._log('info', 'GoWM: Cache cleared');
    }
}

module.exports = GoWM;