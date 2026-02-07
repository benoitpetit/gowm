/**
 * GoWM Vue 3 Composables
 * Vue 3 Composition API integration for loading and using Go WASM modules.
 * 
 * Usage:
 *   import { useWasm, useWasmFromGitHub } from 'gowm/vue';
 * 
 * @version 1.1.1
 */

'use strict';

// Vue is a peer dependency — users must have it installed
let Vue;
try {
    Vue = require('vue');
} catch (e) {
    // Will throw when composables are called if Vue is not available
}

function ensureVue() {
    if (!Vue || !Vue.ref) {
        throw new Error(
            'Vue 3 is required to use GoWM Vue composables. ' +
            'Install it with: npm install vue'
        );
    }
}

/**
 * Composable to load a WASM module from any source.
 * 
 * @param {string|import('vue').Ref<string>} source - File path, URL, or GitHub repo
 * @param {object} [options] - GoWM load options
 * @returns {{ bridge: Ref, loading: Ref<boolean>, error: Ref<Error|null>, reload: Function }}
 * 
 * @example
 * const { bridge, loading, error } = useWasm('./math.wasm');
 * if (bridge.value) bridge.value.call('add', 5, 3);
 */
function useWasm(source, options = {}) {
    ensureVue();
    const { ref, watch, onUnmounted, unref, isRef } = Vue;

    const bridge = ref(null);
    const loading = ref(!!unref(source));
    const error = ref(null);
    let gowmInstance = null;

    async function loadModule() {
        const src = unref(source);
        if (!src) return;

        loading.value = true;
        error.value = null;
        bridge.value = null;

        try {
            if (!gowmInstance) {
                const GoWM = require('../core/gowm');
                gowmInstance = new GoWM({ logLevel: options.logLevel || 'silent' });
            }

            const result = await gowmInstance.load(src, options);
            bridge.value = result;
        } catch (err) {
            error.value = err;
        } finally {
            loading.value = false;
        }
    }

    function reload() {
        loadModule();
    }

    // Watch reactive source
    if (isRef(source)) {
        watch(source, () => loadModule(), { immediate: true });
    } else {
        loadModule();
    }

    onUnmounted(() => {
        if (gowmInstance) {
            gowmInstance.unloadAll();
            gowmInstance = null;
        }
    });

    return { bridge, loading, error, reload };
}

/**
 * Composable to load a WASM module from GitHub.
 * 
 * @param {string|import('vue').Ref<string>} repo - GitHub repo "owner/repo"
 * @param {object} [options] - GoWM GitHub load options (path, branch, etc.)
 * @returns {{ bridge: Ref, loading: Ref<boolean>, error: Ref<Error|null>, metadata: Ref, reload: Function }}
 * 
 * @example
 * const { bridge, loading, error, metadata } = useWasmFromGitHub(
 *   'benoitpetit/wasm-modules-repository',
 *   { path: 'math-wasm', branch: 'master' }
 * );
 */
function useWasmFromGitHub(repo, options = {}) {
    ensureVue();
    const { ref, watch, onUnmounted, unref, isRef } = Vue;

    const bridge = ref(null);
    const loading = ref(!!unref(repo));
    const error = ref(null);
    const metadata = ref(null);
    let gowmInstance = null;

    async function loadModule() {
        const repoStr = unref(repo);
        if (!repoStr) return;

        loading.value = true;
        error.value = null;
        bridge.value = null;
        metadata.value = null;

        try {
            if (!gowmInstance) {
                const GoWM = require('../core/gowm');
                gowmInstance = new GoWM({ logLevel: options.logLevel || 'silent' });
            }

            const result = await gowmInstance.loadFromGitHub(repoStr, options);
            bridge.value = result;
            metadata.value = result.getMetadata ? result.getMetadata() : null;
        } catch (err) {
            error.value = err;
        } finally {
            loading.value = false;
        }
    }

    function reload() {
        loadModule();
    }

    if (isRef(repo)) {
        watch(repo, () => loadModule(), { immediate: true });
    } else {
        loadModule();
    }

    onUnmounted(() => {
        if (gowmInstance) {
            gowmInstance.unloadAll();
            gowmInstance = null;
        }
    });

    return { bridge, loading, error, metadata, reload };
}

module.exports = { useWasm, useWasmFromGitHub };
