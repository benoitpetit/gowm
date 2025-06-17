const WasmLoader = require('./loader');
const WasmBridge = require('./bridge');

class GoWM {
    constructor() {
        this.loader = new WasmLoader();
        this.modules = new Map();
    }

    async load(wasmPath, options = {}) {
        if (!wasmPath || typeof wasmPath !== 'string') {
            throw new Error('wasmPath must be a non-empty string');
        }

        const module = await this.loader.loadModule(wasmPath, options);
        const bridge = new WasmBridge(module, options);

        const moduleId = options.name || 'default';
        this.modules.set(moduleId, { module, bridge });

        return bridge;
    }

    get(name = 'default') {
        const entry = this.modules.get(name);
        return entry ? entry.bridge : null;
    }

    /**
     * Load a WASM module from GitHub repository
     * @param {string} githubRepo - GitHub repository in format "owner/repo" or full GitHub URL
     * @param {object} options - Loading options
     * @param {string} options.branch - Git branch (default: 'main')
     * @param {string} options.tag - Git tag (takes precedence over branch)
     * @param {string} options.path - Path within the repository (default: '')
     * @param {string} options.filename - Specific filename (default: tries multiple)
     * @param {string} options.name - Module name
     * @returns {Promise<WasmBridge>}
     */
    async loadFromGitHub(githubRepo, options = {}) {
        if (!githubRepo || typeof githubRepo !== 'string') {
            throw new Error('githubRepo must be a non-empty string');
        }

        try {
            const repoInfo = this.parseGitHubRepo(githubRepo);
            const wasmUrl = await this.buildGitHubWasmUrl(repoInfo, options);
            
            console.log(`🔄 Loading WASM module from GitHub: ${wasmUrl}`);
            return this.load(wasmUrl, { ...options, name: options.name || repoInfo.repo });
        } catch (error) {
            throw new Error(`Failed to load GitHub repository ${githubRepo}: ${error.message}`);
        }
    }

