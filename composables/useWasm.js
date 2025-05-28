const { ref, onMounted, onUnmounted, watch } = require('vue');
const { load, loadFromNPM } = require('../src/index');

/**
 * Composable Vue pour charger et utiliser des modules WASM Go
 * @param {string|Ref<string>} wasmPath - Chemin vers le fichier WASM
 * @param {object|Ref<object>} options - Options de chargement
 * @returns {object} Objet contenant wasm, loading, error et reload
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

            // Résoudre les valeurs réactives
            const path = typeof wasmPath.value !== 'undefined' ? wasmPath.value : wasmPath;
            const opts = typeof options.value !== 'undefined' ? options.value : options;

            console.log(`🔄 Chargement du module WASM: ${path}`);
            const wasmInstance = await load(path, opts);

            if (mounted) {
                wasm.value = wasmInstance;
                console.log(`✅ Module WASM chargé avec succès: ${opts.name || path}`);
            }
        } catch (err) {
            console.error(`❌ Erreur lors du chargement du module WASM: ${err.message}`);
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

    // Watcher pour les changements de path ou options
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
        // Nettoyage du module WASM si possible
        if (wasm.value && typeof wasm.value.cleanup === 'function') {
            try {
                wasm.value.cleanup();
            } catch (err) {
                console.warn('Erreur lors du nettoyage du module WASM:', err.message);
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
 * Composable Vue pour charger un module WASM depuis NPM
 * @param {string|Ref<string>} packageName - Nom du package NPM
 * @param {object|Ref<object>} options - Options de chargement
 * @returns {object} Objet contenant wasm, loading, error et reload
 */
function useWasmFromNPM(packageName, options = {}) {
    const wasm = ref(null);
    const loading = ref(true);
    const error = ref(null);

    let mounted = true;

    const loadWasm = async () => {
        if (!mounted) return;

        try {
            loading.value = true;
            error.value = null;

            // Résoudre les valeurs réactives
            const pkg = typeof packageName.value !== 'undefined' ? packageName.value : packageName;
            const opts = typeof options.value !== 'undefined' ? options.value : options;

            console.log(`🔄 Chargement du module WASM depuis NPM: ${pkg}`);
            const wasmInstance = await loadFromNPM(pkg, opts);

            if (mounted) {
                wasm.value = wasmInstance;
                console.log(`✅ Module WASM NPM chargé avec succès: ${pkg}`);
            }
        } catch (err) {
            console.error(`❌ Erreur lors du chargement du module WASM NPM: ${err.message}`);
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

    // Watcher pour les changements de packageName ou options
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
        // Nettoyage du module WASM si possible
        if (wasm.value && typeof wasm.value.cleanup === 'function') {
            try {
                wasm.value.cleanup();
            } catch (err) {
                console.warn('Erreur lors du nettoyage du module WASM:', err.message);
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
 * Composable pour utiliser plusieurs modules WASM
 * @param {Array|Ref<Array>} modules - Tableau d'objets {name, path, options} ou {name, package, options}
 * @returns {object} Objet contenant modules, loading, errors et reload
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

            // Résoudre les valeurs réactives
            const moduleList = typeof modules.value !== 'undefined' ? modules.value : modules;

            const loadPromises = moduleList.map(async (moduleConfig) => {
                const { name, path, package: pkg, options = {} } = moduleConfig;

                if (!name) {
                    throw new Error('Chaque module doit avoir un nom');
                }

                try {
                    let wasmInstance;
                    if (path) {
                        console.log(`🔄 Chargement du module WASM: ${name} depuis ${path}`);
                        wasmInstance = await load(path, { ...options, name });
                    } else if (pkg) {
                        console.log(`🔄 Chargement du module WASM: ${name} depuis NPM ${pkg}`);
                        wasmInstance = await loadFromNPM(pkg, { ...options, name });
                    } else {
                        throw new Error(`Module ${name}: path ou package requis`);
                    }

                    if (mounted) {
                        wasmModules.value[name] = wasmInstance;
                        console.log(`✅ Module WASM ${name} chargé avec succès`);
                    }
                } catch (err) {
                    console.error(`❌ Erreur lors du chargement du module ${name}: ${err.message}`);
                    if (mounted) {
                        errors.value[name] = err;
                    }
                }
            });

            await Promise.all(loadPromises);
        } catch (err) {
            console.error(`❌ Erreur lors du chargement des modules WASM: ${err.message}`);
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
            // Nettoyer les modules existants
            Object.values(wasmModules.value).forEach(wasmInstance => {
                if (wasmInstance && typeof wasmInstance.cleanup === 'function') {
                    try {
                        wasmInstance.cleanup();
                    } catch (err) {
                        console.warn('Erreur lors du nettoyage du module WASM:', err.message);
                    }
                }
            });
            wasmModules.value = {};
            loadModules();
        }
    };

    // Watcher pour les changements de modules
    if (typeof modules.value !== 'undefined') {
        watch(modules, loadModules, { deep: true });
    }

    onMounted(() => {
        loadModules();
    });

    onUnmounted(() => {
        mounted = false;
        // Nettoyage de tous les modules WASM
        Object.values(wasmModules.value).forEach(wasmInstance => {
            if (wasmInstance && typeof wasmInstance.cleanup === 'function') {
                try {
                    wasmInstance.cleanup();
                } catch (err) {
                    console.warn('Erreur lors du nettoyage du module WASM:', err.message);
                }
            }
        });
    });

    return {
        modules: wasmModules,
        loading,
        errors,
        reload
    };
}

module.exports = {
    useWasm,
    useWasmFromNPM,
    useMultipleWasm
};
