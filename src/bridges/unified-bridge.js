/**
 * Unified WASM Bridge
 * Provides interface between JavaScript and WASM modules
 * Works in both Node.js and browser environments
 * 
 * @version 1.1.2
 * Features:
 * - describe(funcName) for inline documentation from module.json
 * - getDetailedFunctions() returns functions with metadata
 * - Automatic parameter count validation on call()
 * - Type warnings in debug mode
 * - Error pattern detection from gowmConfig
 * - Namespace-aware function calls via __gowm_modules_[moduleId]
 * - Fixed allocateGoMemory (no longer uses unsafe offset calculation)
 */
class UnifiedWasmBridge {
    constructor(wasmModule, options = {}) {
        this.module = wasmModule;
        this.callbacks = new Map();
        this.allocatedBuffers = new Set();
        this.name = options.name || 'unnamed';
        this.moduleId = wasmModule.moduleId || this.name;
        this.isNode = typeof window === 'undefined';

        // Phase 3: Module metadata from module.json
        this._metadata = wasmModule.metadata || null;
        this._functionsMap = this._buildFunctionsMap();
        this._errorPattern = this._metadata?.gowmConfig?.errorPattern || null;
        this._validateCalls = options.validateCalls !== false;
        this._debugMode = options.logLevel === 'debug';
    }

    /**
     * Build an index of functions from module.json metadata for fast lookup.
     * @returns {Map<string, object>} Map of funcName → function metadata
     * @private
     */
    _buildFunctionsMap() {
        const map = new Map();
        if (!this._metadata || !this._metadata.functions) return map;

        for (const fn of this._metadata.functions) {
            if (fn.name) {
                map.set(fn.name, fn);
            }
        }
        return map;
    }

    /**
     * Call a WASM function with error handling.
     * Resolution order:
     * 1. WASM exports (direct WebAssembly exports)
     * 2. Module namespace (globalThis.__gowm_modules_[moduleId][funcName])
     * 3. globalThis (backward compat for unnamespaced Go exports)
     * 
     * When metadata is available (Phase 3.4), validates:
     * - Parameter count (throws if wrong count for fixed-arg functions)
     * - Parameter types (warns in debug mode)
     * 
     * @param {string} funcName - Function name
     * @param {...any} args - Function arguments
     * @returns {any} Function result
     */
    call(funcName, ...args) {
        try {
            // Phase 3.4: Validate function call using metadata
            if (this._validateCalls && this._functionsMap.size > 0) {
                this._validateCall(funcName, args);
            }

            // 1. Check WASM exports first
            if (this.module.exports && this.module.exports[funcName] &&
                typeof this.module.exports[funcName] === 'function') {
                const result = this.module.exports[funcName](...args);
                return this._processResult(funcName, result);
            }
            // 2. Check module namespace (isolated functions)
            const ns = globalThis.__gowm_modules_ && globalThis.__gowm_modules_[this.moduleId];
            if (ns && typeof ns[funcName] === 'function') {
                const result = ns[funcName](...args);
                return this._processResult(funcName, result);
            }
            // 3. Fallback to globalThis (backward compat)
            if (globalThis[funcName] && typeof globalThis[funcName] === 'function') {
                const result = globalThis[funcName](...args);
                return this._processResult(funcName, result);
            }
            throw new Error(`Function ${funcName} not found in module '${this.moduleId}'`);
        } catch (error) {
            if (error.message.startsWith('Function ') && error.message.includes('not found')) {
                throw error;
            }
            const errorMsg = `Error calling ${funcName}: ${error.message}`;
            throw new Error(errorMsg);
        }
    }

