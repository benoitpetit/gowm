/**
 * Unit tests for UnifiedWasmLoader
 */
const UnifiedWasmLoader = require('../../src/loaders/unified-loader');

describe('UnifiedWasmLoader', () => {
    let loader;
    let consoleLogSpy;

    beforeAll(() => {
        // Suppress console.log for cleaner test output
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterAll(() => {
        consoleLogSpy.mockRestore();
    });

    beforeEach(() => {
        loader = new UnifiedWasmLoader();
        // Clean up global namespace
        delete globalThis.__gowm_modules_;
        delete globalThis.__gowm_ready;
    });

    describe('constructor', () => {
        test('should initialize with empty modules map', () => {
            expect(loader.modules).toBeInstanceOf(Map);
            expect(loader.modules.size).toBe(0);
        });

        test('should detect Node.js environment', () => {
            expect(loader.isNode).toBe(true);
        });

        test('should initialize default branch cache', () => {
            expect(loader._defaultBranchCache).toBeInstanceOf(Map);
        });
    });

    describe('isLocalPath()', () => {
        test('should detect relative paths starting with ./', () => {
            expect(loader.isLocalPath('./module.wasm')).toBe(true);
            expect(loader.isLocalPath('./path/to/file')).toBe(true);
        });

        test('should detect relative paths starting with ../', () => {
            expect(loader.isLocalPath('../module.wasm')).toBe(true);
        });

        test('should detect absolute paths', () => {
            expect(loader.isLocalPath('/tmp/module.wasm')).toBe(true);
        });

        test('should detect paths with tilde', () => {
            expect(loader.isLocalPath('~/modules/test.wasm')).toBe(true);
        });

        test('should detect paths ending with .wasm', () => {
            expect(loader.isLocalPath('module.wasm')).toBe(true);
        });

        test('should detect Windows paths', () => {
            expect(loader.isLocalPath('C:\\modules\\test.wasm')).toBe(true);
        });

        test('should not detect GitHub repos as local', () => {
            expect(loader.isLocalPath('owner/repo')).toBe(false);
        });

        test('should not detect HTTP URLs as local', () => {
            expect(loader.isLocalPath('https://example.com/module.wasm')).toBe(false);
        });
    });

    describe('isGitHubRepo()', () => {
        test('should detect owner/repo format', () => {
            expect(loader.isGitHubRepo('benoitpetit/wasm-modules-repository')).toBe(true);
            expect(loader.isGitHubRepo('owner/repo')).toBe(true);
        });

        test('should detect full GitHub URLs', () => {
            expect(loader.isGitHubRepo('https://github.com/owner/repo')).toBe(true);
        });

        test('should NOT detect local paths as GitHub repos', () => {
            expect(loader.isGitHubRepo('./my/path')).toBe(false);
            expect(loader.isGitHubRepo('../modules/test')).toBe(false);
            expect(loader.isGitHubRepo('/absolute/path')).toBe(false);
        });

        test('should NOT detect HTTP URLs as GitHub repos', () => {
            expect(loader.isGitHubRepo('https://example.com/file.wasm')).toBe(false);
        });

        test('should NOT detect single segments', () => {
            expect(loader.isGitHubRepo('singlename')).toBe(false);
        });

        test('should NOT detect paths with more than 2 segments', () => {
            expect(loader.isGitHubRepo('a/b/c')).toBe(false);
        });

        test('should NOT detect segments with spaces', () => {
            expect(loader.isGitHubRepo('owner name/repo name')).toBe(false);
        });
    });

    describe('isHttpUrl()', () => {
        test('should detect http URLs', () => {
            expect(loader.isHttpUrl('http://example.com/module.wasm')).toBe(true);
        });

        test('should detect https URLs', () => {
            expect(loader.isHttpUrl('https://example.com/module.wasm')).toBe(true);
        });

        test('should not detect file paths', () => {
            expect(loader.isHttpUrl('./module.wasm')).toBe(false);
        });

        test('should not detect ftp URLs', () => {
            expect(loader.isHttpUrl('ftp://example.com/file')).toBe(false);
        });
    });

    describe('extractModuleId()', () => {
        beforeEach(() => {
            // Ensure Node.js path module is loaded
            loader.path = require('path');
        });

        test('should extract repo name from owner/repo', () => {
            expect(loader.extractModuleId('benoitpetit/wasm-modules')).toBe('wasm-modules');
        });

        test('should extract repo name from GitHub URL', () => {
            expect(loader.extractModuleId('https://github.com/owner/my-repo')).toBe('my-repo');
        });

        test('should use parent dir when filename is "main"', () => {
            expect(loader.extractModuleId('./math-wasm/main.wasm')).toBe('math-wasm');
        });

        test('should use parent dir when filename is "index"', () => {
            expect(loader.extractModuleId('./crypto-wasm/index.wasm')).toBe('crypto-wasm');
        });

        test('should use basename for non-generic filenames', () => {
            expect(loader.extractModuleId('./modules/calculator.wasm')).toBe('calculator');
        });

        test('should handle simple filename', () => {
            expect(loader.extractModuleId('mymodule.wasm')).toBe('mymodule');
        });
    });

    describe('parseGitHubRepo()', () => {
        test('should parse owner/repo format', () => {
            const result = loader.parseGitHubRepo('benoitpetit/gowm');
            expect(result.owner).toBe('benoitpetit');
            expect(result.repo).toBe('gowm');
            expect(result.fullRepo).toBe('benoitpetit/gowm');
        });

        test('should parse full GitHub URL', () => {
            const result = loader.parseGitHubRepo('https://github.com/benoitpetit/gowm');
            expect(result.owner).toBe('benoitpetit');
            expect(result.repo).toBe('gowm');
        });

        test('should strip .git suffix from URLs', () => {
            const result = loader.parseGitHubRepo('https://github.com/owner/repo.git');
            expect(result.repo).toBe('repo');
        });

        test('should throw on invalid format', () => {
            expect(() => loader.parseGitHubRepo('invalidformat'))
                .toThrow('GitHub repository must be in format "owner/repo"');
        });

        test('should throw on invalid GitHub URL', () => {
            expect(() => loader.parseGitHubRepo('https://notgithub.com/owner/repo'))
                .toThrow('Invalid GitHub URL format');
        });
    });

    describe('_isolateModuleFunctions()', () => {
        test('should register new functions in namespace', () => {
            const keysBefore = new Set(Object.keys(globalThis));

            // Simulate Go adding functions
            globalThis.myFunc1 = function () { return 1; };
            globalThis.myFunc2 = function () { return 2; };

            loader._isolateModuleFunctions('test-mod', keysBefore);

            expect(globalThis.__gowm_modules_).toBeDefined();
            expect(globalThis.__gowm_modules_['test-mod']).toBeDefined();
            expect(typeof globalThis.__gowm_modules_['test-mod'].myFunc1).toBe('function');
            expect(typeof globalThis.__gowm_modules_['test-mod'].myFunc2).toBe('function');

            // Clean up
            delete globalThis.myFunc1;
            delete globalThis.myFunc2;
        });

        test('should skip internal __gowm_ prefixed keys', () => {
            const keysBefore = new Set(Object.keys(globalThis));

            globalThis.__gowm_ready = true;
            globalThis.__gowm_internal = function () { };

            loader._isolateModuleFunctions('test-mod', keysBefore);

            expect(globalThis.__gowm_modules_['test-mod'].__gowm_ready).toBeUndefined();
            expect(globalThis.__gowm_modules_['test-mod'].__gowm_internal).toBeUndefined();

            // Clean up
            delete globalThis.__gowm_ready;
            delete globalThis.__gowm_internal;
        });

        test('should skip ready signals', () => {
            const keysBefore = new Set(Object.keys(globalThis));

            globalThis.__test_mod_ready = true;

            loader._isolateModuleFunctions('test-mod', keysBefore);

            expect(globalThis.__gowm_modules_['test-mod'].__test_mod_ready).toBeUndefined();

            // Clean up
            delete globalThis.__test_mod_ready;
        });
    });

    describe('unloadModule()', () => {
        test('should return false for non-existent module', () => {
            expect(loader.unloadModule('nonexistent')).toBe(false);
        });

        test('should clean up namespace on unload', () => {
            // Set up module
            const go = { exit: jest.fn() };
            loader.modules.set('mymod', { go, ready: true });

            globalThis.__gowm_modules_ = {
                mymod: {
                    testFunc: function () { return 1; }
                }
            };
            globalThis.testFunc = globalThis.__gowm_modules_.mymod.testFunc;

            // Unload
            expect(loader.unloadModule('mymod')).toBe(true);

            // Verify cleanup
            expect(loader.modules.has('mymod')).toBe(false);
            expect(globalThis.__gowm_modules_.mymod).toBeUndefined();
            expect(globalThis.testFunc).toBeUndefined();
        });

        test('should handle go.exit errors gracefully', () => {
            const go = {
                exit: jest.fn().mockImplementation(() => { throw new Error('exit error'); })
            };
            loader.modules.set('mymod', { go, ready: true });

            expect(loader.unloadModule('mymod')).toBe(true);
        });
    });

    describe('loadWasmBytes()', () => {
        test('should route local paths to loadFromFile', async () => {
            loader.loadFromFile = jest.fn().mockResolvedValue(new ArrayBuffer(8));
            await loader.loadWasmBytes('./test.wasm', { cache: false });
            expect(loader.loadFromFile).toHaveBeenCalledWith('./test.wasm');
        });

        test('should route HTTP URLs to loadFromHttp', async () => {
            loader.loadFromHttp = jest.fn().mockResolvedValue(new ArrayBuffer(8));
            await loader.loadWasmBytes('https://example.com/test.wasm', { cache: false });
            expect(loader.loadFromHttp).toHaveBeenCalledWith('https://example.com/test.wasm', { cache: false });
        });

        test('should route owner/repo to loadFromGitHub', async () => {
            loader.loadFromGitHub = jest.fn().mockResolvedValue(new ArrayBuffer(8));
            await loader.loadWasmBytes('benoitpetit/wasm-modules', { cache: false });
            expect(loader.loadFromGitHub).toHaveBeenCalledWith('benoitpetit/wasm-modules', { cache: false });
        });

        test('should return cached bytes when cache is enabled', async () => {
            const bytes = new ArrayBuffer(8);
            const cacheKey = loader._getCacheKey('./test.wasm');
            loader._wasmBytesCache.set(cacheKey, { bytes, timestamp: Date.now() });
            
            loader.loadFromFile = jest.fn();
            const result = await loader.loadWasmBytes('./test.wasm');
            
            expect(result).toBe(bytes);
            expect(loader.loadFromFile).not.toHaveBeenCalled();
        });

        test('should skip cache when cache: false', async () => {
            const cachedBytes = new ArrayBuffer(8);
            const freshBytes = new ArrayBuffer(16);
            const cacheKey = loader._getCacheKey('./test.wasm');
            loader._wasmBytesCache.set(cacheKey, { bytes: cachedBytes, timestamp: Date.now() });
            
            loader.loadFromFile = jest.fn().mockResolvedValue(freshBytes);
            const result = await loader.loadWasmBytes('./test.wasm', { cache: false });
            
            expect(result).toBe(freshBytes);
            expect(loader.loadFromFile).toHaveBeenCalled();
        });
    });

    describe('loadFromFile()', () => {
        test('should throw if fs is not available', async () => {
            loader.fs = null;
            await expect(loader.loadFromFile('./test.wasm'))
                .rejects.toThrow('File system not available');
        });

        test('should throw if file does not exist', async () => {
            loader.fs = {
                existsSync: jest.fn().mockReturnValue(false),
                readFileSync: jest.fn()
            };
            await expect(loader.loadFromFile('./nonexistent.wasm'))
                .rejects.toThrow('WASM file not found');
        });

        test('should read file and return ArrayBuffer', async () => {
            const buffer = Buffer.from([0, 1, 2, 3]);
            loader.fs = {
                existsSync: jest.fn().mockReturnValue(true),
                readFileSync: jest.fn().mockReturnValue(buffer)
            };
            const result = await loader.loadFromFile('./test.wasm');
            expect(result).toBeInstanceOf(ArrayBuffer);
        });
    });

    describe('getStats()', () => {
        test('should return stats object with cache info', () => {
            const stats = loader.getStats();
            expect(stats.totalModules).toBe(0);
            expect(stats.environment).toBe('Node.js');
            expect(stats.cacheSize).toBe(0);
            expect(stats.modules).toEqual([]);
        });
    });

    // =========================================================================
    // Phase 2 tests
    // =========================================================================

    describe('fetchWithRetry()', () => {
        let originalFetch;

        beforeEach(() => {
            originalFetch = globalThis.fetch;
        });

        afterEach(() => {
            globalThis.fetch = originalFetch;
        });

        test('should return response on first success', async () => {
            const mockResponse = { ok: true, status: 200 };
            globalThis.fetch = jest.fn().mockResolvedValue(mockResponse);

            const result = await loader.fetchWithRetry('https://example.com/test.wasm');
            expect(result).toBe(mockResponse);
            expect(globalThis.fetch).toHaveBeenCalledTimes(1);
        });

        test('should retry on failure and succeed', async () => {
            const mockResponse = { ok: true, status: 200 };
            globalThis.fetch = jest.fn()
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce(mockResponse);

            const result = await loader.fetchWithRetry('https://example.com/test.wasm', {
                retries: 2,
                retryDelay: 10
            });
            expect(result).toBe(mockResponse);
            expect(globalThis.fetch).toHaveBeenCalledTimes(2);
        });

        test('should throw after max retries exhausted', async () => {
            globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

            await expect(
                loader.fetchWithRetry('https://example.com/test.wasm', {
                    retries: 2,
                    retryDelay: 10
                })
            ).rejects.toThrow('Network error');
            // 1 initial + 2 retries = 3 total
            expect(globalThis.fetch).toHaveBeenCalledTimes(3);
        });

        test('should use exponential backoff', async () => {
            globalThis.fetch = jest.fn()
                .mockRejectedValueOnce(new Error('fail1'))
                .mockRejectedValueOnce(new Error('fail2'))
                .mockResolvedValueOnce({ ok: true });

            const start = Date.now();
            await loader.fetchWithRetry('https://example.com/test.wasm', {
                retries: 3,
                retryDelay: 50
            });
            const elapsed = Date.now() - start;
            // 50ms (2^0) + 100ms (2^1) = 150ms minimum
            expect(elapsed).toBeGreaterThanOrEqual(100);
        });

        test('should pass method and headers to fetch', async () => {
            globalThis.fetch = jest.fn().mockResolvedValue({ ok: true });

            await loader.fetchWithRetry('https://example.com/', {
                method: 'HEAD',
                headers: { 'Accept': 'application/json' },
                retries: 0
            });

            const fetchOpts = globalThis.fetch.mock.calls[0][1];
            expect(fetchOpts.method).toBe('HEAD');
            expect(fetchOpts.headers.Accept).toBe('application/json');
        });

        test('should use default retry config', async () => {
            globalThis.fetch = jest.fn().mockRejectedValue(new Error('fail'));

            await expect(
                loader.fetchWithRetry('https://example.com/test.wasm', { retryDelay: 10 })
            ).rejects.toThrow('fail');
            // default retries = 3, so 4 total attempts
            expect(globalThis.fetch).toHaveBeenCalledTimes(4);
        });
    });

    describe('waitForReady() - callback-first', () => {
        test('should resolve immediately via callback', async () => {
            const moduleId = 'fast-module';
            const start = Date.now();
            
            // Simulate Go calling the callback immediately
            setTimeout(() => {
                const callbackKey = `__gowm_${moduleId}_ready_callback`;
                if (globalThis[callbackKey]) {
                    globalThis[callbackKey]();
                }
            }, 5);

            await loader.waitForReady(moduleId, 5000);
            const elapsed = Date.now() - start;
            expect(elapsed).toBeLessThan(200);
        });

        test('should resolve via polling fallback', async () => {
            const moduleId = 'poll-module';
            
            setTimeout(() => {
                globalThis.__gowm_ready = true;
            }, 30);

            await loader.waitForReady(moduleId, 5000);
            expect(true).toBe(true); // resolved without timeout
        });

        test('should reject on timeout', async () => {
            const moduleId = 'slow-module';

            await expect(
                loader.waitForReady(moduleId, 100)
            ).rejects.toThrow('failed to initialize within 100ms');
        });

        test('should use adaptive polling intervals', async () => {
            const moduleId = 'adaptive-module';
            
            // Resolve after 20ms via polling
            setTimeout(() => {
                globalThis[`__${moduleId}_ready`] = true;
            }, 20);

            const start = Date.now();
            await loader.waitForReady(moduleId, 5000);
            const elapsed = Date.now() - start;
            // With 10ms initial delay + fast polling, should resolve quickly
            expect(elapsed).toBeLessThan(200);

            delete globalThis[`__${moduleId}_ready`];
        });
    });

    describe('_decompressBytes()', () => {
        beforeEach(async () => {
            await loader.ensureNodeModules();
        });

        test('should decompress gzip bytes', async () => {
            const zlib = require('zlib');
            const original = Buffer.from('Hello WASM compressed');
            const compressed = zlib.gzipSync(original);

            const result = await loader._decompressBytes(new Uint8Array(compressed), 'gzip');
            const decoded = Buffer.from(result);
            expect(decoded.toString()).toBe('Hello WASM compressed');
        });

        test('should decompress brotli bytes', async () => {
            const zlib = require('zlib');
            const original = Buffer.from('Hello WASM brotli');
            const compressed = zlib.brotliCompressSync(original);

            const result = await loader._decompressBytes(new Uint8Array(compressed), 'br');
            const decoded = Buffer.from(result);
            expect(decoded.toString()).toBe('Hello WASM brotli');
        });

        test('should return ArrayBuffer', async () => {
            const zlib = require('zlib');
            const compressed = zlib.gzipSync(Buffer.from('test'));

            const result = await loader._decompressBytes(new Uint8Array(compressed), 'gzip');
            expect(result).toBeInstanceOf(ArrayBuffer);
        });
    });

    describe('_tryCompressedVariants()', () => {
        let originalFetch;

        beforeEach(() => {
            originalFetch = globalThis.fetch;
        });

        afterEach(() => {
            globalThis.fetch = originalFetch;
        });

        test('should return null for non-.wasm URLs', async () => {
            const result = await loader._tryCompressedVariants('https://example.com/file.txt');
            expect(result).toBeNull();
        });

        test('should try .br and .gz variants', async () => {
            globalThis.fetch = jest.fn().mockResolvedValue({ ok: false });

            const result = await loader._tryCompressedVariants('https://example.com/test.wasm');
            expect(result).toBeNull();
            // Should try .br first, then .gz
            expect(globalThis.fetch.mock.calls[0][0]).toBe('https://example.com/test.wasm.br');
            expect(globalThis.fetch.mock.calls[1][0]).toBe('https://example.com/test.wasm.gz');
        });

        test('should return decompressed bytes when compressed available', async () => {
            const zlib = require('zlib');
            const original = Buffer.from([0, 97, 115, 109]); // fake wasm magic bytes
            const compressed = zlib.gzipSync(original);

            globalThis.fetch = jest.fn()
                .mockResolvedValueOnce({ ok: false }) // .br not found
                .mockResolvedValueOnce({
                    ok: true,
                    arrayBuffer: () => Promise.resolve(compressed.buffer.slice(
                        compressed.byteOffset, 
                        compressed.byteOffset + compressed.byteLength
                    ))
                });

            const result = await loader._tryCompressedVariants('https://example.com/test.wasm');
            expect(result).toBeInstanceOf(ArrayBuffer);
        });
    });

    describe('Cache system', () => {
        describe('_getCacheKey()', () => {
            test('should generate deterministic cache key', () => {
                const key1 = loader._getCacheKey('https://example.com/test.wasm');
                const key2 = loader._getCacheKey('https://example.com/test.wasm');
                expect(key1).toBe(key2);
            });

            test('should generate different keys for different sources', () => {
                const key1 = loader._getCacheKey('https://example.com/a.wasm');
                const key2 = loader._getCacheKey('https://example.com/b.wasm');
                expect(key1).not.toBe(key2);
            });

            test('should use SHA256 in Node.js', () => {
                const crypto = require('crypto');
                loader.crypto = crypto;
                const key = loader._getCacheKey('test-source');
                expect(key.length).toBe(64); // SHA256 hex = 64 chars
            });
        });

        describe('_resolveCacheOptions()', () => {
            test('should return default enabled options', () => {
                const opts = loader._resolveCacheOptions({});
                expect(opts.enabled).toBe(true);
                expect(opts.ttl).toBe(3600000);
                expect(opts.diskCache).toBe(true);
            });

            test('should disable cache with cache: false', () => {
                const opts = loader._resolveCacheOptions({ cache: false });
                expect(opts.enabled).toBe(false);
            });

            test('should accept custom TTL', () => {
                const opts = loader._resolveCacheOptions({ cache: { ttl: 60000 } });
                expect(opts.ttl).toBe(60000);
            });

            test('should accept diskCache: false', () => {
                const opts = loader._resolveCacheOptions({ cache: { diskCache: false } });
                expect(opts.diskCache).toBe(false);
            });
        });

        describe('Memory cache (L1)', () => {
            test('should cache and retrieve bytes', async () => {
                const bytes = new ArrayBuffer(8);
                const key = 'test-key';
                const cacheOpts = { enabled: true, ttl: 3600000, diskCache: false };

                await loader._saveToCache(key, bytes, cacheOpts);
                const result = await loader._getFromCache(key, cacheOpts);
                expect(result).toBe(bytes);
            });

            test('should return null for expired entries', async () => {
                const bytes = new ArrayBuffer(8);
                const key = 'expired-key';

                loader._wasmBytesCache.set(key, { bytes, timestamp: Date.now() - 100000 });
                const result = await loader._getFromCache(key, { ttl: 1000, diskCache: false });
                expect(result).toBeNull();
            });

            test('should evict oldest entries when max size reached', () => {
                loader._cacheDefaults.memoryCacheMaxSize = 3;

                for (let i = 0; i < 5; i++) {
                    loader._wasmBytesCache.set(`key-${i}`, { 
                        bytes: new ArrayBuffer(8), 
                        timestamp: Date.now() 
                    });
                }
                loader._evictMemoryCacheIfNeeded();

                expect(loader._wasmBytesCache.size).toBe(3);
                // Oldest entries (key-0, key-1) should be removed
                expect(loader._wasmBytesCache.has('key-0')).toBe(false);
                expect(loader._wasmBytesCache.has('key-1')).toBe(false);
                expect(loader._wasmBytesCache.has('key-4')).toBe(true);

                // Reset
                loader._cacheDefaults.memoryCacheMaxSize = 50;
            });
        });

        describe('clearCache()', () => {
            test('should clear memory cache', async () => {
                loader._wasmBytesCache.set('key1', { bytes: new ArrayBuffer(8), timestamp: Date.now() });
                loader._wasmBytesCache.set('key2', { bytes: new ArrayBuffer(8), timestamp: Date.now() });

                await loader.clearCache({ disk: false });
                expect(loader._wasmBytesCache.size).toBe(0);
            });
        });

        describe('_hasCachedBytes()', () => {
            test('should return true for valid cached entry', () => {
                const key = loader._getCacheKey('test-source');
                loader._wasmBytesCache.set(key, { bytes: new ArrayBuffer(8), timestamp: Date.now() });
                expect(loader._hasCachedBytes('test-source')).toBe(true);
            });

            test('should return false for expired entry', () => {
                const key = loader._getCacheKey('old-source');
                loader._wasmBytesCache.set(key, { bytes: new ArrayBuffer(8), timestamp: 0 });
                expect(loader._hasCachedBytes('old-source')).toBe(false);
            });

            test('should return false for missing entry', () => {
                expect(loader._hasCachedBytes('missing-source')).toBe(false);
            });
        });
    });

    describe('_instantiateStreaming()', () => {
        let originalFetch;
        let originalInstantiateStreaming;
        let originalInstantiate;

        beforeEach(() => {
            originalFetch = globalThis.fetch;
            originalInstantiateStreaming = WebAssembly.instantiateStreaming;
            originalInstantiate = WebAssembly.instantiate;
        });

        afterEach(() => {
            globalThis.fetch = originalFetch;
            WebAssembly.instantiateStreaming = originalInstantiateStreaming;
            WebAssembly.instantiate = originalInstantiate;
        });

        test('should fallback to standard instantiate when MIME type is wrong', async () => {
            const mockResult = { instance: { exports: {} } };
            const bytes = new ArrayBuffer(8);
            
            globalThis.fetch = jest.fn().mockResolvedValue({
                ok: true,
                headers: { get: () => 'application/octet-stream' },
                arrayBuffer: () => Promise.resolve(bytes)
            });
            WebAssembly.instantiate = jest.fn().mockResolvedValue(mockResult);
            
            // Mock _findCompressedUrl to return null (no compressed variants)
            loader._findCompressedUrl = jest.fn().mockResolvedValue(null);

            const result = await loader._instantiateStreaming(
                'https://example.com/test.wasm',
                {},
                { retries: 0, retryDelay: 10 }
            );

            expect(WebAssembly.instantiate).toHaveBeenCalledWith(bytes, {});
            expect(result).toBe(mockResult);
        });

        test('should use streaming when content-type is application/wasm', async () => {
            const mockResult = { instance: { exports: {} } };
            const mockResponse = {
                ok: true,
                headers: { get: (h) => h === 'content-type' ? 'application/wasm' : null }
            };

            globalThis.fetch = jest.fn().mockResolvedValue(mockResponse);
            WebAssembly.instantiateStreaming = jest.fn().mockResolvedValue(mockResult);
            loader._findCompressedUrl = jest.fn().mockResolvedValue(null);

            const result = await loader._instantiateStreaming(
                'https://example.com/test.wasm',
                {},
                { retries: 0, retryDelay: 10 }
            );

            expect(WebAssembly.instantiateStreaming).toHaveBeenCalledWith(mockResponse, {});
            expect(result).toBe(mockResult);
        });
    });

    // =========================================================================
    //  — Metadata & Integrity Tests
    // =========================================================================

    describe('Metadata cache (_metadataCache)', () => {
        test('should initialize with empty metadata cache', () => {
            expect(loader._metadataCache).toBeInstanceOf(Map);
            expect(loader._metadataCache.size).toBe(0);
        });

        test('should store metadata via _metadataCache.set()', () => {
            const metadata = { name: 'test', version: '1.0.0', functions: [] };
            loader._metadataCache.set('test-mod', metadata);
            expect(loader._metadataCache.get('test-mod')).toBe(metadata);
        });

        test('getModuleMetadata() should return cached metadata', () => {
            const metadata = { name: 'math-wasm', version: '0.2.0' };
            loader._metadataCache.set('math', metadata);
            expect(loader.getModuleMetadata('math')).toBe(metadata);
        });

        test('getModuleMetadata() should return null for unknown module', () => {
            expect(loader.getModuleMetadata('unknown')).toBeNull();
        });
    });

    describe('fetchModuleMetadata()', () => {
        let originalFetch;

        beforeEach(() => {
            originalFetch = globalThis.fetch;
        });

        afterEach(() => {
            globalThis.fetch = originalFetch;
        });

        test('should fetch and parse module.json from GitHub', async () => {
            const mockMetadata = { name: 'math-wasm', version: '0.2.0', functions: [{ name: 'add' }] };
            globalThis.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockMetadata)
            });

            const result = await loader.fetchModuleMetadata(
                { owner: 'benoitpetit', repo: 'wasm-modules-repository' },
                'master',
                'math-wasm/',
                'math',
                {}
            );

            expect(result).toEqual(mockMetadata);
            expect(globalThis.fetch).toHaveBeenCalledWith(
                expect.stringContaining('math-wasm/module.json'),
                expect.any(Object)
            );
        });

        test('should return null when module.json is not found', async () => {
            globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

            const result = await loader.fetchModuleMetadata(
                { owner: 'test', repo: 'repo' },
                'main',
                '',
                'test',
                {}
            );

            expect(result).toBeNull();
        });

        test('should return null on network error', async () => {
            globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

            const result = await loader.fetchModuleMetadata(
                { owner: 'test', repo: 'repo' },
                'main',
                '',
                'test',
                {}
            );

            expect(result).toBeNull();
        });
    });

    describe('fetchIntegrityHash()', () => {
        let originalFetch;

        beforeEach(() => {
            originalFetch = globalThis.fetch;
        });

        afterEach(() => {
            globalThis.fetch = originalFetch;
        });

        test('should fetch and return integrity hash', async () => {
            globalThis.fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('sha256-roLCI1vD1aDH6m/yC5zY2RF39zwjDtbUvBB+y8yaidQ=\n')
            });

            const result = await loader.fetchIntegrityHash(
                { owner: 'benoitpetit', repo: 'wasm-modules-repository' },
                'master',
                'math-wasm/',
                {}
            );

            expect(result).toBe('sha256-roLCI1vD1aDH6m/yC5zY2RF39zwjDtbUvBB+y8yaidQ=');
        });

        test('should return null when integrity file not found', async () => {
            globalThis.fetch = jest.fn().mockResolvedValue({ ok: false });

            const result = await loader.fetchIntegrityHash(
                { owner: 'test', repo: 'repo' },
                'main',
                '',
                {}
            );

            expect(result).toBeNull();
        });

        test('should use custom filename from options', async () => {
            globalThis.fetch = jest.fn().mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('sha256-abc123=')
            });

            await loader.fetchIntegrityHash(
                { owner: 'test', repo: 'repo' },
                'main',
                'mod/',
                { filename: 'custom.wasm' }
            );

            expect(globalThis.fetch).toHaveBeenCalledWith(
                expect.stringContaining('mod/custom.wasm.integrity'),
                expect.any(Object)
            );
        });
    });

    describe('verifyIntegrity()', () => {
        test('should pass when hashes match', async () => {
            // Create known bytes and compute expected hash
            const bytes = new Uint8Array([1, 2, 3, 4, 5]).buffer;
            const crypto = require('crypto');
            const expectedHash = crypto.createHash('sha256').update(Buffer.from(bytes)).digest('base64');
            const sriHash = `sha256-${expectedHash}`;

            await expect(
                loader.verifyIntegrity(bytes, sriHash, 'test-mod')
            ).resolves.toBeUndefined();
        });

        test('should throw when hashes do not match', async () => {
            const bytes = new Uint8Array([1, 2, 3]).buffer;
            const sriHash = 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

            await expect(
                loader.verifyIntegrity(bytes, sriHash, 'test-mod')
            ).rejects.toThrow('Integrity check failed');
        });

        test('should warn for unknown hash format', async () => {
            const spy = jest.spyOn(console, 'warn').mockImplementation();
            const bytes = new Uint8Array([1]).buffer;

            await loader.verifyIntegrity(bytes, 'md5-abc', 'test-mod');

            expect(spy).toHaveBeenCalledWith(
                expect.stringContaining('Unknown integrity format')
            );
            spy.mockRestore();
        });
    });

    describe('waitForReady() with readySignal parameter', () => {
        afterEach(() => {
            delete globalThis.__gowm_ready;
            delete globalThis.__gowm_test_ready_callback;
            delete globalThis.__test_ready;
            delete globalThis.test_signal;
        });

        test('should resolve when custom readySignal is set', async () => {
            const promise = loader.waitForReady('test', 5000, 'test_signal');
            
            // Simulate Go setting the signal after a delay
            setTimeout(() => {
                globalThis.test_signal = true;
            }, 30);

            await expect(promise).resolves.toBeUndefined();
        });

        test('should still work with standard signals when readySignal is null', async () => {
            const promise = loader.waitForReady('test', 5000, null);
            
            setTimeout(() => {
                globalThis.__gowm_ready = true;
            }, 30);

            await expect(promise).resolves.toBeUndefined();
        });
    });

    describe('loadFromGitHub() with metadata', () => {
        let originalFetch;

        beforeEach(() => {
            originalFetch = globalThis.fetch;
        });

        afterEach(() => {
            globalThis.fetch = originalFetch;
        });

        test('should fetch metadata alongside WASM bytes', async () => {
            const mockMetadata = { name: 'math-wasm', version: '0.2.0' };
            const mockWasmBytes = new ArrayBuffer(8);
            let callCount = 0;

            globalThis.fetch = jest.fn().mockImplementation((url) => {
                if (url.includes('module.json')) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve(mockMetadata)
                    });
                }
                if (url.includes('.integrity')) {
                    return Promise.resolve({ ok: false });
                }
                if (url.includes('api.github.com')) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ default_branch: 'master' })
                    });
                }
                // Reject compressed variants to avoid decompression of invalid data
                if (url.endsWith('.br') || url.endsWith('.gz')) {
                    return Promise.resolve({ ok: false });
                }
                // WASM file
                return Promise.resolve({
                    ok: true,
                    arrayBuffer: () => Promise.resolve(mockWasmBytes),
                    headers: { get: () => null }
                });
            });

            const bytes = await loader.loadFromGitHub('benoitpetit/wasm-modules-repository', {
                path: 'math-wasm',
                filename: 'main.wasm',
                name: 'math'
            });

            expect(bytes).toBe(mockWasmBytes);
            expect(loader._metadataCache.get('math')).toEqual(mockMetadata);
        });

        test('should skip metadata when options.metadata is false', async () => {
            const mockWasmBytes = new ArrayBuffer(8);

            globalThis.fetch = jest.fn().mockImplementation((url) => {
                if (url.includes('api.github.com')) {
                    return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ default_branch: 'main' })
                    });
                }
                if (url.includes('.integrity')) {
                    return Promise.resolve({ ok: false });
                }
                // Reject compressed variants to avoid decompression of invalid data
                if (url.endsWith('.br') || url.endsWith('.gz')) {
                    return Promise.resolve({ ok: false });
                }
                return Promise.resolve({
                    ok: true,
                    arrayBuffer: () => Promise.resolve(mockWasmBytes),
                    headers: { get: () => null }
                });
            });

            await loader.loadFromGitHub('test/repo', {
                filename: 'main.wasm',
                name: 'test',
                metadata: false
            });

            expect(loader._metadataCache.has('test')).toBe(false);
        });
    });
});
