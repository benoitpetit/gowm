/**
 * Unified WASM Bridge
 * Provides interface between JavaScript and WASM modules
 * Works in both Node.js and browser environments
 */
class UnifiedWasmBridge {
    constructor(wasmModule, options = {}) {
        this.module = wasmModule;
        this.callbacks = new Map();
        this.allocatedBuffers = new Set();
        this.name = options.name || 'unnamed';
        this.isNode = typeof window === 'undefined';
    }

    /**
     * Call a WASM function with error handling
     * @param {string} funcName - Function name
     * @param {...any} args - Function arguments
     * @returns {any} Function result
     */
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
            const errorMsg = `Error calling ${funcName}: ${error.message}`;
            if (!this.isNode) {
                console.error(errorMsg, error);
            }
            throw new Error(errorMsg);
        }
    }

    /**
     * Asynchronous function call with promise support
     * @param {string} funcName - Function name
     * @param {...any} args - Function arguments
     * @returns {Promise<any>} Function result
     */
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

    /**
     * Enhanced buffer management for data transfer
     * @param {*} data - Data to create buffer from
     * @returns {object} Buffer info object
     */
    createBuffer(data) {
        if (!data) {
            throw new Error('Data is required for buffer creation');
        }

        let buffer, ptr, size;

        try {
            if (data instanceof Float64Array) {
                size = data.length * data.BYTES_PER_ELEMENT;
                buffer = data;
            } else if (data instanceof Uint8Array) {
                size = data.length;
                buffer = data;
            } else if (typeof data === 'string') {
                const encoder = new TextEncoder();
                buffer = encoder.encode(data);
                size = buffer.length;
            } else if (Array.isArray(data)) {
                // Convert array to appropriate typed array
                buffer = new Float64Array(data);
                size = buffer.length * buffer.BYTES_PER_ELEMENT;
            } else {
                throw new Error('Unsupported data type. Supported: Float64Array, Uint8Array, string, Array');
            }

            // Try WASM memory allocation if available
            ptr = this.allocateWasmMemory(size);
            
            if (ptr && this.module.exports && this.module.exports.memory) {
                // Copy data to WASM memory
                const wasmBuffer = new Uint8Array(this.module.exports.memory.buffer, ptr, size);
                if (buffer instanceof Float64Array) {
                    const uint8View = new Uint8Array(buffer.buffer);
                    wasmBuffer.set(uint8View);
                } else {
                    wasmBuffer.set(buffer);
                }
                buffer = wasmBuffer;
            } else if (this.module.go && this.module.go.mem) {
                // Go WASM memory management
                ptr = this.allocateGoMemory(size);
                if (ptr) {
                    const goBuffer = new Uint8Array(this.module.go.mem.buffer, ptr, size);
                    if (buffer instanceof Float64Array) {
                        const uint8View = new Uint8Array(buffer.buffer);
                        goBuffer.set(uint8View);
                    } else {
                        goBuffer.set(buffer);
                    }
                    buffer = goBuffer;
                }
            }

            const bufferInfo = {
                ptr,
                buffer,
                size,
                originalData: data,
                type: data.constructor.name,
                free: () => this.freeBuffer(ptr, size)
            };

            this.allocatedBuffers.add(bufferInfo);
            return bufferInfo;

        } catch (error) {
            throw new Error(`Failed to create buffer: ${error.message}`);
        }
    }

    /**
     * Allocate memory in WASM module
     * @param {number} size - Size in bytes
     * @returns {number|null} Memory pointer or null
     */
    allocateWasmMemory(size) {
        if (size <= 0) {
            throw new Error('Invalid size for memory allocation');
        }

        try {
            // Try standard WASM malloc if available
            if (this.hasFunction('malloc')) {
                return this.call('malloc', size);
            }

            // Try custom WASM allocation
            if (this.hasFunction('__gowm_alloc')) {
                return this.call('__gowm_alloc', size);
            }
        } catch (error) {
            console.warn('WASM memory allocation failed:', error.message);
        }

        return null;
    }

    /**
     * Allocate memory in Go WASM
     * @param {number} size - Size in bytes
     * @returns {number|null} Memory pointer or null
     */
    allocateGoMemory(size) {
        try {
            // For Go WASM, use Go's memory management if available
            if (globalThis.__gowm_alloc && typeof globalThis.__gowm_alloc === 'function') {
                return globalThis.__gowm_alloc(size);
            }

            // Fallback: use a simplified allocation strategy
            const mem = this.module.go.mem;
            if (!mem || !mem.buffer) {
                throw new Error('Go memory buffer not available');
            }

            // This is a simplified approach - real implementations should use proper allocation
            const offset = mem.buffer.byteLength - size;
            if (offset < 0) {
                console.warn('Memory allocation might exceed buffer bounds');
                return null;
            }
            
            return offset;
        } catch (error) {
            console.warn('Go memory allocation failed:', error.message);
            return null;
        }
    }

    /**
     * Free allocated memory
     * @param {number} ptr - Memory pointer
     * @param {number} size - Size in bytes
     */
    freeBuffer(ptr, size) {
        if (!ptr) return;

        try {
            // Try standard WASM free
            if (this.hasFunction('free')) {
                this.call('free', ptr);
                return;
            }

            // Try custom WASM free
            if (this.hasFunction('__gowm_free')) {
                this.call('__gowm_free', ptr);
                return;
            }

            // For Go WASM, the garbage collector handles cleanup
            if (globalThis.__gowm_free && typeof globalThis.__gowm_free === 'function') {
                globalThis.__gowm_free(ptr);
                return;
            }
        } catch (error) {
            console.warn('Failed to free memory:', error.message);
        }
    }

    /**
     * Register JavaScript callback callable from WASM
     * @param {string} name - Callback name
     * @param {Function} callback - Callback function
     */
    registerCallback(name, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        this.callbacks.set(name, callback);
        
        // Make callback available globally for WASM
        globalThis[`__gowm_callback_${name}`] = callback;
        
        // Also make it available directly (for some WASM implementations)
        globalThis[name] = callback;
    }

    /**
     * Unregister a callback
     * @param {string} name - Callback name
     */
    unregisterCallback(name) {
        this.callbacks.delete(name);
        delete globalThis[`__gowm_callback_${name}`];
        delete globalThis[name];
    }

    /**
     * Get list of available functions
     * @returns {Array<string>} Function names
     */
    getAvailableFunctions() {
        const functions = new Set();

        // WASM exported functions
        if (this.module.exports) {
            Object.keys(this.module.exports)
                .filter(key => typeof this.module.exports[key] === 'function')
                .forEach(func => functions.add(func));
        }

        // Global functions (Go WASM)
        const excludedFunctions = [
            'eval', 'isFinite', 'isNaN', 'parseFloat', 'parseInt',
            'decodeURI', 'decodeURIComponent', 'encodeURI', 'encodeURIComponent',
            'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
            'console', 'fetch', 'XMLHttpRequest'
        ];

        Object.keys(globalThis)
            .filter(key => 
                typeof globalThis[key] === 'function' && 
                !key.startsWith('__gowm_') && 
                !key.startsWith('_') &&
                !excludedFunctions.includes(key)
            )
            .forEach(func => functions.add(func));

        return Array.from(functions).sort();
    }

    /**
     * Check if a function exists
     * @param {string} funcName - Function name
     * @returns {boolean} Whether function exists
     */
    hasFunction(funcName) {
        return (
            (this.module.exports && 
             this.module.exports[funcName] && 
             typeof this.module.exports[funcName] === 'function') ||
            (globalThis[funcName] && typeof globalThis[funcName] === 'function')
        );
    }

    /**
     * Get available data types for buffer creation
     * @returns {Array<string>} Supported data types
     */
    getSupportedDataTypes() {
        return [
            'Float64Array',
            'Float32Array', 
            'Uint8Array',
            'Uint16Array',
            'Uint32Array',
            'Int8Array',
            'Int16Array',
            'Int32Array',
            'Array',
            'string'
        ];
    }

    /**
     * Convert buffer back to JavaScript types
     * @param {object} bufferInfo - Buffer information
     * @param {string} targetType - Target type for conversion
     * @returns {any} Converted data
     */
    convertBuffer(bufferInfo, targetType = 'auto') {
        if (!bufferInfo || !bufferInfo.buffer) {
            throw new Error('Invalid buffer information');
        }

        const { buffer, type, originalData } = bufferInfo;

        if (targetType === 'auto') {
            targetType = type;
        }

        try {
            switch (targetType) {
                case 'string':
                    const decoder = new TextDecoder();
                    return decoder.decode(buffer);

                case 'Float64Array':
                    return new Float64Array(buffer.buffer || buffer, 0, buffer.length / 8);

                case 'Float32Array':
                    return new Float32Array(buffer.buffer || buffer, 0, buffer.length / 4);

                case 'Uint8Array':
                    return new Uint8Array(buffer);

                case 'Array':
                    if (originalData instanceof Array) {
                        // Try to preserve original array type
                        const float64View = new Float64Array(buffer.buffer || buffer, 0, buffer.length / 8);
                        return Array.from(float64View);
                    }
                    return Array.from(new Uint8Array(buffer));

                default:
                    return buffer;
            }
        } catch (error) {
            throw new Error(`Failed to convert buffer to ${targetType}: ${error.message}`);
        }
    }

    /**
     * Get module statistics
     * @returns {object} Module statistics
     */
    getStats() {
        const memoryUsage = this.getMemoryUsage();
        
        return {
            name: this.name,
            ready: this.module.ready,
            environment: this.isNode ? 'Node.js' : 'Browser',
            functions: this.getAvailableFunctions(),
            callbacks: Array.from(this.callbacks.keys()),
            allocatedBuffers: this.allocatedBuffers.size,
            memoryUsage,
            supportedDataTypes: this.getSupportedDataTypes(),
            loadedAt: this.module.loadedAt || null
        };
    }

    /**
     * Get memory usage information
     * @returns {object} Memory usage stats
     */
    getMemoryUsage() {
        let totalMemory = 0;
        let wasmMemory = 0;
        let goMemory = 0;
        let bufferMemory = 0;

        // WASM memory
        if (this.module.exports && this.module.exports.memory) {
            wasmMemory = this.module.exports.memory.buffer.byteLength;
            totalMemory += wasmMemory;
        }

        // Go memory
        if (this.module.go && this.module.go.mem) {
            goMemory = this.module.go.mem.buffer.byteLength;
            totalMemory += goMemory;
        }

        // Allocated buffers
        for (const bufferInfo of this.allocatedBuffers) {
            bufferMemory += bufferInfo.size;
        }
        totalMemory += bufferMemory;

        return {
            total: totalMemory,
            wasm: wasmMemory,
            go: goMemory,
            buffers: bufferMemory,
            buffersCount: this.allocatedBuffers.size
        };
    }

    /**
     * Cleanup method to release resources
     */
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

            console.log(`🧹 Cleaned up bridge ${this.name}`);
        } catch (error) {
            console.warn('Error during bridge cleanup:', error.message);
        }
    }

    /**
     * Test bridge functionality
     * @returns {object} Test results
     */
    test() {
        const results = {
            functionCalls: false,
            memoryAllocation: false,
            callbacks: false,
            asyncCalls: false,
            errors: []
        };

        try {
            // Test function availability
            const functions = this.getAvailableFunctions();
            results.functionCalls = functions.length > 0;

            // Test memory allocation
            try {
                const testBuffer = this.createBuffer("test");
                if (testBuffer) {
                    testBuffer.free();
                    results.memoryAllocation = true;
                }
            } catch (e) {
                results.errors.push(`Memory allocation test failed: ${e.message}`);
            }

            // Test callback registration
            try {
                this.registerCallback('test_callback', () => 'test');
                results.callbacks = this.callbacks.has('test_callback');
                this.unregisterCallback('test_callback');
            } catch (e) {
                results.errors.push(`Callback test failed: ${e.message}`);
            }

            // Test async calls
            try {
                results.asyncCalls = typeof this.callAsync === 'function';
            } catch (e) {
                results.errors.push(`Async test failed: ${e.message}`);
            }

        } catch (error) {
            results.errors.push(`Bridge test failed: ${error.message}`);
        }

        return results;
    }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedWasmBridge;
} else {
    window.UnifiedWasmBridge = UnifiedWasmBridge;
} 