    /**
     * Parse GitHub repository URL or string
     * @param {string} githubRepo - GitHub repository identifier
     * @returns {object} Parsed repository information
     */
    parseGitHubRepo(githubRepo) {
        // Handle full GitHub URLs
        if (githubRepo.includes('github.com')) {
            const match = githubRepo.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
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
        const parts = githubRepo.split('/');
        if (parts.length !== 2) {
            throw new Error('GitHub repository must be in format "owner/repo" or full GitHub URL');
        }
        
        return {
            owner: parts[0],
            repo: parts[1],
            fullRepo: githubRepo
        };
    }

    /**
     * Build the GitHub raw URL for WASM file with fallback strategy
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

        // Try different common WASM filenames with fallback
        const possibleFilenames = [
            'main.wasm',
            'index.wasm',
            `${repo}.wasm`,
            'module.wasm',
            'wasm/main.wasm',
            'wasm/index.wasm',
            `wasm/${repo}.wasm`,
            'dist/main.wasm',
            'dist/index.wasm',
            `dist/${repo}.wasm`,
            'build/main.wasm',
            'build/index.wasm',
            `build/${repo}.wasm`
        ];

        // Try each possible filename
        for (const filename of possibleFilenames) {
            const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${basePath}${filename}`;
            
            try {
                // Check if file exists by making a HEAD request
                const exists = await this.checkUrlExists(url);
                if (exists) {
                    return url;
                }
            } catch (e) {
                // Continue to next filename
                continue;
            }
        }

        // If no file found, try releases
        const releaseUrl = await this.tryGitHubReleases(repoInfo, options);
        if (releaseUrl) {
            return releaseUrl;
        }

        throw new Error(`Could not find WASM file in repository ${repoInfo.fullRepo}. Tried: ${possibleFilenames.join(', ')}`);
    }

    /**
     * Try to find WASM file in GitHub releases
     * @param {object} repoInfo - Repository information
     * @param {object} options - Loading options
     * @returns {Promise<string|null>} URL to WASM file or null
     */
    async tryGitHubReleases(repoInfo, options) {
        try {
            const { owner, repo } = repoInfo;
            const releaseTag = options.tag || 'latest';
            
            // GitHub API URL for releases
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/${releaseTag}`;
            
            // Only try this in browser environment or if fetch is available
            if (typeof fetch === 'undefined') {
                return null;
            }

            const response = await fetch(apiUrl);
            if (!response.ok) {
                return null;
            }

            const release = await response.json();
            const wasmAssets = release.assets.filter(asset => 
                asset.name.endsWith('.wasm') || 
                asset.name.includes('wasm')
            );

            if (wasmAssets.length > 0) {
                // Prefer main.wasm, index.wasm, or repo name
                const preferredAsset = wasmAssets.find(asset => 
                    asset.name === 'main.wasm' || 
                    asset.name === 'index.wasm' || 
                    asset.name === `${repo}.wasm`
                ) || wasmAssets[0];

                return preferredAsset.browser_download_url;
            }
        } catch (error) {
            // Silently fail and let the main function handle the error
            return null;
        }

        return null;
    }

    /**
     * Check if a URL exists (for browsers)
     * @param {string} url - URL to check
     * @returns {Promise<boolean>} Whether URL exists
     */
    async checkUrlExists(url) {
        if (typeof fetch === 'undefined') {
            // In Node.js, assume URL exists (will be validated during actual load)
            return true;
        }

        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Legacy NPM loading (deprecated, use loadFromGitHub instead)
     * @deprecated Use loadFromGitHub instead
     */
    async loadFromNPM(packageName, options = {}) {
        console.warn('loadFromNPM is deprecated. Use loadFromGitHub instead.');
        
        if (!packageName || typeof packageName !== 'string') {
            throw new Error('packageName must be a non-empty string');
        }

        try {
            // Try to resolve the path to the WASM file with improved fallback strategy
            let packagePath;
            const possiblePaths = [
                `${packageName}/main.wasm`,
                `${packageName}/index.wasm`, 
                `${packageName}/${packageName}.wasm`,
                `${packageName}/dist/main.wasm`,
                `${packageName}/dist/index.wasm`,
                `${packageName}/dist/${packageName}.wasm`
            ];

            let lastError;
            for (const path of possiblePaths) {
                try {
                    packagePath = require.resolve(path);
                    break;
                } catch (e) {
                    lastError = e;
                    continue;
                }
            }

            if (!packagePath) {
                throw new Error(`Could not find WASM file for package ${packageName}. Tried: ${possiblePaths.join(', ')}`);
            }

            return this.load(packagePath, { ...options, name: options.name || packageName });
        } catch (error) {
            throw new Error(`Failed to load NPM package ${packageName}: ${error.message}`);
        }
    }

    unload(name = 'default') {
        const entry = this.modules.get(name);
        if (entry) {
            // Clean up resources
            if (entry.bridge && typeof entry.bridge.cleanup === 'function') {
                entry.bridge.cleanup();
            }
            this.loader.unloadModule(name);
        }
        return this.modules.delete(name);
    }

    // Get list of loaded modules
    listModules() {
        return Array.from(this.modules.keys());
    }

    // Get statistics for all modules
    getStats() {
        const stats = {};
        for (const [name, entry] of this.modules) {
            stats[name] = entry.bridge.getStats();
        }
        return stats;
    }

    // Clean up all modules
    unloadAll() {
        for (const name of this.modules.keys()) {
            this.unload(name);
        }
    }

    // Check if a module is loaded
    isLoaded(name = 'default') {
        return this.modules.has(name);
    }

    // Get total memory usage across all modules
    getTotalMemoryUsage() {
        let total = 0;
        for (const [name, entry] of this.modules) {
            const stats = entry.bridge.getStats();
            total += stats.memoryUsage || 0;
        }
        return total;
    }
}

// Singleton instance for simplified API
const gowm = new GoWM();

// Simplified API for direct usage
module.exports = {
    GoWM,
    load: (wasmPath, options) => gowm.load(wasmPath, options),
    get: (name) => gowm.get(name),
    loadFromGitHub: (githubRepo, options) => gowm.loadFromGitHub(githubRepo, options),
    loadFromNPM: (packageName, options) => gowm.loadFromNPM(packageName, options), // Deprecated but kept for compatibility
    unload: (name) => gowm.unload(name),
    listModules: () => gowm.listModules(),
    getStats: () => gowm.getStats(),
    unloadAll: () => gowm.unloadAll(),
    isLoaded: (name) => gowm.isLoaded(name),
    getTotalMemoryUsage: () => gowm.getTotalMemoryUsage()
};
