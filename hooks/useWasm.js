/**
 * GoWM React Hooks
 * 
 * React hooks for loading and managing Go WebAssembly modules.
 * Provides reactive state management for WASM modules with automatic cleanup.
 * 
 * @author devbyben
 * @license MIT
 */

const { useState, useEffect } = require('react');
const { load, loadFromGitHub } = require('../src/index');

/**
 * React hook for loading a local WASM module
 * 
 * @param {string} wasmPath - Path to the .wasm file or URL
 * @param {Object} [options={}] - Loading options
 * @param {string} [options.name] - Module identifier name
 * @param {string} [options.goRuntimePath] - Custom path to wasm_exec.js
 * @param {boolean} [options.preInit=true] - Pre-initialize the module
 * @returns {Object} Hook state
 * @returns {WasmBridge|null} returns.wasm - The loaded WASM bridge instance
 * @returns {boolean} returns.loading - Loading state
 * @returns {Error|null} returns.error - Error state if loading failed
 */
function useWasm(wasmPath, options = {}) {
    const [wasm, setWasm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;

        async function loadWasm() {
            try {
                setLoading(true);
                setError(null);

                const bridge = await load(wasmPath, options);

                if (mounted) {
                    setWasm(bridge);
                }
            } catch (err) {
                if (mounted) {
                    setError(err);
                    setWasm(null);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        loadWasm();

        return () => {
            mounted = false;
        };
    }, [wasmPath, JSON.stringify(options)]);

    return { wasm, loading, error };
}

/**
 * React hook for loading a WASM module from GitHub repository
 * 
 * @param {string} githubRepo - GitHub repository in format "owner/repo" or full URL
 * @param {Object} [options={}] - Loading options
 * @param {string} [options.branch='main'] - Git branch to use
 * @param {string} [options.tag] - Git tag to use (takes precedence over branch)
 * @param {string} [options.path=''] - Path within the repository
 * @param {string} [options.filename] - Specific filename
 * @param {string} [options.name] - Module name (defaults to repository name)
 * @returns {Object} Hook state
 * @returns {WasmBridge|null} returns.wasm - The loaded WASM bridge instance
 * @returns {boolean} returns.loading - Loading state
 * @returns {Error|null} returns.error - Error state if loading failed
 */
function useWasmFromGitHub(githubRepo, options = {}) {
    const [wasm, setWasm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;

        async function loadWasm() {
            try {
                setLoading(true);
                setError(null);

                console.log(`🔄 Loading WASM module from GitHub: ${githubRepo}`);
                const bridge = await loadFromGitHub(githubRepo, options);

                if (mounted) {
                    setWasm(bridge);
                    console.log(`✅ GitHub WASM module loaded successfully: ${githubRepo}`);
                }
            } catch (err) {
                console.error(`❌ Error loading GitHub WASM module: ${err.message}`);
                if (mounted) {
                    setError(err);
                    setWasm(null);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        loadWasm();

        return () => {
            mounted = false;
        };
    }, [githubRepo, JSON.stringify(options)]);

    return { wasm, loading, error };
}

/**
 * React hook for loading multiple WASM modules from GitHub repositories
 * 
 * @param {Array} githubRepos - Array of repository configurations
 * @param {Object} githubRepos[].name - Module name (required)
 * @param {string} githubRepos[].repo - GitHub repository (required)
 * @param {string} [githubRepos[].branch] - Git branch
 * @param {string} [githubRepos[].tag] - Git tag
 * @param {string} [githubRepos[].path] - Path within repository
 * @param {string} [githubRepos[].filename] - Specific filename
 * @param {Object} [options={}] - Global loading options
 * @returns {Object} Hook state
 * @returns {Object} returns.modules - Object with module names as keys and WasmBridge instances as values
 * @returns {boolean} returns.loading - Global loading state
 * @returns {Object} returns.errors - Object with module names as keys and Error instances as values
 * @returns {Function} returns.reload - Function to reload all modules
 */
function useMultipleWasmFromGitHub(githubRepos, options = {}) {
    const [modules, setModules] = useState({});
    const [loading, setLoading] = useState(true);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        let mounted = true;

        async function loadModules() {
            try {
                setLoading(true);
                setErrors({});

                const loadPromises = githubRepos.map(async (repoConfig) => {
                    const { name, repo, branch, tag, path, filename, ...repoOptions } = repoConfig;

                    if (!name || !repo) {
                        throw new Error('Each repository must have a name and repo');
                    }

                    try {
                        console.log(`🔄 Loading WASM module: ${name} from GitHub ${repo}`);
                        
                        const loadOptions = {
                            ...options,
                            ...repoOptions,
                            name,
                            branch,
                            tag,
                            path,
                            filename
                        };

                        const wasmInstance = await loadFromGitHub(repo, loadOptions);

                        if (mounted) {
                            setModules(prev => ({ ...prev, [name]: wasmInstance }));
                            console.log(`✅ GitHub module ${name} loaded successfully`);
                        }
                    } catch (err) {
                        console.error(`❌ Error loading GitHub module ${name}: ${err.message}`);
                        if (mounted) {
                            setErrors(prev => ({ ...prev, [name]: err }));
                        }
                    }
                });

                await Promise.allSettled(loadPromises);
            } catch (err) {
                console.error(`❌ Error loading GitHub WASM modules: ${err.message}`);
                if (mounted) {
                    setErrors(prev => ({ ...prev, global: err }));
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        loadModules();

        return () => {
            mounted = false;
        };
    }, [githubRepos, JSON.stringify(options)]);

    const reload = () => {
        setModules({});
        setErrors({});
        setLoading(true);
        // The useEffect will trigger and reload
    };

    return { modules, loading, errors, reload };
}

/**
 * Legacy React hook for NPM package loading
 * @deprecated This hook is deprecated and will be removed in future versions. Use useWasmFromGitHub instead.
 * @param {string} packageName - NPM package name
 * @param {Object} [options={}] - Loading options
 * @returns {Object} Hook state
 * @returns {WasmBridge|null} returns.wasm - The loaded WASM bridge instance
 * @returns {boolean} returns.loading - Loading state
 * @returns {Error|null} returns.error - Error state if loading failed
 */
function useWasmFromNPM(packageName, options = {}) {
    console.warn('⚠️  WARNING: useWasmFromNPM is deprecated and will be removed in a future version. Please use useWasmFromGitHub instead for better reliability and performance.');
    
    const { loadFromNPM } = require('../src/index');
    const [wasm, setWasm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;

        async function loadWasm() {
            try {
                setLoading(true);
                setError(null);

                console.log(`🔄 Loading WASM module from NPM: ${packageName} (deprecated)`);
                const bridge = await loadFromNPM(packageName, options);

                if (mounted) {
                    setWasm(bridge);
                    console.log(`✅ NPM WASM module loaded successfully: ${packageName}`);
                }
            } catch (err) {
                console.error(`❌ Error loading NPM WASM module: ${err.message}`);
                if (mounted) {
                    setError(err);
                    setWasm(null);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        loadWasm();

        return () => {
            mounted = false;
        };
    }, [packageName, JSON.stringify(options)]);

    return { wasm, loading, error };
}

/**
 * Module exports for React hooks
 */
module.exports = {
    useWasm,
    useWasmFromGitHub,
    useMultipleWasmFromGitHub,
    
    // Deprecated exports (kept for backward compatibility)
    /** @deprecated Use useWasmFromGitHub instead */
    useWasmFromNPM
};
