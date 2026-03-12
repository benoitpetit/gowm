/**
 * GoWM Vue 3 Composables
 * Vue 3 Composition API integration for loading and using Go WASM modules.
 * 
 * Usage:
 *   import { useWasm, useWasmFromGitHub, useWasmWorker, useSharedBuffer } from 'gowm/vue';
 * 
 * @version 1.1.6
 * @features Web Worker support, SharedArrayBuffer support
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

// Detect browser environment for Worker support
const isBrowser = typeof window !== 'undefined' && typeof Worker !== 'undefined';

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

/**
 * Composable to load a WASM module in a Web Worker.
 * Prevents UI blocking during heavy computations.
 * 
 * @param {string|import('vue').Ref<string>} source - File path, URL, or GitHub repo
 * @param {object} [options] - GoWM load options
 * @param {number} [options.workerTimeout=30000] - Worker initialization timeout
 * @param {number} [options.maxWorkers=4] - Maximum number of concurrent workers
 * @param {boolean} [options.debug=false] - Enable debug logging
 * @returns {{ worker: Ref, loading: Ref<boolean>, error: Ref<Error|null>, call: Function, terminate: Function, ready: Ref<boolean> }}
 * 
 * @example
 * const { worker, loading, call, terminate, ready } = useWasmWorker('owner/repo');
 * if (ready.value) {
 *   const result = await call('heavyComputation', data);
 * }
 */
