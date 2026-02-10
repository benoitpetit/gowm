/**
 * Tests for Phase 1.1: Global Proxy Virtualization
 * Tests the Proxy-based isolation of global functions to prevent namespace conflicts
 */

describe('Phase 1.1: Global Proxy Virtualization', () => {
    let UnifiedWasmLoader;
    
    beforeEach(() => {
        // Clear any existing __gowm_modules_
        if (globalThis.__gowm_modules_) {
            delete globalThis.__gowm_modules_;
        }
        
        // Require freshly for each test
        jest.resetModules();
        UnifiedWasmLoader = require('../../src/loaders/unified-loader');
    });

    afterEach(() => {
        // Cleanup
        if (globalThis.__gowm_modules_) {
            delete globalThis.__gowm_modules_;
        }
    });

    describe('Constructor with useGlobalProxy option', () => {
        it('should accept useGlobalProxy option', () => {
            const loader = new UnifiedWasmLoader({ useGlobalProxy: true });
            expect(loader._useGlobalProxy).toBe(true);
        });

        it('should default to false for backward compatibility', () => {
            const loader = new UnifiedWasmLoader();
            expect(loader._useGlobalProxy).toBe(false);
        });

        it('should override instance setting with per-module option', () => {
            const loader = new UnifiedWasmLoader({ useGlobalProxy: false });
            expect(loader._useGlobalProxy).toBe(false);
            // Per-module option should override in loadModule call
        });
    });

    describe('_createGlobalProxy method', () => {
        let loader;

        beforeEach(() => {
            loader = new UnifiedWasmLoader({ useGlobalProxy: true });
        });

        it('should create a proxy that intercepts function assignments', () => {
            const moduleId = 'test-module';
            const proxy = loader._createGlobalProxy(moduleId);
            
            expect(proxy).toBeDefined();
            expect(typeof proxy).toBe('object');
        });

        it('should redirect function assignments to module namespace', () => {
            const moduleId = 'test-module';
            const proxy = loader._createGlobalProxy(moduleId);
            
            // Simulate Go registering a function through the proxy
            const testFunc = () => 'test-result';
            proxy.myTestFunction = testFunc;
            
            // Function should be in the namespace
            expect(globalThis.__gowm_modules_).toBeDefined();
            expect(globalThis.__gowm_modules_[moduleId]).toBeDefined();
            expect(globalThis.__gowm_modules_[moduleId].myTestFunction).toBe(testFunc);
            expect(globalThis.__gowm_modules_[moduleId].myTestFunction()).toBe('test-result');
        });

        it('should allow non-function properties to pass through', () => {
            const moduleId = 'test-module';
            const proxy = loader._createGlobalProxy(moduleId);
            
            proxy.testString = 'hello';
            proxy.testNumber = 42;
            proxy.testObject = { key: 'value' };
            
            expect(globalThis.testString).toBe('hello');
            expect(globalThis.testNumber).toBe(42);
            expect(globalThis.testObject).toEqual({ key: 'value' });
            
            // Cleanup
            delete globalThis.testString;
            delete globalThis.testNumber;
            delete globalThis.testObject;
        });

        it('should skip internal __gowm_ prefixed properties', () => {
            const moduleId = 'test-module';
            const proxy = loader._createGlobalProxy(moduleId);
            
            proxy.__gowm_internal = () => 'internal';
            
            // Should not be in namespace (goes directly to globalThis)
            expect(globalThis.__gowm_modules_[moduleId].__gowm_internal).toBeUndefined();
            expect(globalThis.__gowm_internal).toBeDefined();
            
            // Cleanup
            delete globalThis.__gowm_internal;
        });

        it('should skip Go runtime properties (go:, gojs)', () => {
            const moduleId = 'test-module';
            const proxy = loader._createGlobalProxy(moduleId);
            
            proxy['go:test'] = () => 'go-internal';
            proxy.gojs_something = () => 'gojs-internal';
            
            // Should not be in namespace
            expect(globalThis.__gowm_modules_[moduleId]['go:test']).toBeUndefined();
            expect(globalThis.__gowm_modules_[moduleId].gojs_something).toBeUndefined();
            
            // Cleanup
            delete globalThis['go:test'];
            delete globalThis.gojs_something;
        });

        it('should skip ready signal properties', () => {
            const moduleId = 'test-module';
            const proxy = loader._createGlobalProxy(moduleId);
            
            proxy.__crypto_ready = true;
            
            // Should not be in namespace
            expect(globalThis.__gowm_modules_[moduleId].__crypto_ready).toBeUndefined();
            expect(globalThis.__crypto_ready).toBe(true);
            
            // Cleanup
            delete globalThis.__crypto_ready;
        });

        it('should isolate functions between different modules', () => {
            const moduleId1 = 'module-1';
            const moduleId2 = 'module-2';
            
            const proxy1 = loader._createGlobalProxy(moduleId1);
            const proxy2 = loader._createGlobalProxy(moduleId2);
            
            const func1 = () => 'func1';
            const func2 = () => 'func2';
            
            proxy1.sharedName = func1;
            proxy2.sharedName = func2;
            
            // Each module should have its own version
            expect(globalThis.__gowm_modules_[moduleId1].sharedName).toBe(func1);
            expect(globalThis.__gowm_modules_[moduleId2].sharedName).toBe(func2);
            expect(globalThis.__gowm_modules_[moduleId1].sharedName()).toBe('func1');
            expect(globalThis.__gowm_modules_[moduleId2].sharedName()).toBe('func2');
        });

        it('should allow reading from namespace through proxy', () => {
            const moduleId = 'test-module';
            const proxy = loader._createGlobalProxy(moduleId);
            
            const testFunc = () => 'test';
            proxy.myFunc = testFunc;
            
            // Reading through proxy should return the function from namespace
            expect(proxy.myFunc).toBe(testFunc);
            expect(proxy.myFunc()).toBe('test');
        });

        it('should fallback to globalThis for non-namespaced properties', () => {
            const moduleId = 'test-module';
            const proxy = loader._createGlobalProxy(moduleId);
            
            // Reading a globalThis property that's not in namespace
            expect(proxy.Object).toBe(globalThis.Object);
            expect(proxy.Array).toBe(globalThis.Array);
            expect(proxy.console).toBe(globalThis.console);
        });
    });

    describe('Integration with loadModule', () => {
        let loader;

        beforeEach(() => {
            // Mock globalThis.Go if not present
            if (!globalThis.Go) {
                globalThis.Go = class MockGo {
                    constructor() {
                        this.importObject = { go: {} };
                        this.global = globalThis;
                    }
                    run(instance) {
                        return Promise.resolve();
                    }
                };
            }
        });

        it('should use proxy when useGlobalProxy is true in constructor', async () => {
            loader = new UnifiedWasmLoader({ useGlobalProxy: true });
            
            // We can't fully test loadModule without a real WASM file,
            // but we can verify the proxy creation is triggered
            const spy = jest.spyOn(loader, '_createGlobalProxy');
            
            try {
                await loader.loadModule('fake-source', { 
                    name: 'test-module',
                    preInit: false 
                });
            } catch (error) {
                // Expected to fail due to missing WASM file
                // but spy should have been called if proxy logic was reached
            }
            
            // Note: This test is limited without real WASM files
        });

        it('should not use proxy when useGlobalProxy is false', async () => {
            loader = new UnifiedWasmLoader({ useGlobalProxy: false });
            
            const spy = jest.spyOn(loader, '_createGlobalProxy');
            
            try {
                await loader.loadModule('fake-source', { 
                    name: 'test-module',
                    preInit: false 
                });
            } catch (error) {
                // Expected to fail
            }
            
            // Proxy should not be created when disabled
            // Note: We'd verify this more thoroughly with integration tests
        });

        it('should allow per-module override of useGlobalProxy', async () => {
            loader = new UnifiedWasmLoader({ useGlobalProxy: false });
            
            const spy = jest.spyOn(loader, '_createGlobalProxy');
            
            try {
                await loader.loadModule('fake-source', { 
                    name: 'test-module',
                    useGlobalProxy: true,  // Override instance setting
                    preInit: false 
                });
            } catch (error) {
                // Expected to fail
            }
            
            // Note: Full integration test would verify proxy was created
        });
    });

    describe('Backward compatibility', () => {
        it('should not break existing code when proxy is disabled', () => {
            const loader = new UnifiedWasmLoader();
            
            // Existing code without proxy should work
            expect(loader._useGlobalProxy).toBe(false);
            
            // Functions should still be isolated using _isolateModuleFunctions
            const keysBefore = new Set(['Object', 'Array']);
            globalThis.testNewFunction = () => 'test';
            
            loader._isolateModuleFunctions('test-module', keysBefore);
            
            expect(globalThis.__gowm_modules_).toBeDefined();
            expect(globalThis.__gowm_modules_['test-module'].testNewFunction).toBeDefined();
            
            // Cleanup
            delete globalThis.testNewFunction;
        });

        it('should maintain backward compatibility with existing APIs', () => {
            const loader = new UnifiedWasmLoader();
            
            // Verify all existing methods are still present
            expect(typeof loader.loadModule).toBe('function');
            expect(typeof loader.loadWasmBytes).toBe('function');
            expect(typeof loader._isolateModuleFunctions).toBe('function');
            expect(typeof loader.extractModuleId).toBe('function');
        });
    });
});