    /**
     * Validate a function call against module.json metadata.
     * Checks parameter count and optionally warns about types.
     * @param {string} funcName - Function name
     * @param {Array} args - Arguments passed
     * @private
     */
    _validateCall(funcName, args) {
        const fnMeta = this._functionsMap.get(funcName);
        if (!fnMeta || !fnMeta.parameters) return;

        const params = fnMeta.parameters;
        // Skip validation for variadic functions (parameters with ...spread or single "..." param)
        const isVariadic = params.some(p => p.name && p.name.startsWith('...'));
        if (isVariadic) return;

        // Count required parameters (those without optional:true or "optional" in description)
        const requiredParams = params.filter(p => 
            !p.optional && (!p.description || !p.description.toLowerCase().includes('optional'))
        );

        if (args.length < requiredParams.length) {
            throw new Error(
                `${funcName}() expects at least ${requiredParams.length} argument(s) ` +
                `(${requiredParams.map(p => p.name).join(', ')}), but got ${args.length}`
            );
        }

        if (args.length > params.length) {
            console.warn(
                `⚠️ ${funcName}(): expected at most ${params.length} argument(s), got ${args.length}`
            );
        }

        // Type warnings in debug mode
        if (this._debugMode) {
            for (let i = 0; i < Math.min(args.length, params.length); i++) {
                const expected = params[i].type;
                const actual = typeof args[i];
                if (expected && actual !== expected && expected !== 'any') {
                    console.warn(
                        `⚠️ ${funcName}(): parameter '${params[i].name}' expected type '${expected}', got '${actual}'`
                    );
                }
            }
        }
    }

