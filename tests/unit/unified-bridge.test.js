/**
 * Unit tests for UnifiedWasmBridge
 */
const UnifiedWasmBridge = require('../../src/bridges/unified-bridge');

describe('UnifiedWasmBridge', () => {
    let bridge;
    let mockModule;

    beforeEach(() => {
        // Clean up global namespace
        delete globalThis.__gowm_modules_;
        delete globalThis.__gowm_alloc;
        delete globalThis.__gowm_free;

        mockModule = {
            instance: {},
            go: {
                mem: { buffer: new ArrayBuffer(1024) },
                exit: jest.fn()
            },
            exports: {
                memory: { buffer: new ArrayBuffer(1024) },
                testExport: jest.fn().mockReturnValue(42)
            },
            ready: true,
            moduleId: 'test-mod',
            loadedAt: new Date().toISOString()
        };

        bridge = new UnifiedWasmBridge(mockModule, { name: 'test-mod' });
    });

    afterEach(() => {
        // Clean up global namespace
        delete globalThis.__gowm_modules_;
        if (bridge) {
            try { bridge.cleanup(); } catch (e) { }
        }
    });

    describe('constructor', () => {
        test('should initialize with module reference', () => {
            expect(bridge.module).toBe(mockModule);
            expect(bridge.name).toBe('test-mod');
            expect(bridge.moduleId).toBe('test-mod');
        });

        test('should initialize empty callbacks and buffers', () => {
            expect(bridge.callbacks).toBeInstanceOf(Map);
            expect(bridge.callbacks.size).toBe(0);
            expect(bridge.allocatedBuffers).toBeInstanceOf(Set);
            expect(bridge.allocatedBuffers.size).toBe(0);
        });

        test('should use moduleId from module if available', () => {
            const b = new UnifiedWasmBridge({ ...mockModule, moduleId: 'from-module' }, {});
            expect(b.moduleId).toBe('from-module');
        });
    });

    describe('call()', () => {
        test('should call WASM export first', () => {
            const result = bridge.call('testExport');
            expect(result).toBe(42);
            expect(mockModule.exports.testExport).toHaveBeenCalled();
        });

        test('should call namespace function when not in exports', () => {
            globalThis.__gowm_modules_ = {
                'test-mod': {
                    nsFunc: jest.fn().mockReturnValue('ns-result')
                }
            };
            expect(bridge.call('nsFunc')).toBe('ns-result');
        });

        test('should fallback to globalThis', () => {
            globalThis.globalFunc = jest.fn().mockReturnValue('global-result');
            expect(bridge.call('globalFunc')).toBe('global-result');
            delete globalThis.globalFunc;
        });

        test('should throw for non-existent function', () => {
            expect(() => bridge.call('nonExistent'))
                .toThrow("Function nonExistent not found in module 'test-mod'");
        });

        test('should pass arguments correctly', () => {
            mockModule.exports.add = jest.fn((a, b) => a + b);
            expect(bridge.call('add', 3, 5)).toBe(8);
            expect(mockModule.exports.add).toHaveBeenCalledWith(3, 5);
        });

        test('should prefer WASM export over namespace', () => {
            mockModule.exports.myFunc = jest.fn().mockReturnValue('export');
            globalThis.__gowm_modules_ = {
                'test-mod': {
                    myFunc: jest.fn().mockReturnValue('namespace')
                }
            };
            expect(bridge.call('myFunc')).toBe('export');
        });
    });

    describe('callAsync()', () => {
        test('should resolve sync results', async () => {
            const result = await bridge.callAsync('testExport');
            expect(result).toBe(42);
        });

        test('should handle promise results', async () => {
            mockModule.exports.asyncFunc = jest.fn().mockResolvedValue('async-result');
            const result = await bridge.callAsync('asyncFunc');
            expect(result).toBe('async-result');
        });

        test('should reject on errors', async () => {
            mockModule.exports.errorFunc = jest.fn().mockImplementation(() => {
                throw new Error('call failed');
            });
            await expect(bridge.callAsync('errorFunc')).rejects.toThrow('call failed');
        });
    });

    describe('hasFunction()', () => {
        test('should find WASM exports', () => {
            expect(bridge.hasFunction('testExport')).toBe(true);
        });

        test('should find namespace functions', () => {
            globalThis.__gowm_modules_ = {
                'test-mod': { nsFunc: () => { } }
            };
            expect(bridge.hasFunction('nsFunc')).toBe(true);
        });

        test('should find global functions', () => {
            globalThis.globalTestFunc = () => { };
            expect(bridge.hasFunction('globalTestFunc')).toBe(true);
            delete globalThis.globalTestFunc;
        });

        test('should return false for non-existent functions', () => {
            expect(bridge.hasFunction('doesNotExist')).toBe(false);
        });
    });

    describe('getAvailableFunctions()', () => {
        test('should list WASM exports', () => {
            const funcs = bridge.getAvailableFunctions();
            expect(funcs).toContain('testExport');
        });

        test('should list namespace functions', () => {
            globalThis.__gowm_modules_ = {
                'test-mod': {
                    add: () => { },
                    subtract: () => { }
                }
            };
            const funcs = bridge.getAvailableFunctions();
            expect(funcs).toContain('add');
            expect(funcs).toContain('subtract');
        });

        test('should return sorted array', () => {
            globalThis.__gowm_modules_ = {
                'test-mod': {
                    zFunc: () => { },
                    aFunc: () => { }
                }
            };
            const funcs = bridge.getAvailableFunctions();
            const sortedFuncs = [...funcs].sort();
            expect(funcs).toEqual(sortedFuncs);
        });

        test('should not include functions from other modules', () => {
            globalThis.__gowm_modules_ = {
                'other-mod': { otherFunc: () => { } },
                'test-mod': { myFunc: () => { } }
            };
            const funcs = bridge.getAvailableFunctions();
            expect(funcs).toContain('myFunc');
            expect(funcs).not.toContain('otherFunc');
        });
    });

    describe('registerCallback()', () => {
        test('should register callback in callbacks map', () => {
            const cb = () => 'test';
            bridge.registerCallback('myCb', cb);
            expect(bridge.callbacks.has('myCb')).toBe(true);
        });

        test('should make callback available globally', () => {
            const cb = () => 'test';
            bridge.registerCallback('myCb', cb);
            expect(globalThis['__gowm_callback_test-mod_myCb']).toBe(cb);
            expect(globalThis.myCb).toBe(cb);
        });

        test('should throw for non-function argument', () => {
            expect(() => bridge.registerCallback('bad', 'not-a-function'))
                .toThrow('Callback must be a function');
        });
    });

    describe('unregisterCallback()', () => {
        test('should remove callback from map and globals', () => {
            bridge.registerCallback('myCb', () => { });
            bridge.unregisterCallback('myCb');
            expect(bridge.callbacks.has('myCb')).toBe(false);
            expect(globalThis.myCb).toBeUndefined();
            expect(globalThis['__gowm_callback_test-mod_myCb']).toBeUndefined();
        });
    });

    describe('allocateGoMemory()', () => {
        test('should return null when no allocator is available', () => {
            expect(bridge.allocateGoMemory(100)).toBeNull();
        });

        test('should NOT use unsafe offset-based allocation', () => {
            // Even with mem.buffer present, should not return buffer.byteLength - size
            const result = bridge.allocateGoMemory(100);
            const unsafeOffset = mockModule.go.mem.buffer.byteLength - 100; // 924
            expect(result).not.toBe(unsafeOffset);
        });

        test('should use __gowm_alloc from namespace if available', () => {
            globalThis.__gowm_modules_ = {
                'test-mod': {
                    __gowm_alloc: jest.fn().mockReturnValue(512)
                }
            };
            expect(bridge.allocateGoMemory(100)).toBe(512);
        });

        test('should use global __gowm_alloc as fallback', () => {
            globalThis.__gowm_alloc = jest.fn().mockReturnValue(256);
            expect(bridge.allocateGoMemory(100)).toBe(256);
            delete globalThis.__gowm_alloc;
        });
    });

    describe('allocateWasmMemory()', () => {
        test('should throw for invalid size', () => {
            expect(() => bridge.allocateWasmMemory(0))
                .toThrow('Invalid size for memory allocation');
            expect(() => bridge.allocateWasmMemory(-1))
                .toThrow('Invalid size for memory allocation');
        });

        test('should return null when no malloc is available', () => {
            expect(bridge.allocateWasmMemory(100)).toBeNull();
        });

        test('should use malloc if available', () => {
            mockModule.exports.malloc = jest.fn().mockReturnValue(128);
            expect(bridge.allocateWasmMemory(100)).toBe(128);
        });
    });

    describe('createBuffer()', () => {
        test('should throw for null data', () => {
            expect(() => bridge.createBuffer(null))
                .toThrow('Data is required for buffer creation');
        });

        test('should create buffer from string', () => {
            const bufferInfo = bridge.createBuffer('hello');
            expect(bufferInfo.size).toBe(5);
            expect(bufferInfo.type).toBe('String');
            expect(typeof bufferInfo.free).toBe('function');
        });

        test('should create buffer from Uint8Array', () => {
            const data = new Uint8Array([1, 2, 3]);
            const bufferInfo = bridge.createBuffer(data);
            expect(bufferInfo.size).toBe(3);
        });

        test('should create buffer from Array', () => {
            const data = [1.0, 2.0, 3.0];
            const bufferInfo = bridge.createBuffer(data);
            expect(bufferInfo).toBeDefined();
        });

        test('should track allocated buffers', () => {
            bridge.createBuffer('test');
            expect(bridge.allocatedBuffers.size).toBe(1);
        });

        test('should throw for unsupported types', () => {
            expect(() => bridge.createBuffer(12345))
                .toThrow('Unsupported data type');
        });
    });

    describe('getStats()', () => {
        test('should return stats object', () => {
            const stats = bridge.getStats();
            expect(stats.name).toBe('test-mod');
            expect(stats.ready).toBe(true);
            expect(stats.environment).toBe('Node.js');
            expect(Array.isArray(stats.functions)).toBe(true);
            expect(Array.isArray(stats.callbacks)).toBe(true);
        });
    });

    describe('getMemoryUsage()', () => {
        test('should report memory stats', () => {
            const mem = bridge.getMemoryUsage();
            expect(mem).toHaveProperty('total');
            expect(mem).toHaveProperty('wasm');
            expect(mem).toHaveProperty('go');
            expect(mem).toHaveProperty('buffers');
            expect(mem).toHaveProperty('buffersCount');
        });

        test('should include buffer memory', () => {
            bridge.createBuffer('test data');
            const mem = bridge.getMemoryUsage();
            expect(mem.buffers).toBeGreaterThan(0);
            expect(mem.buffersCount).toBe(1);
        });
    });

    describe('cleanup()', () => {
        test('should clear buffers and callbacks', () => {
            bridge.registerCallback('cb1', () => { });
            bridge.createBuffer('test');

            bridge.cleanup();

            expect(bridge.allocatedBuffers.size).toBe(0);
            expect(bridge.callbacks.size).toBe(0);
        });

        test('should clean up namespace', () => {
            globalThis.__gowm_modules_ = {
                'test-mod': { func1: () => { } }
            };
            globalThis.func1 = globalThis.__gowm_modules_['test-mod'].func1;

            bridge.cleanup();

            expect(globalThis.__gowm_modules_['test-mod']).toBeUndefined();
            expect(globalThis.func1).toBeUndefined();
        });

        test('should call go.exit', () => {
            bridge.cleanup();
            expect(mockModule.go.exit).toHaveBeenCalledWith(0);
        });

        test('should not throw on error during cleanup', () => {
            mockModule.go.exit.mockImplementation(() => { throw new Error('exit error'); });
            expect(() => bridge.cleanup()).not.toThrow();
        });
    });

    describe('test()', () => {
        test('should return test results object', () => {
            const results = bridge.test();
            expect(results).toHaveProperty('functionCalls');
            expect(results).toHaveProperty('memoryAllocation');
            expect(results).toHaveProperty('callbacks');
            expect(results).toHaveProperty('asyncCalls');
            expect(results).toHaveProperty('errors');
        });
    });

    describe('getSupportedDataTypes()', () => {
        test('should return supported types', () => {
            const types = bridge.getSupportedDataTypes();
            expect(types).toContain('Float64Array');
            expect(types).toContain('Uint8Array');
            expect(types).toContain('string');
            expect(types).toContain('Array');
        });
    });

    describe('convertBuffer()', () => {
        test('should throw for invalid buffer', () => {
            expect(() => bridge.convertBuffer(null))
                .toThrow('Invalid buffer information');
        });

        test('should convert buffer to string', () => {
            const encoder = new TextEncoder();
            const bufferInfo = {
                buffer: encoder.encode('hello'),
                type: 'String',
                originalData: 'hello'
            };
            const result = bridge.convertBuffer(bufferInfo, 'string');
            expect(result).toBe('hello');
        });
    });

    // =========================================================================
    //  — Metadata, describe(), validation Tests
    // =========================================================================

    describe('constructor with metadata', () => {
        test('should initialize _metadata from wasmModule.metadata', () => {
            const metadata = {
                name: 'math-wasm',
                version: '0.2.0',
                functions: [
                    { name: 'add', parameters: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }], returnType: 'number' }
                ],
                gowmConfig: { errorPattern: 'string-based' }
            };
            const mod = { ...mockModule, metadata };
            const b = new UnifiedWasmBridge(mod, { name: 'math' });
            
            expect(b._metadata).toBe(metadata);
            expect(b._functionsMap.size).toBe(1);
            expect(b._functionsMap.has('add')).toBe(true);
            expect(b._errorPattern).toBe('string-based');
        });

        test('should handle null metadata gracefully', () => {
            const b = new UnifiedWasmBridge({ ...mockModule, metadata: null }, { name: 'test' });
            expect(b._metadata).toBeNull();
            expect(b._functionsMap.size).toBe(0);
        });

        test('should set _debugMode when logLevel is debug', () => {
            const b = new UnifiedWasmBridge(mockModule, { name: 'test', logLevel: 'debug' });
            expect(b._debugMode).toBe(true);
        });
    });

    describe('_buildFunctionsMap()', () => {
        test('should build map from metadata functions', () => {
            const metadata = {
                functions: [
                    { name: 'add', category: 'Basic' },
                    { name: 'subtract', category: 'Basic' },
                    { name: 'sqrt', category: 'Advanced' }
                ]
            };
            const mod = { ...mockModule, metadata };
            const b = new UnifiedWasmBridge(mod, { name: 'test' });
            
            expect(b._functionsMap.size).toBe(3);
            expect(b._functionsMap.get('add').category).toBe('Basic');
        });

        test('should return empty map when no metadata', () => {
            const b = new UnifiedWasmBridge(mockModule, { name: 'test' });
            expect(b._functionsMap.size).toBe(0);
        });
    });

    describe('describe()', () => {
        let bridgeWithMeta;
        
        beforeEach(() => {
            const metadata = {
                functions: [
                    {
                        name: 'add',
                        description: 'Add two numbers',
                        category: 'Basic Arithmetic',
                        parameters: [
                            { name: 'a', type: 'number', description: 'First number' },
                            { name: 'b', type: 'number', description: 'Second number' }
                        ],
                        returnType: 'number',
                        example: 'math.call("add", 5, 3)',
                        errorPattern: 'Returns string on failure'
                    }
                ]
            };
            const mod = { ...mockModule, metadata };
            bridgeWithMeta = new UnifiedWasmBridge(mod, { name: 'test-meta' });
        });

        test('should return detailed documentation for known function', () => {
            const doc = bridgeWithMeta.describe('add');
            expect(doc).not.toBeNull();
            expect(doc.name).toBe('add');
            expect(doc.description).toBe('Add two numbers');
            expect(doc.category).toBe('Basic Arithmetic');
            expect(doc.parameters).toHaveLength(2);
            expect(doc.parameters[0].name).toBe('a');
            expect(doc.parameters[0].type).toBe('number');
            expect(doc.returnType).toBe('number');
            expect(doc.example).toBe('math.call("add", 5, 3)');
        });

        test('should return basic info for function with no metadata', () => {
            // testExport exists in mockModule.exports
            const doc = bridgeWithMeta.describe('testExport');
            expect(doc).not.toBeNull();
            expect(doc.name).toBe('testExport');
            expect(doc.description).toBe('No metadata available for this function');
            expect(doc.parameters).toEqual([]);
        });

        test('should return null for non-existent function', () => {
            const doc = bridgeWithMeta.describe('nonExistent');
            expect(doc).toBeNull();
        });

        test('should propagate optional field in parameter metadata', () => {
            const metadata = {
                functions: [{
                    name: 'generateQR',
                    description: 'Generate QR code',
                    parameters: [
                        { name: 'content', type: 'string', description: 'Data to encode' },
                        { name: 'size', type: 'number', description: 'Size in pixels', optional: true }
                    ],
                    returnType: 'string'
                }]
            };
            const mod = { ...mockModule, metadata };
            const b = new UnifiedWasmBridge(mod, { name: 'qr-test' });
            
            const doc = b.describe('generateQR');
            expect(doc.parameters[0].optional).toBe(false);
            expect(doc.parameters[1].optional).toBe(true);
        });
    });

    describe('getDetailedFunctions()', () => {
        test('should return detailed info when metadata available', () => {
            const metadata = {
                functions: [
                    { name: 'add', description: 'Add', category: 'Math', parameters: [], returnType: 'number' },
                    { name: 'subtract', description: 'Subtract', category: 'Math', parameters: [], returnType: 'number' }
                ]
            };
            const mod = { ...mockModule, metadata };
            const b = new UnifiedWasmBridge(mod, { name: 'test' });
            
            const funcs = b.getDetailedFunctions();
            expect(funcs).toHaveLength(2);
            expect(funcs[0].name).toBe('add');
            expect(funcs[0].description).toBe('Add');
            expect(funcs[0].category).toBe('Math');
        });

        test('should return basic names when no metadata', () => {
            const funcs = bridge.getDetailedFunctions();
            expect(funcs.length).toBeGreaterThan(0);
            expect(funcs[0]).toHaveProperty('name');
        });
    });

    describe('getMetadata()', () => {
        test('should return metadata when available', () => {
            const metadata = { name: 'test', version: '1.0.0' };
            const mod = { ...mockModule, metadata };
            const b = new UnifiedWasmBridge(mod, { name: 'test' });
            expect(b.getMetadata()).toBe(metadata);
        });

        test('should return null when no metadata', () => {
            expect(bridge.getMetadata()).toBeNull();
        });
    });

    describe('getFunctionCategories()', () => {
        test('should return categories from metadata', () => {
            const metadata = {
                functionCategories: {
                    'Basic': ['add', 'subtract'],
                    'Advanced': ['sqrt']
                }
            };
            const mod = { ...mockModule, metadata };
            const b = new UnifiedWasmBridge(mod, { name: 'test' });
            
            const cats = b.getFunctionCategories();
            expect(cats).toEqual(metadata.functionCategories);
        });

        test('should return null when no categories', () => {
            expect(bridge.getFunctionCategories()).toBeNull();
        });
    });

    describe('_validateCall()', () => {
        let bridgeWithValidation;

        beforeEach(() => {
            const metadata = {
                functions: [
                    {
                        name: 'add',
                        parameters: [
                            { name: 'a', type: 'number' },
                            { name: 'b', type: 'number' }
                        ]
                    },
                    {
                        name: 'round',
                        parameters: [
                            { name: 'x', type: 'number' },
                            { name: 'precision', type: 'number', description: 'Number of decimal places (optional, default: 0)' }
                        ]
                    },
                    {
                        name: 'mean',
                        parameters: [
                            { name: '...numbers', type: 'number' }
                        ]
                    }
                ]
            };
            const mod = { ...mockModule, metadata, moduleId: 'test-val' };
            // Register functions in namespace
            globalThis.__gowm_modules_ = {
                'test-val': {
                    add: jest.fn().mockReturnValue(8),
                    round: jest.fn().mockReturnValue(3),
                    mean: jest.fn().mockReturnValue(5)
                }
            };
            bridgeWithValidation = new UnifiedWasmBridge(mod, { name: 'test-val' });
        });

        afterEach(() => {
            delete globalThis.__gowm_modules_;
        });

        test('should throw when too few arguments for fixed-arg function', () => {
            expect(() => bridgeWithValidation.call('add', 5))
                .toThrow('expects at least 2 argument(s)');
        });

        test('should not throw for correct argument count', () => {
            expect(() => bridgeWithValidation.call('add', 5, 3))
                .not.toThrow();
        });

        test('should warn when too many arguments', () => {
            const spy = jest.spyOn(console, 'warn').mockImplementation();
            bridgeWithValidation.call('add', 1, 2, 3);
            expect(spy).toHaveBeenCalledWith(
                expect.stringContaining('expected at most 2')
            );
            spy.mockRestore();
        });

        test('should not validate variadic functions', () => {
            expect(() => bridgeWithValidation.call('mean', 1))
                .not.toThrow();
            expect(() => bridgeWithValidation.call('mean', 1, 2, 3, 4, 5))
                .not.toThrow();
        });

        test('should allow optional parameters to be omitted', () => {
            // round has 1 required + 1 optional param
            expect(() => bridgeWithValidation.call('round', 3.14))
                .not.toThrow();
        });

        test('should warn on type mismatch in debug mode', () => {
            const metadata = {
                functions: [
                    { name: 'add', parameters: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }] }
                ]
            };
            const mod = { ...mockModule, metadata, moduleId: 'debug-test' };
            globalThis.__gowm_modules_ = {
                'debug-test': { add: jest.fn().mockReturnValue(0) }
            };
            const debugBridge = new UnifiedWasmBridge(mod, { name: 'debug-test', logLevel: 'debug' });

            const spy = jest.spyOn(console, 'warn').mockImplementation();
            debugBridge.call('add', 'not-a-number', 5);
            expect(spy).toHaveBeenCalledWith(
                expect.stringContaining("expected type 'number', got 'string'")
            );
            spy.mockRestore();
            delete globalThis.__gowm_modules_;
        });

        test('should skip validation when validateCalls is false', () => {
            const metadata = {
                functions: [
                    { name: 'add', parameters: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }] }
                ]
            };
            const mod = { ...mockModule, metadata, moduleId: 'no-val' };
            globalThis.__gowm_modules_ = {
                'no-val': { add: jest.fn().mockReturnValue(0) }
            };
            const noValBridge = new UnifiedWasmBridge(mod, { name: 'no-val', validateCalls: false });

            // Should not throw even with wrong arg count
            expect(() => noValBridge.call('add', 5)).not.toThrow();
            delete globalThis.__gowm_modules_;
        });

        test('should treat parameters with optional:true as optional', () => {
            const metadata = {
                functions: [
                    {
                        name: 'generateQR',
                        parameters: [
                            { name: 'content', type: 'string' },
                            { name: 'size', type: 'number', optional: true, description: 'QR code size in pixels (default: 256)' }
                        ]
                    }
                ]
            };
            const mod = { ...mockModule, metadata, moduleId: 'opt-test' };
            globalThis.__gowm_modules_ = {
                'opt-test': { generateQR: jest.fn().mockReturnValue('ok') }
            };
            const optBridge = new UnifiedWasmBridge(mod, { name: 'opt-test' });

            // Should allow omitting the optional parameter
            expect(() => optBridge.call('generateQR', 'hello')).not.toThrow();
            // Should also work with both params
            expect(() => optBridge.call('generateQR', 'hello', 512)).not.toThrow();
            delete globalThis.__gowm_modules_;
        });
    });

    describe('getStats() with metadata', () => {
        test('should include metadata in stats when available', () => {
            const metadata = {
                name: 'math-wasm',
                version: '0.2.0',
                description: 'Math module',
                functions: [{ name: 'add' }, { name: 'sub' }],
                functionCategories: { 'Basic': ['add', 'sub'] },
                gowmConfig: { errorPattern: 'string-based' }
            };
            const mod = { ...mockModule, metadata };
            const b = new UnifiedWasmBridge(mod, { name: 'math' });
            
            const stats = b.getStats();
            expect(stats.hasMetadata).toBe(true);
            expect(stats.metadata.name).toBe('math-wasm');
            expect(stats.metadata.version).toBe('0.2.0');
            expect(stats.metadata.functionsCount).toBe(2);
            expect(stats.metadata.categories).toEqual(['Basic']);
            expect(stats.metadata.errorPattern).toBe('string-based');
        });

        test('should show hasMetadata false when no metadata', () => {
            const stats = bridge.getStats();
            expect(stats.hasMetadata).toBe(false);
            expect(stats.metadata).toBeNull();
        });
    });

    describe('getAvailableFunctions() with metadata', () => {
        test('should include functions from metadata', () => {
            const metadata = {
                functions: [
                    { name: 'metaFunc1' },
                    { name: 'metaFunc2' }
                ]
            };
            const mod = { ...mockModule, metadata };
            const b = new UnifiedWasmBridge(mod, { name: 'test' });
            
            const funcs = b.getAvailableFunctions();
            expect(funcs).toContain('metaFunc1');
            expect(funcs).toContain('metaFunc2');
        });
    });
});
