const { ref, onMounted, onUnmounted, watch } = require('vue');
const { load, loadFromGitHub } = require('../src/index');

/**
 * Vue composable for loading and using Go WASM modules
 * @param {string|Ref<string>} wasmPath - Path to the WASM file
 * @param {object|Ref<object>} options - Loading options
 * @returns {object} Object containing wasm, loading, error and reload
 */
function useWasm(wasmPath, options = {}) {
    const wasm = ref(null);
    const loading = ref(true);
    const error = ref(null);

    let mounted = true;

    const loadWasm = async () => {
        if (!mounted) return;

        try {
            loading.value = true;
            error.value = null;

            // Resolve reactive values
            const path = typeof wasmPath.value !== 'undefined' ? wasmPath.value : wasmPath;
            const opts = typeof options.value !== 'undefined' ? options.value : options;

            console.log(`🔄 Loading WASM module: ${path}`);
            const wasmInstance = await load(path, opts);

            if (mounted) {
                wasm.value = wasmInstance;
                console.log(`✅ WASM module loaded successfully: ${opts.name || path}`);
            }
        } catch (err) {
            console.error(`❌ Error loading WASM module: ${err.message}`);
            if (mounted) {
                error.value = err;
                wasm.value = null;
            }
        } finally {
            if (mounted) {
                loading.value = false;
            }
        }
    };

    const reload = () => {
        if (mounted) {
            loadWasm();
        }
    };

    // Watcher for path or options changes
    if (typeof wasmPath.value !== 'undefined') {
        watch(wasmPath, loadWasm);
    }
    if (typeof options.value !== 'undefined') {
        watch(options, loadWasm, { deep: true });
    }

    onMounted(() => {
        loadWasm();
    });

    onUnmounted(() => {
        mounted = false;
        // Clean up WASM module if possible
        if (wasm.value && typeof wasm.value.cleanup === 'function') {
            try {
                wasm.value.cleanup();
            } catch (err) {
                console.warn('Error during WASM module cleanup:', err.message);
            }
        }
    });

    return {
        wasm,
        loading,
        error,
        reload
    };
}

/**
 * Vue composable for loading a WASM module from GitHub repository
 * @param {string|Ref<string>} githubRepo - GitHub repository ("owner/repo" or full URL)
 * @param {object|Ref<object>} options - Loading options
 * @param {string} options.branch - Git branch (default: 'main')
 * @param {string} options.tag - Git tag (takes precedence over branch)
 * @param {string} options.path - Path within repository
 * @param {string} options.filename - Specific filename
 * @returns {object} Object containing wasm, loading, error and reload
 */
function useWasmFromGitHub(githubRepo, options = {}) {
    const wasm = ref(null);
    const loading = ref(true);
    const error = ref(null);

    let mounted = true;

    const loadWasm = async () => {
        if (!mounted) return;

        try {
            loading.value = true;
            error.value = null;

            // Resolve reactive values
            const repo = typeof githubRepo.value !== 'undefined' ? githubRepo.value : githubRepo;
            const opts = typeof options.value !== 'undefined' ? options.value : options;

            console.log(`🔄 Loading WASM module from GitHub: ${repo}`);
            const wasmInstance = await loadFromGitHub(repo, opts);

            if (mounted) {
                wasm.value = wasmInstance;
                console.log(`✅ GitHub WASM module loaded successfully: ${repo}`);
            }
        } catch (err) {
            console.error(`❌ Error loading GitHub WASM module: ${err.message}`);
            if (mounted) {
                error.value = err;
                wasm.value = null;
            }
        } finally {
            if (mounted) {
                loading.value = false;
            }
        }
    };

    const reload = () => {
        if (mounted) {
            loadWasm();
        }
    };

    // Watcher for githubRepo or options changes
    if (typeof githubRepo.value !== 'undefined') {
        watch(githubRepo, loadWasm);
    }
    if (typeof options.value !== 'undefined') {
        watch(options, loadWasm, { deep: true });
    }

    onMounted(() => {
        loadWasm();
    });

    onUnmounted(() => {
        mounted = false;
        // Clean up WASM module if possible
        if (wasm.value && typeof wasm.value.cleanup === 'function') {
            try {
                wasm.value.cleanup();
            } catch (err) {
                console.warn('Error during WASM module cleanup:', err.message);
            }
        }
    });

    return {
        wasm,
        loading,
        error,
        reload
    };
}

