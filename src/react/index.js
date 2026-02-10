/**
 * GoWM React Hooks
 * React integration for loading and using Go WASM modules.
 * 
 * Usage:
 *   import { useWasm, useWasmFromGitHub, useWasmWorker } from 'gowm/react';
 * 
 * @version 1.3.0
 *  Added Web Worker support (useWasmWorker)
 *  Added SharedArrayBuffer support (useSharedBuffer, useWasmWorkerWithSharedMemory)
 */

'use strict';

// React is a peer dependency — users must have it installed
let React;
try {
    React = require('react');
} catch (e) {
    // Will throw when hooks are called if React is not available
}

function ensureReact() {
    if (!React) {
        throw new Error(
            'React is required to use GoWM React hooks. ' +
            'Install it with: npm install react'
        );
    }
}

/**
 * Hook to load a WASM module from any source.
 * 
 * @param {string} source - File path, URL, or GitHub repo
 * @param {object} [options] - GoWM load options
 * @returns {{ bridge: object|null, loading: boolean, error: Error|null, reload: Function }}
 * 
 * @example
 * const { bridge, loading, error } = useWasm('./math.wasm');
 * if (bridge) bridge.call('add', 5, 3);
 */
function useWasm(source, options = {}) {
    ensureReact();
    const { useState, useEffect, useRef, useCallback } = React;

    const [bridge, setBridge] = useState(null);
    const [loading, setLoading] = useState(!!source);
    const [error, setError] = useState(null);
    const gowmRef = useRef(null);
    const mountedRef = useRef(true);

    // Serialize options for dependency tracking (stable reference)
    const optionsKey = JSON.stringify(options);

    const reload = useCallback(() => {
        if (!source) return;
        setLoading(true);
        setError(null);
        setBridge(null);
        loadModule();
    }, [source, optionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

    async function loadModule() {
        try {
            if (!gowmRef.current) {
                const GoWM = require('../core/gowm');
                gowmRef.current = new GoWM({ logLevel: options.logLevel || 'silent' });
            }

            const parsedOptions = JSON.parse(optionsKey);
            const result = await gowmRef.current.load(source, parsedOptions);

            if (mountedRef.current) {
                setBridge(result);
                setLoading(false);
            }
        } catch (err) {
            if (mountedRef.current) {
                setError(err);
                setLoading(false);
            }
        }
    }

    useEffect(() => {
        mountedRef.current = true;
        if (source) {
            setLoading(true);
            setError(null);
            setBridge(null);
            loadModule();
        }
        return () => {
            mountedRef.current = false;
            if (gowmRef.current) {
                gowmRef.current.unloadAll();
            }
        };
    }, [source, optionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

    return { bridge, loading, error, reload };
}

/**
 * Hook to load a WASM module from GitHub.
 * 
 * @param {string} repo - GitHub repo in format "owner/repo"
 * @param {object} [options] - GoWM GitHub load options (path, branch, etc.)
 * @returns {{ bridge: object|null, loading: boolean, error: Error|null, metadata: object|null, reload: Function }}
 * 
 * @example
 * const { bridge, loading, error, metadata } = useWasmFromGitHub(
 *   'benoitpetit/wasm-modules-repository',
 *   { path: 'math-wasm', branch: 'master' }
 * );
 */
function useWasmFromGitHub(repo, options = {}) {
    ensureReact();
    const { useState, useEffect, useRef, useCallback } = React;

    const [bridge, setBridge] = useState(null);
    const [loading, setLoading] = useState(!!repo);
    const [error, setError] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const gowmRef = useRef(null);
    const mountedRef = useRef(true);

    const optionsKey = JSON.stringify(options);

    const reload = useCallback(() => {
        if (!repo) return;
        setLoading(true);
        setError(null);
        setBridge(null);
        setMetadata(null);
        loadModule();
    }, [repo, optionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

    async function loadModule() {
        try {
            if (!gowmRef.current) {
                const GoWM = require('../core/gowm');
                gowmRef.current = new GoWM({ logLevel: options.logLevel || 'silent' });
            }

            const parsedOptions = JSON.parse(optionsKey);
            const result = await gowmRef.current.loadFromGitHub(repo, parsedOptions);

            if (mountedRef.current) {
                setBridge(result);
                setMetadata(result.getMetadata ? result.getMetadata() : null);
                setLoading(false);
            }
        } catch (err) {
            if (mountedRef.current) {
                setError(err);
                setLoading(false);
            }
        }
    }

    useEffect(() => {
        mountedRef.current = true;
        if (repo) {
            setLoading(true);
            setError(null);
            setBridge(null);
            setMetadata(null);
            loadModule();
        }
        return () => {
            mountedRef.current = false;
            if (gowmRef.current) {
                gowmRef.current.unloadAll();
            }
        };
    }, [repo, optionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

    return { bridge, loading, error, metadata, reload };
}

/**
 *  Hook to load a WASM module in a Web Worker
 * Prevents UI blocking during heavy computations
 * 
 * @param {string} source - File path, URL, or GitHub repo
 * @param {object} [options] - GoWM load options
 * @returns {{ worker: object|null, loading: boolean, error: Error|null, call: Function, terminate: Function }}
 * 
 * @example
 * const { worker, loading, call, terminate } = useWasmWorker('owner/repo');
 * const result = await call('heavyComputation', data);
 */
function useWasmWorker(source, options = {}) {
    ensureReact();
    const { useState, useEffect, useRef, useCallback } = React;

    const [worker, setWorker] = useState(null);
    const [loading, setLoading] = useState(!!source);
    const [error, setError] = useState(null);
    const gowmRef = useRef(null);
    const workerRef = useRef(null);
    const mountedRef = useRef(true);

    const optionsKey = JSON.stringify(options);

    async function loadWorker() {
        try {
            if (!gowmRef.current) {
                const GoWM = require('../core/gowm');
                gowmRef.current = new GoWM({ 
                    logLevel: options.logLevel || 'silent',
                    enableWorkers: true
                });
            }

            const parsedOptions = JSON.parse(optionsKey);
            const workerModule = await gowmRef.current.loadInWorker(source, parsedOptions);
            workerRef.current = workerModule;

            if (mountedRef.current) {
                setWorker(workerModule);
                setLoading(false);
            }
        } catch (err) {
            if (mountedRef.current) {
                setError(err);
                setLoading(false);
            }
        }
    }

    useEffect(() => {
        mountedRef.current = true;
        if (source) {
            setLoading(true);
            setError(null);
            setWorker(null);
            loadWorker();
        }
        return () => {
            mountedRef.current = false;
            // Terminate worker on cleanup
            if (workerRef.current && workerRef.current.terminate) {
                workerRef.current.terminate();
            }
        };
    }, [source, optionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const call = useCallback(async (functionName, ...args) => {
        if (!worker) {
            throw new Error('Worker not loaded');
        }
        return worker.call(functionName, ...args);
    }, [worker]);

    const terminate = useCallback(() => {
        if (worker && worker.terminate) {
            worker.terminate();
            setWorker(null);
        }
    }, [worker]);

    return { worker, loading, error, call, terminate, ready: !loading && !error && worker !== null };
}

/**
 *  Hook for SharedArrayBuffer-based zero-copy operations
 * Allows direct memory sharing between main thread and workers
 * 
 * @param {number} [bufferSize=1048576] - Size of shared buffer in bytes (default 1MB)
 * @returns {{ buffer: SharedArrayBuffer|null, view: Uint8Array|null, supported: boolean, writeData: Function, readData: Function, clear: Function }}
 * 
 * @example
 * const { buffer, writeData, readData, supported } = useSharedBuffer(1024 * 1024);
 * if (supported) {
 *   writeData(new Uint8Array([1,2,3]));
 * }
 */
function useSharedBuffer(bufferSize = 1024 * 1024) {
    ensureReact();
    const { useState, useEffect, useCallback } = React;

    const [buffer, setBuffer] = useState(null);
    const [supported, setSupported] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        try {
            // Check if SharedArrayBuffer is supported
            if (typeof SharedArrayBuffer === 'undefined') {
                setError(new Error('SharedArrayBuffer not supported in this environment'));
                setSupported(false);
                return;
            }

            // Create shared buffer
            const sharedBuffer = new SharedArrayBuffer(bufferSize);
            setBuffer({
                buffer: sharedBuffer,
                view: new Uint8Array(sharedBuffer),
                size: bufferSize
            });
            setSupported(true);
        } catch (err) {
            setError(err);
            setSupported(false);
        }
    }, [bufferSize]);

    const writeData = useCallback((data, offset = 0) => {
        if (!buffer) {
            throw new Error('Shared buffer not initialized');
        }

        const dataArray = new Uint8Array(data);
        if (offset + dataArray.length > buffer.size) {
            throw new Error('Data exceeds buffer size');
        }

        buffer.view.set(dataArray, offset);
        return offset + dataArray.length;
    }, [buffer]);

    const readData = useCallback((length, offset = 0) => {
        if (!buffer) {
            throw new Error('Shared buffer not initialized');
        }

        if (offset + length > buffer.size) {
            throw new Error('Read exceeds buffer size');
        }

        return buffer.view.slice(offset, offset + length);
    }, [buffer]);

    const clear = useCallback(() => {
        if (!buffer) {
            throw new Error('Shared buffer not initialized');
        }
        buffer.view.fill(0);
    }, [buffer]);

    return {
        buffer: buffer ? buffer.buffer : null,
        view: buffer ? buffer.view : null,
        size: bufferSize,
        supported,
        error,
        writeData,
        readData,
        clear,
        ready: supported && buffer !== null
    };
}

/**
 * Phase 2: Combined hook for worker + shared memory (maximum performance)
 * 
 * @param {string} source - Module source
 * @param {object} [options] - Loading options
 * @returns {object} Combined worker and shared buffer state
 */
function useWasmWorkerWithSharedMemory(source, options = {}) {
    const workerHook = useWasmWorker(source, options);
    const sharedBufferHook = useSharedBuffer(options.sharedBufferSize || 1024 * 1024);

    const callWithSharedMemory = useCallback(async (functionName, data, ...args) => {
        if (!workerHook.ready || !sharedBufferHook.ready) {
            throw new Error('Worker or shared buffer not ready');
        }

        // Write data to shared buffer
        const bytesWritten = sharedBufferHook.writeData(data);

        // Call worker function with shared buffer reference
        const result = await workerHook.call(functionName, {
            sharedBuffer: sharedBufferHook.buffer,
            offset: 0,
            length: bytesWritten
        }, ...args);

        return result;
    }, [workerHook, sharedBufferHook]);

    return {
        ...workerHook,
        sharedBuffer: sharedBufferHook,
        callWithSharedMemory,
        ready: workerHook.ready && sharedBufferHook.ready
    };
}

module.exports = { 
    useWasm, 
    useWasmFromGitHub,
    useWasmWorker,
    useSharedBuffer,
    useWasmWorkerWithSharedMemory
};