function useWasmWorker(source, options = {}) {
    ensureVue();
    const { ref, watch, onUnmounted, unref, isRef } = Vue;

    const worker = ref(null);
    const loading = ref(false);
    const error = ref(null);
    const ready = ref(false);
    let gowmInstance = null;
    let workerRef = null;

    async function loadWorker() {
        if (!isBrowser) {
            error.value = new Error('Web Workers are not supported in this environment');
            return;
        }

        const src = unref(source);
        if (!src) return;

        loading.value = true;
        error.value = null;
        worker.value = null;
        ready.value = false;

        try {
            if (!gowmInstance) {
                const GoWM = require('../core/gowm');
                gowmInstance = new GoWM({ 
                    logLevel: options.logLevel || 'silent',
                    enableWorkers: true
                });
            }

            const workerModule = await gowmInstance.loadInWorker(src, options);
            workerRef = workerModule;
            worker.value = workerModule;
            ready.value = true;
        } catch (err) {
            error.value = err;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Call a function in the worker
     * @param {string} functionName - Function to call
     * @param {...any} args - Function arguments
     * @returns {Promise<any>} Function result
     */
    async function call(functionName, ...args) {
        if (!worker.value) {
            throw new Error('Worker not loaded');
        }
        return worker.value.call(functionName, ...args);
    }

    /**
     * Terminate the worker
     */
    function terminate() {
        if (workerRef && workerRef.terminate) {
            workerRef.terminate();
        }
        worker.value = null;
        workerRef = null;
        ready.value = false;
    }

    // Watch reactive source
    if (isRef(source)) {
        watch(source, () => loadWorker(), { immediate: !!unref(source) });
    } else if (source) {
        loadWorker();
    }

    onUnmounted(() => {
        terminate();
        if (gowmInstance) {
            gowmInstance = null;
        }
    });

    return { worker, loading, error, call, terminate, ready };
}

/**
 * Composable for SharedArrayBuffer-based zero-copy operations.
 * Allows direct memory sharing between main thread and workers.
 * 
 * @param {number} [bufferSize=1048576] - Size of shared buffer in bytes (default 1MB)
 * @returns {{ buffer: Ref<SharedArrayBuffer|null>, view: Ref<Uint8Array|null>, supported: Ref<boolean>, error: Ref<Error|null>, writeData: Function, readData: Function, clear: Function, ready: Ref<boolean> }}
 * 
 * @example
 * const { buffer, view, writeData, readData, supported, ready } = useSharedBuffer(1024 * 1024);
 * if (ready.value) {
 *   writeData(new Uint8Array([1, 2, 3]));
 * }
 */
function useSharedBuffer(bufferSize = 1024 * 1024) {
    ensureVue();
    const { ref, onUnmounted } = Vue;

    const buffer = ref(null);
    const view = ref(null);
    const supported = ref(false);
    const error = ref(null);
    const ready = ref(false);
    const size = ref(bufferSize);

    // Initialize SharedArrayBuffer
    function initialize() {
        try {
            if (typeof SharedArrayBuffer === 'undefined') {
                error.value = new Error('SharedArrayBuffer not supported. Ensure COOP/COEP headers are set.');
                supported.value = false;
                ready.value = false;
                return;
            }

            const sab = new SharedArrayBuffer(bufferSize);
            buffer.value = sab;
            view.value = new Uint8Array(sab);
            supported.value = true;
            ready.value = true;
        } catch (err) {
            error.value = err;
            supported.value = false;
            ready.value = false;
        }
    }

    initialize();

    /**
     * Write data to the shared buffer
     * @param {ArrayBuffer|Uint8Array|Array} data - Data to write
     * @param {number} [offset=0] - Offset in bytes
     * @returns {number} Number of bytes written
     */
    function writeData(data, offset = 0) {
        if (!view.value) {
            throw new Error('Shared buffer not initialized');
        }
        const dataArray = new Uint8Array(data);
        if (offset + dataArray.length > size.value) {
            throw new Error('Data exceeds buffer size');
        }
        view.value.set(dataArray, offset);
        return offset + dataArray.length;
    }

    /**
     * Read data from the shared buffer
     * @param {number} length - Number of bytes to read
     * @param {number} [offset=0] - Offset in bytes
     * @returns {Uint8Array} Read data
     */
    function readData(length, offset = 0) {
        if (!view.value) {
            throw new Error('Shared buffer not initialized');
        }
        if (offset + length > size.value) {
            throw new Error('Read exceeds buffer size');
        }
        return view.value.slice(offset, offset + length);
    }

    /**
     * Clear the shared buffer (fill with zeros)
     */
    function clear() {
        if (!view.value) {
            throw new Error('Shared buffer not initialized');
        }
        view.value.fill(0);
    }

    onUnmounted(() => {
        buffer.value = null;
        view.value = null;
        ready.value = false;
    });

    return { 
        buffer, 
        view, 
        size: size.value,
        supported, 
        error, 
        ready,
        writeData, 
        readData, 
        clear 
    };
}

/**
 * Advanced composable: Combines worker and shared buffer for maximum performance.
 * 
 * @param {string|import('vue').Ref<string>} source - Module source
 * @param {object} [options] - Loading options
 * @param {number} [options.sharedBufferSize=1048576] - Shared buffer size (default 1MB)
 * @returns {object} Combined worker and shared buffer state with callWithSharedMemory
 * 
 * @example
 * const { worker, sharedBuffer, callWithSharedMemory, ready } = useWasmWorkerWithSharedMemory('owner/repo');
 * if (ready.value) {
 *   const result = await callWithSharedMemory('processData', myData);
 * }
 */
function useWasmWorkerWithSharedMemory(source, options = {}) {
    ensureVue();
    const { computed } = Vue;

    const workerHook = useWasmWorker(source, options);
    const sharedBufferHook = useSharedBuffer(options.sharedBufferSize || 1024 * 1024);

    // Combined ready state
    const ready = computed(() => workerHook.ready.value && sharedBufferHook.ready.value);

    /**
     * Call a worker function with shared memory
     * @param {string} functionName - Function to call
     * @param {ArrayBuffer|Uint8Array|Array} data - Data to write to shared buffer
     * @param {...any} args - Additional arguments
     * @returns {Promise<any>} Function result
     */
    async function callWithSharedMemory(functionName, data, ...args) {
        if (!ready.value) {
            throw new Error('Worker or shared buffer not ready');
        }

        // Write data to shared buffer
        const bytesWritten = sharedBufferHook.writeData(data);

        // Call worker function with shared buffer reference
        return workerHook.call(functionName, {
            sharedBuffer: sharedBufferHook.buffer.value,
            offset: 0,
            length: bytesWritten,
            ...args
        });
    }

    return {
        // Worker properties
        worker: workerHook.worker,
        loading: workerHook.loading,
        error: workerHook.error,
        terminate: workerHook.terminate,
        call: workerHook.call,
        
        // Shared buffer properties
        sharedBuffer: sharedBufferHook,
        buffer: sharedBufferHook.buffer,
        view: sharedBufferHook.view,
        supported: sharedBufferHook.supported,
        writeData: sharedBufferHook.writeData,
        readData: sharedBufferHook.readData,
        clear: sharedBufferHook.clear,
        
        // Combined
        ready,
        callWithSharedMemory
    };
}

module.exports = { 
    useWasm, 
    useWasmFromGitHub, 
    useWasmWorker, 
    useSharedBuffer, 
    useWasmWorkerWithSharedMemory 
};