/**
 * Composable for using multiple WASM modules
 * @param {Array|Ref<Array>} modules - Array of objects {name, path, options} or {name, github, options}
 * @returns {object} Object containing modules, loading, errors and reload
 */
function useMultipleWasm(modules = []) {
    const wasmModules = ref({});
    const loading = ref(true);
    const errors = ref({});

    let mounted = true;

    const loadModules = async () => {
        if (!mounted) return;

        try {
            loading.value = true;
            errors.value = {};

            // Resolve reactive values
            const moduleList = typeof modules.value !== 'undefined' ? modules.value : modules;

            const loadPromises = moduleList.map(async (moduleConfig) => {
                const { name, path, github, options = {} } = moduleConfig;

                if (!name) {
                    throw new Error('Each module must have a name');
                }

                try {
                    let wasmInstance;
                    if (path) {
                        console.log(`🔄 Loading WASM module: ${name} from ${path}`);
                        wasmInstance = await load(path, { ...options, name });
                    } else if (github) {
                        console.log(`🔄 Loading WASM module: ${name} from GitHub ${github}`);
                        wasmInstance = await loadFromGitHub(github, { ...options, name });
                    } else {
                        throw new Error(`Module ${name} must have either 'path' or 'github' specified`);
                    }

                    if (mounted) {
                        wasmModules.value[name] = wasmInstance;
                        console.log(`✅ Module ${name} loaded successfully`);
                    }
                } catch (err) {
                    console.error(`❌ Error loading module ${name}: ${err.message}`);
                    if (mounted) {
                        errors.value[name] = err;
                    }
                }
            });

            await Promise.allSettled(loadPromises);
        } catch (err) {
            console.error(`❌ Error loading WASM modules: ${err.message}`);
            if (mounted) {
                errors.value.global = err;
            }
        } finally {
            if (mounted) {
                loading.value = false;
            }
        }
    };

    const reload = () => {
        if (mounted) {
            // Clear existing modules before reloading
            wasmModules.value = {};
            loadModules();
        }
    };

    // Watcher for modules changes
    if (typeof modules.value !== 'undefined') {
        watch(modules, loadModules, { deep: true });
    }

    onMounted(() => {
        loadModules();
    });

    onUnmounted(() => {
        mounted = false;
        // Clean up all WASM modules if possible
        for (const wasmInstance of Object.values(wasmModules.value)) {
            if (wasmInstance && typeof wasmInstance.cleanup === 'function') {
                try {
                    wasmInstance.cleanup();
                } catch (err) {
                    console.warn('Error during WASM module cleanup:', err.message);
                }
            }
        }
    });

    return {
        modules: wasmModules,
        loading,
        errors,
        reload
    };
}

/**
 * Advanced composable for loading multiple WASM modules from GitHub
 * @param {Array|Ref<Array>} githubRepos - Array of GitHub repository configurations
 * @returns {object} Object containing modules, loading, errors and reload
 */