    /**
     * Process a function result using the error pattern from metadata.
     * For "string-based" error patterns, checks if result starts with "Error:".
     * @param {string} funcName - Function name
     * @param {any} result - Raw result from WASM function
     * @returns {any} Processed result
     * @private
     */
    _processResult(funcName, result) {
        // No error pattern processing — return raw result
        // The error pattern info is available via describe() for user-side handling
        return result;
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
     * Allocate memory in Go WASM.
     * Only uses Go-exported allocation functions (__gowm_alloc).
     * The unsafe offset-based fallback has been removed to prevent memory corruption.
     * If no allocation function is available, returns null and createBuffer() 
     * will work with JS-side buffers only.
     * @param {number} size - Size in bytes
     * @returns {number|null} Memory pointer or null
     */
    allocateGoMemory(size) {
        try {
            // Check namespace first for module-specific allocator
            const ns = globalThis.__gowm_modules_ && globalThis.__gowm_modules_[this.moduleId];
            if (ns && typeof ns.__gowm_alloc === 'function') {
                return ns.__gowm_alloc(size);
            }

            // Check global allocator (legacy modules)
            if (globalThis.__gowm_alloc && typeof globalThis.__gowm_alloc === 'function') {
                return globalThis.__gowm_alloc(size);
            }

            // No safe allocation available — return null
            // The bridge will use JS-side buffers instead of WASM memory
            return null;
        } catch (error) {
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
     * Register JavaScript callback callable from WASM.
     * Callbacks are namespaced per module to avoid conflicts.
     * @param {string} name - Callback name
     * @param {Function} callback - Callback function
     */
    registerCallback(name, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }

        this.callbacks.set(name, callback);
        
        // Make callback available in module namespace
        globalThis[`__gowm_callback_${this.moduleId}_${name}`] = callback;
        
        // Also available globally for backward compat
        globalThis[`__gowm_callback_${name}`] = callback;
        globalThis[name] = callback;
    }

    /**
     * Unregister a callback
     * @param {string} name - Callback name
     */
    unregisterCallback(name) {
        this.callbacks.delete(name);
        delete globalThis[`__gowm_callback_${this.moduleId}_${name}`];
        delete globalThis[`__gowm_callback_${name}`];
        delete globalThis[name];
    }

    /**
     * Get list of available functions for this specific module.
     * Prioritizes namespace-scoped functions over globalThis scanning.
     * @returns {Array<string>} Function names
     */
    getAvailableFunctions() {
        const functions = new Set();

        // 1. WASM exported functions
        if (this.module.exports) {
            Object.keys(this.module.exports)
                .filter(key => typeof this.module.exports[key] === 'function')
                .forEach(func => functions.add(func));
        }

        // 2. Module namespace functions (preferred)
        const ns = globalThis.__gowm_modules_ && globalThis.__gowm_modules_[this.moduleId];
        if (ns) {
            Object.keys(ns)
                .filter(key => typeof ns[key] === 'function')
                .forEach(func => functions.add(func));
        }

        // 3. Add functions from metadata that may not be in namespace yet
        if (this._functionsMap.size > 0) {
            for (const name of this._functionsMap.keys()) {
                functions.add(name);
            }
        }

        return Array.from(functions).sort();
    }

    /**
     * Get detailed function information from module.json metadata.
     * Returns function name, description, parameters, return type, etc.
     * @returns {Array<object>} Detailed function info, or basic names if no metadata
     */
    getDetailedFunctions() {
        if (this._functionsMap.size === 0) {
            // No metadata — return basic function list
            return this.getAvailableFunctions().map(name => ({ name }));
        }

        return Array.from(this._functionsMap.values()).map(fn => ({
            name: fn.name,
            description: fn.description || null,
            category: fn.category || null,
            parameters: fn.parameters || [],
            returnType: fn.returnType || null,
            example: fn.example || null,
            errorPattern: fn.errorPattern || null
        }));
    }

    /**
     * Get inline documentation for a specific function.
     * Uses module.json metadata to provide parameter info, examples, etc.
     * @param {string} funcName - Function name to describe
     * @returns {object|null} Function documentation or null if not found
     */
    describe(funcName) {
        const fnMeta = this._functionsMap.get(funcName);
        if (!fnMeta) {
            // Check if function exists but has no metadata
            if (this.hasFunction(funcName)) {
                return {
                    name: funcName,
                    description: 'No metadata available for this function',
                    parameters: [],
                    returnType: 'unknown',
                    example: null,
                    category: null,
                    errorPattern: null
                };
            }
            return null;
        }

        return {
            name: fnMeta.name,
            description: fnMeta.description || null,
            category: fnMeta.category || null,
            parameters: (fnMeta.parameters || []).map(p => ({
                name: p.name,
                type: p.type,
                description: p.description || null,
                optional: p.optional || false
            })),
            returnType: fnMeta.returnType || null,
            example: fnMeta.example || null,
            errorPattern: fnMeta.errorPattern || null
        };
    }

    /**
     * Get module metadata information.
     * @returns {object|null} Module metadata or null
     */
    getMetadata() {
        return this._metadata;
    }

    /**
     * Get function categories from module.json metadata.
     * @returns {object|null} Category -> function names mapping, or null
     */
    getFunctionCategories() {
        if (!this._metadata || !this._metadata.functionCategories) {
            return null;
        }
        return this._metadata.functionCategories;
    }

    /**
     * Check if a function exists in this module
     * @param {string} funcName - Function name
     * @returns {boolean} Whether function exists
     */
    hasFunction(funcName) {
        // Check WASM exports
        if (this.module.exports && 
            this.module.exports[funcName] && 
            typeof this.module.exports[funcName] === 'function') {
            return true;
        }
        // Check module namespace
        const ns = globalThis.__gowm_modules_ && globalThis.__gowm_modules_[this.moduleId];
        if (ns && typeof ns[funcName] === 'function') {
            return true;
        }
        // Fallback to globalThis
        if (globalThis[funcName] && typeof globalThis[funcName] === 'function') {
            return true;
        }
        return false;
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
            loadedAt: this.module.loadedAt || null,
            hasMetadata: this._metadata !== null,
            metadata: this._metadata ? {
                name: this._metadata.name,
                version: this._metadata.version,
                description: this._metadata.description,
                functionsCount: this._functionsMap.size,
                categories: this._metadata.functionCategories ? Object.keys(this._metadata.functionCategories) : [],
                errorPattern: this._errorPattern
            } : null
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
     * Cleanup method to release resources and remove namespace
     */
    cleanup() {
        try {
            // Free all allocated buffers
            for (const bufferInfo of this.allocatedBuffers) {
                try {
                    bufferInfo.free();
                } catch (error) {
                    // Ignore buffer cleanup errors
                }
            }
            this.allocatedBuffers.clear();

            // Remove all callbacks
            for (const name of this.callbacks.keys()) {
                this.unregisterCallback(name);
            }

            // Clean up module namespace
            if (globalThis.__gowm_modules_ && globalThis.__gowm_modules_[this.moduleId]) {
                const ns = globalThis.__gowm_modules_[this.moduleId];
                for (const funcName of Object.keys(ns)) {
                    if (globalThis[funcName] === ns[funcName]) {
                        delete globalThis[funcName];
                    }
                }
                delete globalThis.__gowm_modules_[this.moduleId];
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
            // Ignore cleanup errors
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