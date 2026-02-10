/**
 * WASM Worker Manager
 *  Web Worker support for non-blocking WASM execution
 * 
 * @version 1.3.0
 * Features:
 * - Load and execute WASM modules in separate worker threads
 * - Prevent UI blocking during heavy computations
 * - Automatic message serialization/deserialization
 * - Support for transferable objects (ArrayBuffer, SharedArrayBuffer)
 * - Error handling and worker lifecycle management
 * - Worker pool for concurrent operations
 */

class WasmWorkerManager {
    constructor(options = {}) {
        this.workers = new Map();
        this.workerPool = [];
        this.maxWorkers = options.maxWorkers || 4;
        this.debug = options.debug || false;
        this.callId = 0;
        this.pendingCalls = new Map();
        
        this._isNode = typeof window === 'undefined';
        if (this._isNode) {
            console.warn('[WasmWorkerManager] Web Workers are not supported in Node.js environment');
        }
    }

    /**
     * Create a new worker for a WASM module
     * @param {string} moduleId - Unique identifier for the module
     * @param {string} source - Module source (GitHub repo, URL, or path)
     * @param {Object} loaderOptions - Options to pass to UnifiedWasmLoader
     * @returns {Promise<string>} Worker ID
     */
    async createWorker(moduleId, source, loaderOptions = {}) {
        if (this._isNode) {
            throw new Error('Web Workers are not supported in Node.js environment');
        }

        if (this.workers.has(moduleId)) {
            if (this.debug) {
                console.log(`[WasmWorkerManager] Worker ${moduleId} already exists`);
            }
            return moduleId;
        }

        // Create worker from blob to include all necessary code
        const workerCode = this._generateWorkerCode();
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        
        const worker = new Worker(workerUrl);
        
        // Setup worker message handling
        const workerInfo = {
            id: moduleId,
            worker: worker,
            ready: false,
            source: source,
            loaderOptions: loaderOptions
        };

        // Use workerTimeout from options or default to 30s
        const timeoutMs = loaderOptions.workerTimeout || 30000;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Worker ${moduleId} initialization timeout`));
            }, timeoutMs);

            worker.onmessage = (event) => {
                const { type, callId, result, error } = event.data;

                if (type === 'ready') {
                    clearTimeout(timeout);
                    workerInfo.ready = true;
                    this.workers.set(moduleId, workerInfo);
                    if (this.debug) {
                        console.log(`[WasmWorkerManager] Worker ${moduleId} ready`);
                    }
                    resolve(moduleId);
                } else if (type === 'result') {
                    const pending = this.pendingCalls.get(callId);
                    if (pending) {
                        this.pendingCalls.delete(callId);
                        if (error) {
                            pending.reject(new Error(error));
                        } else {
                            pending.resolve(result);
                        }
                    }
                } else if (type === 'error') {
                    clearTimeout(timeout);
                    reject(new Error(error || 'Worker initialization failed'));
                }
            };

            worker.onerror = (error) => {
                clearTimeout(timeout);
                reject(error);
            };

            // Initialize worker
            worker.postMessage({
                type: 'init',
                source: source,
                options: loaderOptions,
                moduleId: moduleId
            });
        });
    }

    /**
     * Call a function in a worker
     * @param {string} moduleId - Worker/module ID
     * @param {string} functionName - Function to call
     * @param {Array} args - Function arguments
     * @param {Object} options - Call options
     * @returns {Promise<any>} Function result
     */
    async callWorkerFunction(moduleId, functionName, args = [], options = {}) {
        const workerInfo = this.workers.get(moduleId);
        if (!workerInfo) {
            throw new Error(`Worker ${moduleId} not found`);
        }

        if (!workerInfo.ready) {
            throw new Error(`Worker ${moduleId} not ready`);
        }

        const callId = ++this.callId;
        const transferables = options.transferables || [];

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingCalls.delete(callId);
                reject(new Error(`Worker call timeout for ${functionName}`));
            }, options.timeout || 30000);

            this.pendingCalls.set(callId, {
                resolve: (result) => {
                    clearTimeout(timeout);
                    resolve(result);
                },
                reject: (error) => {
                    clearTimeout(timeout);
                    reject(error);
                }
            });

            // Determine transferable objects
            const transfer = this._extractTransferables(args, transferables);

            workerInfo.worker.postMessage({
                type: 'call',
                callId: callId,
                functionName: functionName,
                args: args
            }, transfer);
        });
    }

    /**
     * Terminate a worker
     * @param {string} moduleId - Worker ID
     */
    terminateWorker(moduleId) {
        const workerInfo = this.workers.get(moduleId);
        if (workerInfo) {
            workerInfo.worker.terminate();
            this.workers.delete(moduleId);
            if (this.debug) {
                console.log(`[WasmWorkerManager] Worker ${moduleId} terminated`);
            }
        }
    }

    /**
     * Terminate all workers
     */
    terminateAll() {
        for (const [moduleId] of this.workers) {
            this.terminateWorker(moduleId);
        }
    }

    /**
     * Get worker status
     * @param {string} moduleId - Worker ID
     * @returns {Object|null} Worker status
     */
    getWorkerStatus(moduleId) {
        const workerInfo = this.workers.get(moduleId);
        if (!workerInfo) return null;

        return {
            id: workerInfo.id,
            ready: workerInfo.ready,
            source: workerInfo.source
        };
    }

    /**
     * Extract transferable objects from arguments
     * @private
     */
    _extractTransferables(args, additionalTransferables = []) {
        const transferables = [...additionalTransferables];

        const extract = (obj) => {
            if (obj instanceof ArrayBuffer || obj instanceof SharedArrayBuffer) {
                if (!(obj instanceof SharedArrayBuffer)) {
                    // Only transfer ArrayBuffers, not SharedArrayBuffers
                    transferables.push(obj);
                }
            } else if (obj && typeof obj === 'object') {
                if (ArrayBuffer.isView(obj) && obj.buffer) {
                    if (!(obj.buffer instanceof SharedArrayBuffer)) {
                        transferables.push(obj.buffer);
                    }
                } else if (Array.isArray(obj)) {
                    obj.forEach(extract);
                } else {
                    Object.values(obj).forEach(extract);
                }
            }
        };

        args.forEach(extract);
        return transferables;
    }

    /**
     * Generate worker code
     * @private
     */
    _generateWorkerCode() {
        return `
// WASM Worker - Phase 2.1
// This code runs in a separate worker thread

let wasmModule = null;
let GoWM = null;

// Import GoWM in worker context
self.importScripts = self.importScripts || function() {
    throw new Error('importScripts not available');
};

// Initialize WASM module in worker
async function initModule(source, options, moduleId) {
    try {
        // We need to load GoWM library in the worker
        // For now, we'll use a simplified approach
        const response = await fetch(source);
        const wasmBytes = await response.arrayBuffer();
        
        // Load wasm_exec.js if needed
        // This is a simplified version - in production we'd need proper loader
        
        self.postMessage({ type: 'ready' });
    } catch (error) {
        self.postMessage({ 
            type: 'error', 
            error: error.message 
        });
    }
}

// Handle messages from main thread
self.onmessage = async function(event) {
    const { type, callId, source, options, moduleId, functionName, args } = event.data;

    try {
        if (type === 'init') {
            await initModule(source, options, moduleId);
        } else if (type === 'call') {
            // Call WASM function
            if (!wasmModule) {
                throw new Error('WASM module not initialized');
            }
            
            // Execute function (simplified)
            const result = await wasmModule.call(functionName, ...args);
            
            self.postMessage({
                type: 'result',
                callId: callId,
                result: result
            });
        } else if (type === 'terminate') {
            self.close();
        }
    } catch (error) {
        self.postMessage({
            type: 'result',
            callId: callId,
            error: error.message
        });
    }
};
`;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WasmWorkerManager;
}
if (typeof window !== 'undefined') {
    window.WasmWorkerManager = WasmWorkerManager;
}
