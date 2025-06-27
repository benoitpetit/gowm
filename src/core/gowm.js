const UnifiedWasmLoader = require('../loaders/unified-loader');
const UnifiedWasmBridge = require('../bridges/unified-bridge');

/**
 * GoWM - Go WebAssembly Manager
 * Main class that provides a simplified interface for loading and managing WASM modules
 */
class GoWM {
    constructor() {
        this.loader = new UnifiedWasmLoader();
        this.modules = new Map();
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

        try {
            const module = await this.loader.loadModule(source, options);
            const bridge = new UnifiedWasmBridge(module, options);

            const moduleId = options.name || this.loader.extractModuleId(source);
            this.modules.set(moduleId, { module, bridge, source });

            console.log(`✅ GoWM: Successfully loaded module '${moduleId}' from ${source}`);
            return bridge;
        } catch (error) {
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
            console.log(`🔄 GoWM: Loading WASM module from GitHub: ${githubRepo}`);

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
            console.log(`🔄 GoWM: Loading WASM module from URL: ${url}`);
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
            console.log(`🔄 GoWM: Loading WASM module from file: ${filePath}`);
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

            console.log(`🗑️ GoWM: Unloaded module '${name}'`);
            return true;
        } catch (error) {
            console.warn(`Failed to unload module ${name}:`, error.message);
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

        console.log('🗑️ GoWM: Unloaded all modules');
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
     * Get GoWM version
     * @returns {string} Version string
     */
    getVersion() {
        // This would typically be read from package.json
        return '1.1.0';
    }

    /**
     * Get help information
     * @returns {object} Help information
     */
    getHelp() {
        return {
            description: 'GoWM - Go WebAssembly Manager with unified loader system',
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
                'testAll()': 'Test all loaded modules'
            },
            loadingSources: {
                'Local file': 'gowm.loadFromFile("./module.wasm")',
                'HTTP URL': 'gowm.loadFromUrl("https://example.com/module.wasm")',
                'GitHub repo': 'gowm.loadFromGitHub("owner/repo")',
                'Auto-detect': 'gowm.load("source") // Auto-detects source type'
            },
            options: {
                'name': 'Module name (string)',
                'branch': 'Git branch for GitHub (string)',
                'tag': 'Git tag for GitHub (string)',
                'path': 'Path within repository (string)',
                'filename': 'Specific filename (string)',
                'preInit': 'Pre-initialize module (boolean, default: true)',
                'timeout': 'Initialization timeout (number, default: 15000)',
                'goRuntimePath': 'Custom Go runtime path (string)'
            }
        };
    }

    /**
     * Legacy NPM loading (deprecated)
     * @deprecated Use loadFromGitHub instead
     */
    async loadFromNPM(packageName, options = {}) {
        console.warn('⚠️ loadFromNPM is deprecated. Use loadFromGitHub instead.');

        // Try to convert NPM package to potential GitHub repo
        try {
            return this.loadFromGitHub(packageName, options);
        } catch (error) {
            throw new Error(`Failed to load NPM package ${packageName}. Please use loadFromGitHub with a valid repository instead.`);
        }
    }
}

module.exports = GoWM;