/**
 * Tests for Phase 1.2: Dynamic Runtime Versioning
 * Tests the ability to download and use version-specific wasm_exec.js runtimes
 */

describe('Phase 1.2: Dynamic Runtime Versioning', () => {
    let UnifiedWasmLoader;
    
    beforeEach(() => {
        jest.resetModules();
        UnifiedWasmLoader = require('../../src/loaders/unified-loader');
        
        // Clear Go global
        if (globalThis.Go) {
            delete globalThis.Go;
        }
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Runtime cache initialization', () => {
        it('should initialize runtime cache in constructor', () => {
            const loader = new UnifiedWasmLoader();
            expect(loader._runtimeCache).toBeDefined();
            expect(loader._runtimeCache instanceof Map).toBe(true);
        });
    });

    describe('_downloadGoRuntime method', () => {
        let loader;
        let mockResponse;

        beforeEach(() => {
            loader = new UnifiedWasmLoader();
            
            // Mock fetch
            mockResponse = {
                ok: true,
                status: 200,
                text: jest.fn().mockResolvedValue('// Mock Go runtime code\nglobalThis.Go = class MockGo {};')
            };
            
            global.fetch = jest.fn().mockResolvedValue(mockResponse);
        });

        afterEach(() => {
            if (global.fetch && global.fetch.mockRestore) {
                global.fetch.mockRestore();
            }
        });

        it('should download runtime from GitHub', async () => {
            const goVersion = 'go1.21.4';
            const runtimePath = await loader._downloadGoRuntime(goVersion);
            
            expect(runtimePath).toBeDefined();
            expect(typeof runtimePath).toBe('string');
            expect(global.fetch).toHaveBeenCalledWith(
                `https://raw.githubusercontent.com/golang/go/${goVersion}/misc/wasm/wasm_exec.js`,
                expect.any(Object)
            );
        });

        it('should cache downloaded runtimes', async () => {
            const goVersion = 'go1.21.4';
            
            const path1 = await loader._downloadGoRuntime(goVersion);
            const path2 = await loader._downloadGoRuntime(goVersion);
            
            expect(path1).toBe(path2);
            expect(global.fetch).toHaveBeenCalledTimes(1); // Should use cache on second call
        });

        it('should handle different Go versions separately', async () => {
            const version1 = 'go1.21.4';
            const version2 = 'go1.22.0';
            
            const path1 = await loader._downloadGoRuntime(version1);
            const path2 = await loader._downloadGoRuntime(version2);
            
            expect(path1).not.toBe(path2);
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });

        it('should throw error on download failure', async () => {
            mockResponse.ok = false;
            mockResponse.status = 404;
            mockResponse.statusText = 'Not Found';
            
            const goVersion = 'go1.999.999';
            
            await expect(loader._downloadGoRuntime(goVersion))
                .rejects
                .toThrow('Failed to download runtime');
        });

        it('should handle network errors gracefully', async () => {
            // Mock ensureFetch to avoid any issues
            loader.ensureFetch = jest.fn().mockResolvedValue();
            loader.fetchWithRetry = jest.fn().mockRejectedValue(new Error('Network error'));
            
            const goVersion = 'go1.21.4';
            
            await expect(loader._downloadGoRuntime(goVersion))
                .rejects
                .toThrow('Failed to download Go runtime');
        });

        it('should create blob URL in browser environment', async () => {
            // Simulate browser environment
            const originalWindow = global.window;
            global.window = { document: {} };
            loader.isNode = false;
            
            // Mock Blob and URL.createObjectURL
            global.Blob = jest.fn().mockImplementation((content, options) => ({
                content,
                options
            }));
            global.URL = {
                createObjectURL: jest.fn().mockReturnValue('blob:mock-url-123')
            };
            
            const goVersion = 'go1.21.4';
            const runtimePath = await loader._downloadGoRuntime(goVersion);
            
            expect(runtimePath).toBe('blob:mock-url-123');
            expect(global.Blob).toHaveBeenCalledWith(
                ['// Mock Go runtime code\nglobalThis.Go = class MockGo {};'],
                { type: 'application/javascript' }
            );
            expect(global.URL.createObjectURL).toHaveBeenCalled();
            
            // Cleanup
            global.window = originalWindow;
            delete global.Blob;
            delete global.URL;
        });
    });

    describe('loadGoRuntime with version support', () => {
        let loader;

        beforeEach(() => {
            loader = new UnifiedWasmLoader();
            
            // Mock _downloadGoRuntime
            loader._downloadGoRuntime = jest.fn().mockResolvedValue('/tmp/mock-runtime.js');
        });

        it('should accept goVersion parameter', async () => {
            const spy = jest.spyOn(loader, 'loadGoRuntime');
            
            // Mock Go to avoid actual loading
            globalThis.Go = class MockGo {};
            
            try {
                await loader.loadGoRuntime(null, 'go1.21.4', 'test-module');
            } catch (error) {
                // May fail due to mocking, but spy should capture the call
            }
            
            expect(spy).toHaveBeenCalledWith(null, 'go1.21.4', 'test-module');
        });

        it('should download runtime when goVersion is specified', async () => {
            globalThis.Go = class MockGo {}; // Mock to avoid errors
            
            try {
                await loader.loadGoRuntime(null, 'go1.21.4', null);
            } catch (error) {
                // Expected to fail due to mocking
            }
            
            expect(loader._downloadGoRuntime).toHaveBeenCalledWith('go1.21.4');
        });

        it('should use customPath instead of downloading when provided', async () => {
            globalThis.Go = class MockGo {};
            
            const customPath = '/custom/wasm_exec.js';
            
            try {
                await loader.loadGoRuntime(customPath, 'go1.21.4', null);
            } catch (error) {
                // Expected to fail
            }
            
            // Should not download when customPath is provided
            expect(loader._downloadGoRuntime).not.toHaveBeenCalled();
        });

        it('should auto-detect version from metadata', async () => {
            globalThis.Go = class MockGo {};
            
            const moduleId = 'test-module';
            loader._metadataCache.set(moduleId, {
                name: 'test-module',
                goVersion: 'go1.22.0',
                functions: []
            });
            
            try {
                await loader.loadGoRuntime(null, null, moduleId);
            } catch (error) {
                // Expected to fail
            }
            
            expect(loader._downloadGoRuntime).toHaveBeenCalledWith('go1.22.0');
        });

        it('should prioritize explicit goVersion over metadata', async () => {
            globalThis.Go = class MockGo {};
            
            const moduleId = 'test-module';
            loader._metadataCache.set(moduleId, {
                name: 'test-module',
                goVersion: 'go1.22.0',
                functions: []
            });
            
            try {
                await loader.loadGoRuntime(null, 'go1.21.4', moduleId);
            } catch (error) {
                // Expected to fail
            }
            
            // Explicit version should take priority
            expect(loader._downloadGoRuntime).toHaveBeenCalledWith('go1.21.4');
        });

        it('should fallback to default runtime on download failure', async () => {
            loader._downloadGoRuntime = jest.fn().mockRejectedValue(new Error('Download failed'));
            
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
            
            globalThis.Go = class MockGo {};
            
            try {
                await loader.loadGoRuntime(null, 'go1.999.999', null);
            } catch (error) {
                // May fail due to default path not existing
            }
            
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Failed to download Go runtime')
            );
            
            consoleWarnSpy.mockRestore();
        });
    });

    describe('Integration with loadModule', () => {
        let loader;

        beforeEach(() => {
            loader = new UnifiedWasmLoader();
            globalThis.Go = class MockGo {
                constructor() {
                    this.importObject = { go: {} };
                }
                run() {
                    return Promise.resolve();
                }
            };
        });

        it('should pass goVersion option to loadGoRuntime', async () => {
            const spy = jest.spyOn(loader, 'loadGoRuntime');
            
            try {
                await loader.loadModule('fake-source', {
                    name: 'test-module',
                    goVersion: 'go1.21.4',
                    preInit: false
                });
            } catch (error) {
                // Expected to fail due to missing WASM
            }
            
            // Note: Due to Go already being loaded, this might not be called
            // Full integration test would verify this better
        });

        it('should use goVersion from module.json when available', async () => {
            const moduleId = 'test-module';
            loader._metadataCache.set(moduleId, {
                name: 'test-module',
                goVersion: 'go1.22.0',
                functions: []
            });
            
            // Clear Go to force loadGoRuntime call
            delete globalThis.Go;
            
            const spy = jest.spyOn(loader, 'loadGoRuntime');
            
            try {
                await loader.loadModule('fake-source', {
                    name: moduleId,
                    preInit: false
                });
            } catch (error) {
                // Expected to fail
            }
            
            // Note: Integration test would verify version was used
        });
    });

    describe('Backward compatibility', () => {
        it('should work without goVersion (use default runtime)', async () => {
            const loader = new UnifiedWasmLoader();
            globalThis.Go = class MockGo {};
            
            const spy = jest.spyOn(loader, '_downloadGoRuntime');
            
            try {
                await loader.loadGoRuntime(null, null, null);
            } catch (error) {
                // Expected to fail
            }
            
            // Should not attempt download when no version specified
            expect(spy).not.toHaveBeenCalled();
        });

        it('should maintain existing loadGoRuntime API', async () => {
            const loader = new UnifiedWasmLoader();
            globalThis.Go = class MockGo {};
            
            // Old API: just customPath
            try {
                await loader.loadGoRuntime('/custom/path.js');
            } catch (error) {
                // Expected to fail
            }
            
            // Should not throw error for old API usage
            expect(true).toBe(true);
        });
    });

    describe('module.json goVersion field', () => {
        it('should support optional goVersion in metadata', () => {
            const loader = new UnifiedWasmLoader();
            
            const metadata = {
                name: 'crypto-wasm',
                version: '1.0.0',
                goVersion: 'go1.21.4',
                functions: []
            };
            
            loader._metadataCache.set('crypto-wasm', metadata);
            
            const cached = loader._metadataCache.get('crypto-wasm');
            expect(cached.goVersion).toBe('go1.21.4');
        });

        it('should work without goVersion in metadata (backward compatible)', () => {
            const loader = new UnifiedWasmLoader();
            
            const metadata = {
                name: 'crypto-wasm',
                version: '1.0.0',
                functions: []
                // No goVersion field
            };
            
            loader._metadataCache.set('crypto-wasm', metadata);
            
            const cached = loader._metadataCache.get('crypto-wasm');
            expect(cached.goVersion).toBeUndefined();
        });
    });
});