function useMultipleWasmFromGitHub(githubRepos = []) {
    const wasmModules = ref({});
    const loading = ref(true);
    const errors = ref({});

    let mounted = true;

    const loadModules = async () => {
        if (!mounted) return;

        try {
            loading.value = true;
            errors.value = {};

            // Resolve reactive values
            const repoList = typeof githubRepos.value !== 'undefined' ? githubRepos.value : githubRepos;

            const loadPromises = repoList.map(async (repoConfig) => {
                const { name, repo, branch, tag, path, filename, options = {} } = repoConfig;

                if (!name || !repo) {
                    throw new Error('Each repository must have a name and repo');
                }

                try {
                    console.log(`🔄 Loading WASM module: ${name} from GitHub ${repo}`);
                    
                    const loadOptions = {
                        ...options,
                        name,
                        branch,
                        tag,
                        path,
                        filename
                    };

                    const wasmInstance = await loadFromGitHub(repo, loadOptions);

                    if (mounted) {
                        wasmModules.value[name] = wasmInstance;
                        console.log(`✅ GitHub module ${name} loaded successfully`);
                    }
                } catch (err) {
                    console.error(`❌ Error loading GitHub module ${name}: ${err.message}`);
                    if (mounted) {
                        errors.value[name] = err;
                    }
                }
            });

            await Promise.allSettled(loadPromises);
        } catch (err) {
            console.error(`❌ Error loading GitHub WASM modules: ${err.message}`);
            if (mounted) {
                errors.value.global = err;
            }
        } finally {
            if (mounted) {
                loading.value = false;
            }
        }
    };

    const reload = () => {
        if (mounted) {
            // Clear existing modules before reloading
            wasmModules.value = {};
            loadModules();
        }
    };

    // Watcher for repo changes
    if (typeof githubRepos.value !== 'undefined') {
        watch(githubRepos, loadModules, { deep: true });
    }

    onMounted(() => {
        loadModules();
    });

    onUnmounted(() => {
        mounted = false;
        // Clean up all WASM modules if possible
        for (const wasmInstance of Object.values(wasmModules.value)) {
            if (wasmInstance && typeof wasmInstance.cleanup === 'function') {
                try {
                    wasmInstance.cleanup();
                } catch (err) {
                    console.warn('Error during WASM module cleanup:', err.message);
                }
            }
        }
    });

    return {
        modules: wasmModules,
        loading,
        errors,
        reload
    };
}

// Legacy function for backward compatibility
/**
 * @deprecated Use useWasmFromGitHub instead
 */
function useWasmFromNPM(packageName, options = {}) {
    console.warn('useWasmFromNPM is deprecated. Use useWasmFromGitHub instead.');
    
    // For now, redirect to the old implementation
    const { loadFromNPM } = require('../src/index');
    
    const wasm = ref(null);
    const loading = ref(true);
    const error = ref(null);

    let mounted = true;

    const loadWasm = async () => {
        if (!mounted) return;

        try {
            loading.value = true;
            error.value = null;

            const pkg = typeof packageName.value !== 'undefined' ? packageName.value : packageName;
            const opts = typeof options.value !== 'undefined' ? options.value : options;

            console.log(`🔄 Loading WASM module from NPM: ${pkg} (deprecated)`);
            const wasmInstance = await loadFromNPM(pkg, opts);

            if (mounted) {
                wasm.value = wasmInstance;
                console.log(`✅ NPM WASM module loaded successfully: ${pkg}`);
            }
        } catch (err) {
            console.error(`❌ Error loading NPM WASM module: ${err.message}`);
            if (mounted) {
                error.value = err;
                wasm.value = null;
            }
        } finally {
            if (mounted) {
                loading.value = false;
            }
        }
    };

    const reload = () => {
        if (mounted) {
            loadWasm();
        }
    };

    // Watcher for packageName or options changes
    if (typeof packageName.value !== 'undefined') {
        watch(packageName, loadWasm);
    }
    if (typeof options.value !== 'undefined') {
        watch(options, loadWasm, { deep: true });
    }

    onMounted(() => {
        loadWasm();
    });

    onUnmounted(() => {
        mounted = false;
        // Clean up WASM module if possible
        if (wasm.value && typeof wasm.value.cleanup === 'function') {
            try {
                wasm.value.cleanup();
            } catch (err) {
                console.warn('Error during WASM module cleanup:', err.message);
            }
        }
    });

    return {
        wasm,
        loading,
        error,
        reload
    };
}

module.exports = {
    useWasm,
    useWasmFromGitHub,
    useMultipleWasm,
    useMultipleWasmFromGitHub,
    useWasmFromNPM // Deprecated but kept for compatibility
};
