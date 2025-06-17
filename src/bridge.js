class WasmBridge {
    constructor(wasmModule, options = {}) {
        this.module = wasmModule;
        this.callbacks = new Map();
        this.name = options.name || 'unnamed';
        this.allocatedBuffers = new Set(); // Track allocated buffers for cleanup
    }

    // Function call with error handling
    call(funcName, ...args) {
        try {
            // Check WASM exports first
            if (this.module.exports && this.module.exports[funcName]) {
                return this.module.exports[funcName](...args);
            }
            // Then check global JavaScript functions (for Go WASM)
            else if (globalThis[funcName] && typeof globalThis[funcName] === 'function') {
                return globalThis[funcName](...args);
            }
            else {
                throw new Error(`Function ${funcName} not found`);
            }
        } catch (error) {
            throw new Error(`Error calling ${funcName}: ${error.message}`);
        }
    }

    // Asynchronous call with promises
    async callAsync(funcName, ...args) {
        return new Promise((resolve, reject) => {
            try {
                const result = this.call(funcName, ...args);

                // If the result is a promise, wait for it
                if (result && typeof result.then === 'function') {
                    result.then(resolve).catch(reject);
                } else {
                    resolve(result);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    // Improved buffer management for data transfer
    createBuffer(data) {
        if (!this.module.go) {
            throw new Error('Go runtime not available for buffer management');
        }

        const go = this.module.go;
        let buffer, ptr, size;

        try {
            if (data instanceof Float64Array) {
                size = data.length * data.BYTES_PER_ELEMENT;
                ptr = this.allocateMemory(size);
                buffer = new Float64Array(go.mem.buffer, ptr, data.length);
                buffer.set(data);
            } else if (data instanceof Uint8Array) {
                size = data.length;
                ptr = this.allocateMemory(size);
                buffer = new Uint8Array(go.mem.buffer, ptr, data.length);
                buffer.set(data);
            } else if (typeof data === 'string') {
                const encoder = new TextEncoder();
                const encodedData = encoder.encode(data);
                size = encodedData.length;
                ptr = this.allocateMemory(size);
                buffer = new Uint8Array(go.mem.buffer, ptr, encodedData.length);
                buffer.set(encodedData);
            } else {
                throw new Error('Unsupported data type. Supported: Float64Array, Uint8Array, string');
            }

            const bufferInfo = {
                ptr,
                buffer,
                size,
                free: () => this.freeMemory(ptr)
            };

            this.allocatedBuffers.add(bufferInfo);
            return bufferInfo;

        } catch (error) {
            throw new Error(`Failed to create buffer: ${error.message}`);
        }
    }

    // Improved memory allocation methods
    allocateMemory(size) {
        if (size <= 0) {
            throw new Error('Invalid size for memory allocation');
        }

        // For Go WASM, use Go's memory management if available
        if (globalThis.__gowm_alloc && typeof globalThis.__gowm_alloc === 'function') {
            return globalThis.__gowm_alloc(size);
        }

        // Fallback: use a temporary memory area
        // Note: This is a simplified approach, real implementations should use proper allocation
        const mem = this.module.go.mem;
        if (!mem || !mem.buffer) {
            throw new Error('Memory buffer not available');
        }

        // Simplified allocation at end of buffer (not production-ready)
        const offset = mem.buffer.byteLength;
        if (offset + size > mem.buffer.byteLength) {
            console.warn('Memory allocation might exceed buffer bounds');
        }
        
        return offset;
    }

    freeMemory(ptr) {
        // For Go WASM, the garbage collector handles cleanup
        if (globalThis.__gowm_free && typeof globalThis.__gowm_free === 'function') {
            try {
                globalThis.__gowm_free(ptr);
            } catch (error) {
                console.warn('Failed to free memory:', error.message);
            }
        }
    }

    // JavaScript callback registration
    registerCallback(name, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        this.callbacks.set(name, callback);
        globalThis[`__gowm_callback_${name}`] = callback;
    }

    // Remove a callback
    unregisterCallback(name) {
        this.callbacks.delete(name);
        delete globalThis[`__gowm_callback_${name}`];
    }

    // Get list of available functions
    getAvailableFunctions() {
        const functions = [];

        // WASM exported functions
        if (this.module.exports) {
            functions.push(...Object.keys(this.module.exports).filter(key =>
                typeof this.module.exports[key] === 'function'
            ));
        }

        // Global functions (Go WASM)
        for (const key in globalThis) {
            if (typeof globalThis[key] === 'function' && 
                !key.startsWith('__gowm_') && 
                !key.startsWith('__') &&
                !['eval', 'isFinite', 'isNaN', 'parseFloat', 'parseInt', 'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent'].includes(key)) {
                functions.push(key);
            }
        }

        return [...new Set(functions)]; // Remove duplicates
    }

    // Check if a function exists
    hasFunction(funcName) {
        return (this.module.exports && this.module.exports[funcName] && typeof this.module.exports[funcName] === 'function') ||
            (globalThis[funcName] && typeof globalThis[funcName] === 'function');
    }

    // Get module statistics
    getStats() {
        return {
            ready: this.module.ready,
            functions: this.getAvailableFunctions(),
            callbacks: Array.from(this.callbacks.keys()),
            memoryUsage: this.module.go ? this.module.go.mem.buffer.byteLength : 0,
            allocatedBuffers: this.allocatedBuffers.size,
            name: this.name
        };
    }

    // Cleanup method to release resources
    cleanup() {
        try {
            // Free all allocated buffers
            for (const bufferInfo of this.allocatedBuffers) {
                try {
                    bufferInfo.free();
                } catch (error) {
                    console.warn('Failed to free buffer:', error.message);
                }
            }
            this.allocatedBuffers.clear();

            // Remove all callbacks
            for (const name of this.callbacks.keys()) {
                this.unregisterCallback(name);
            }

            // Clean up Go resources if possible
            if (this.module.go && typeof this.module.go.exit === 'function') {
                try {
                    this.module.go.exit(0);
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
        } catch (error) {
            console.warn('Error during cleanup:', error.message);
        }
    }
}

module.exports = WasmBridge;
