/**
 * React Hooks for GoWM
 *  Web Worker support with useWasmWorker hook
 * 
 * @version 1.3.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook to load and use a WASM module in the main thread
 * @param {string} source - Module source
 * @param {Object} options - Loading options
 * @returns {Object} Module state and methods
 */
export function useWasm(source, options = {}) {
    const [module, setModule] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const loaderRef = useRef(null);

    useEffect(() => {
        let mounted = true;

        async function loadModule() {
            try {
                if (!loaderRef.current) {
                    const GoWM = window.GoWM || (await import('../index.js')).default;
                    loaderRef.current = new GoWM(options);
                }

                const mod = await loaderRef.current.load(source, options);
                
                if (mounted) {
                    setModule(mod);
                    setLoading(false);
                }
            } catch (err) {
                if (mounted) {
                    setError(err);
                    setLoading(false);
                }
            }
        }

        loadModule();

        return () => {
            mounted = false;
        };
    }, [source]);

    const call = useCallback(async (functionName, ...args) => {
        if (!module) {
            throw new Error('Module not loaded');
        }
        return module.call(functionName, ...args);
    }, [module]);

    return {
        module,
        loading,
        error,
        call,
        ready: !loading && !error && module !== null
    };
}

/**
 *  Hook to load and use a WASM module in a Web Worker
 * Prevents UI blocking during heavy computations
 * @param {string} source - Module source
 * @param {Object} options - Loading options
 * @returns {Object} Worker state and methods
 */
export function useWasmWorker(source, options = {}) {
    const [worker, setWorker] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const loaderRef = useRef(null);
    const workerRef = useRef(null);

    useEffect(() => {
        let mounted = true;

        async function loadWorker() {
            try {
                if (!loaderRef.current) {
                    const GoWM = window.GoWM || (await import('../index.js')).default;
                    loaderRef.current = new GoWM({
                        ...options,
                        enableWorkers: true
                    });
                }

                const workerModule = await loaderRef.current.loadInWorker(source, options);
                workerRef.current = workerModule;
                
                if (mounted) {
                    setWorker(workerModule);
                    setLoading(false);
                }
            } catch (err) {
                if (mounted) {
                    setError(err);
                    setLoading(false);
                }
            }
        }

        loadWorker();

        return () => {
            mounted = false;
            // Cleanup: terminate worker on unmount
            if (workerRef.current && workerRef.current.terminate) {
                workerRef.current.terminate();
            }
        };
    }, [source]);

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

    const getStatus = useCallback(() => {
        if (worker && worker.getStatus) {
            return worker.getStatus();
        }
        return null;
    }, [worker]);

    return {
        worker,
        loading,
        error,
        call,
        terminate,
        getStatus,
        ready: !loading && !error && worker !== null,
        inWorker: true
    };
}

/**
 *  Hook for SharedArrayBuffer-based zero-copy operations
 * Allows direct memory sharing between main thread and workers
 * @param {number} bufferSize - Size of shared buffer in bytes
 * @returns {Object} Shared buffer and utilities
 */
export function useSharedBuffer(bufferSize = 1024 * 1024) {
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
 * Advanced hook: Combines worker and shared buffer for maximum performance
 * @param {string} source - Module source
 * @param {Object} options - Loading options
 * @returns {Object} Combined worker and shared buffer state
 */
export function useWasmWorkerWithSharedMemory(source, options = {}) {
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
            length: bytesWritten,
            ...args
        });

        return result;
    }, [workerHook, sharedBufferHook]);

    return {
        ...workerHook,
        sharedBuffer: sharedBufferHook,
        callWithSharedMemory,
        ready: workerHook.ready && sharedBufferHook.ready
    };
}

// Default export
export default {
    useWasm,
    useWasmWorker,
    useSharedBuffer,
    useWasmWorkerWithSharedMemory
};
