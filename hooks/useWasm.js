const { useState, useEffect } = require('react');
const { load, loadFromGitHub } = require('../src/index');

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

// Hook for loading from GitHub
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

// Hook for loading multiple WASM modules from GitHub
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

// Legacy hook for NPM loading (deprecated)
/**
 * @deprecated Use useWasmFromGitHub instead
 */
function useWasmFromNPM(packageName, options = {}) {
    console.warn('useWasmFromNPM is deprecated. Use useWasmFromGitHub instead.');
    
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

module.exports = {
    useWasm,
    useWasmFromGitHub,
    useMultipleWasmFromGitHub,
    useWasmFromNPM // Deprecated but kept for compatibility
};
