/**
 * Unit tests for GoWM core class
 */
const GoWM = require('../../src/core/gowm');
const UnifiedWasmLoader = require('../../src/loaders/unified-loader');
const UnifiedWasmBridge = require('../../src/bridges/unified-bridge');

// Mock the dependencies
jest.mock('../../src/loaders/unified-loader');
jest.mock('../../src/bridges/unified-bridge');

describe('GoWM', () => {
    let gowm;

    beforeEach(() => {
        jest.clearAllMocks();
        UnifiedWasmLoader.mockClear();
        UnifiedWasmBridge.mockClear();

        // Setup mock loader
        UnifiedWasmLoader.prototype.loadModule = jest.fn().mockResolvedValue({
            instance: {},
            go: {},
            exports: {},
            ready: true,
            moduleId: 'test',
            source: 'test-source',
            loadedAt: new Date().toISOString()
        });
        UnifiedWasmLoader.prototype.extractModuleId = jest.fn().mockReturnValue('test-module');
        UnifiedWasmLoader.prototype.parseGitHubRepo = jest.fn().mockReturnValue({
            owner: 'owner',
            repo: 'repo',
            fullRepo: 'owner/repo'
        });
        UnifiedWasmLoader.prototype.unloadModule = jest.fn().mockReturnValue(true);
        UnifiedWasmLoader.prototype.getStats = jest.fn().mockReturnValue({
            totalModules: 0,
            environment: 'Node.js',
            modules: []
        });

        // Setup mock bridge  
        UnifiedWasmBridge.prototype.getStats = jest.fn().mockReturnValue({
            name: 'test',
            ready: true,
            functions: [],
            callbacks: [],
            allocatedBuffers: 0,
            memoryUsage: { total: 0, wasm: 0, go: 0, buffers: 0, buffersCount: 0 }
        });
        UnifiedWasmBridge.prototype.getMemoryUsage = jest.fn().mockReturnValue({ total: 1024 });
        UnifiedWasmBridge.prototype.cleanup = jest.fn();
        UnifiedWasmBridge.prototype.test = jest.fn().mockReturnValue({ success: true });

        gowm = new GoWM();
    });

    describe('constructor', () => {
        test('should create instance with default options', () => {
            expect(gowm.modules).toBeInstanceOf(Map);
            expect(gowm.modules.size).toBe(0);
            expect(gowm.logLevel).toBe('info');
        });

        test('should accept custom logLevel', () => {
            const g = new GoWM({ logLevel: 'silent' });
            expect(g.logLevel).toBe('silent');
        });

        test('should accept custom logger', () => {
            const customLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
            const g = new GoWM({ logger: customLogger });
            expect(g.logger).toBe(customLogger);
        });
    });

    describe('load()', () => {
        test('should throw if source is empty', async () => {
            await expect(gowm.load('')).rejects.toThrow('source must be a non-empty string');
        });

        test('should throw if source is not a string', async () => {
            await expect(gowm.load(123)).rejects.toThrow('source must be a non-empty string');
            await expect(gowm.load(null)).rejects.toThrow('source must be a non-empty string');
        });

        test('should load module successfully', async () => {
            const bridge = await gowm.load('./test.wasm', { name: 'test' });
            expect(bridge).toBeDefined();
            expect(gowm.modules.has('test')).toBe(true);
        });

        test('should use extractModuleId when no name given', async () => {
            await gowm.load('./test.wasm');
            expect(UnifiedWasmLoader.prototype.extractModuleId).toHaveBeenCalledWith('./test.wasm');
        });

        test('should propagate loader errors', async () => {
            UnifiedWasmLoader.prototype.loadModule.mockRejectedValue(new Error('load error'));
            await expect(gowm.load('./test.wasm')).rejects.toThrow('Failed to load WASM module');
        });
    });

    describe('loadFromGitHub()', () => {
        test('should throw if githubRepo is empty', async () => {
            await expect(gowm.loadFromGitHub('')).rejects.toThrow('githubRepo must be a non-empty string');
        });

        test('should parse repo and delegate to load', async () => {
            await gowm.loadFromGitHub('owner/repo');
            expect(UnifiedWasmLoader.prototype.parseGitHubRepo).toHaveBeenCalledWith('owner/repo');
        });

        test('should use provided name over repo name', async () => {
            await gowm.loadFromGitHub('owner/repo', { name: 'custom-name' });
            expect(gowm.modules.has('custom-name')).toBe(true);
        });
    });

    describe('loadFromUrl()', () => {
        test('should throw if url is empty', async () => {
            await expect(gowm.loadFromUrl('')).rejects.toThrow('url must be a non-empty string');
        });

        test('should throw if url is not HTTP', async () => {
            await expect(gowm.loadFromUrl('ftp://example.com/test.wasm'))
                .rejects.toThrow('url must be a valid HTTP or HTTPS URL');
        });

        test('should accept https URLs', async () => {
            await gowm.loadFromUrl('https://example.com/test.wasm', { name: 'web' });
            expect(gowm.modules.has('web')).toBe(true);
        });
    });

    describe('loadFromFile()', () => {
        test('should throw if filePath is empty', async () => {
            await expect(gowm.loadFromFile('')).rejects.toThrow('filePath must be a non-empty string');
        });

        test('should load from file in Node.js', async () => {
            await gowm.loadFromFile('/tmp/test.wasm', { name: 'local' });
            expect(gowm.modules.has('local')).toBe(true);
        });
    });

    describe('get()', () => {
        test('should return null for non-existent module', () => {
            expect(gowm.get('nonexistent')).toBeNull();
        });

        test('should return bridge for loaded module', async () => {
            await gowm.load('./test.wasm', { name: 'mymod' });
            const bridge = gowm.get('mymod');
            expect(bridge).toBeDefined();
        });
    });

    describe('isLoaded()', () => {
        test('should return false for non-loaded module', () => {
            expect(gowm.isLoaded('nonexistent')).toBe(false);
        });

        test('should return true for loaded module', async () => {
            await gowm.load('./test.wasm', { name: 'loaded' });
            expect(gowm.isLoaded('loaded')).toBe(true);
        });
    });

    describe('unload()', () => {
        test('should return false for non-existent module', () => {
            expect(gowm.unload('nonexistent')).toBe(false);
        });

        test('should unload module and clean up', async () => {
            await gowm.load('./test.wasm', { name: 'to-unload' });
            expect(gowm.unload('to-unload')).toBe(true);
            expect(gowm.isLoaded('to-unload')).toBe(false);
            expect(UnifiedWasmBridge.prototype.cleanup).toHaveBeenCalled();
            expect(UnifiedWasmLoader.prototype.unloadModule).toHaveBeenCalledWith('to-unload');
        });
    });

    describe('unloadAll()', () => {
        test('should unload all modules', async () => {
            await gowm.load('./a.wasm', { name: 'a' });
            await gowm.load('./b.wasm', { name: 'b' });
            expect(gowm.modules.size).toBe(2);

            gowm.unloadAll();
            expect(gowm.modules.size).toBe(0);
        });
    });

    describe('listModules()', () => {
        test('should return empty array initially', () => {
            expect(gowm.listModules()).toEqual([]);
        });

        test('should list loaded module names', async () => {
            await gowm.load('./a.wasm', { name: 'alpha' });
            await gowm.load('./b.wasm', { name: 'beta' });
            expect(gowm.listModules()).toEqual(['alpha', 'beta']);
        });
    });

    describe('getStats()', () => {
        test('should return stats object', () => {
            const stats = gowm.getStats();
            expect(stats.version).toBeDefined();
            expect(stats.totalModules).toBe(0);
            expect(stats.environment).toBe('Node.js');
        });
    });

    describe('getTotalMemoryUsage()', () => {
        test('should return 0 with no modules', () => {
            expect(gowm.getTotalMemoryUsage()).toBe(0);
        });

        test('should sum memory across modules', async () => {
            await gowm.load('./a.wasm', { name: 'a' });
            await gowm.load('./b.wasm', { name: 'b' });
            expect(gowm.getTotalMemoryUsage()).toBe(2048); // 1024 * 2
        });
    });

    describe('testAll()', () => {
        test('should return empty object with no modules', () => {
            expect(gowm.testAll()).toEqual({});
        });

        test('should test all loaded modules', async () => {
            await gowm.load('./a.wasm', { name: 'a' });
            const results = gowm.testAll();
            expect(results).toHaveProperty('a');
            expect(results.a.success).toBe(true);
        });
    });

    describe('getVersion()', () => {
        test('should return a version string', () => {
            const version = gowm.getVersion();
            expect(typeof version).toBe('string');
            expect(version).toMatch(/^\d+\.\d+\.\d+/);
        });
    });

    describe('getHelp()', () => {
        test('should return help info with version', () => {
            const help = gowm.getHelp();
            expect(help.description).toBeDefined();
            expect(help.version).toBeDefined();
            expect(help.methods).toBeDefined();
            expect(help.loadingSources).toBeDefined();
            expect(help.options).toBeDefined();
        });

        test('should include cache and retry options', () => {
            const help = gowm.getHelp();
            expect(help.options.cache).toBeDefined();
            expect(help.options.retries).toBeDefined();
            expect(help.options.retryDelay).toBeDefined();
        });

        test('should include clearCache method', () => {
            const help = gowm.getHelp();
            expect(help.methods['clearCache(options)']).toBeDefined();
        });
    });

    describe('clearCache()', () => {
        test('should delegate to loader.clearCache()', async () => {
            UnifiedWasmLoader.prototype.clearCache = jest.fn().mockResolvedValue();
            const g = new GoWM();
            await g.clearCache();
            expect(g.loader.clearCache).toHaveBeenCalled();
        });

        test('should pass options to loader', async () => {
            UnifiedWasmLoader.prototype.clearCache = jest.fn().mockResolvedValue();
            const g = new GoWM();
            await g.clearCache({ memory: true, disk: false });
            expect(g.loader.clearCache).toHaveBeenCalledWith({ memory: true, disk: false });
        });
    });

    describe('loadFromNPM() (deprecated)', () => {
        test('should delegate to loadFromGitHub', async () => {
            const spy = jest.spyOn(gowm, 'loadFromGitHub');
            await gowm.loadFromNPM('owner/repo', { name: 'npm' });
            expect(spy).toHaveBeenCalledWith('owner/repo', { name: 'npm' });
        });
    });

    describe('_log()', () => {
        test('should not log when level is silent', () => {
            const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
            const g = new GoWM({ logLevel: 'silent', logger });
            g._log('info', 'test');
            g._log('warn', 'test');
            expect(logger.log).not.toHaveBeenCalled();
            expect(logger.warn).not.toHaveBeenCalled();
        });

        test('should log errors when level is error', () => {
            const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
            const g = new GoWM({ logLevel: 'error', logger });
            g._log('error', 'test error');
            g._log('info', 'test info');
            expect(logger.error).toHaveBeenCalledWith('test error');
            expect(logger.log).not.toHaveBeenCalled();
        });
    });

    // =========================================================================
    // Phase 3 — Metadata & describe Tests
    // =========================================================================

    describe('getModuleMetadata()', () => {
        test('should return metadata for loaded module', async () => {
            const mockMetadata = { name: 'math-wasm', version: '0.2.0' };
            UnifiedWasmBridge.prototype.getMetadata = jest.fn().mockReturnValue(mockMetadata);
            
            await gowm.load('test-source', { name: 'meta-test' });
            const metadata = gowm.getModuleMetadata('meta-test');
            expect(metadata).toEqual(mockMetadata);
        });

        test('should return null for unknown module', () => {
            expect(gowm.getModuleMetadata('unknown')).toBeNull();
        });
    });

    describe('describeFunction()', () => {
        test('should return function description for loaded module', async () => {
            const mockDoc = {
                name: 'add',
                description: 'Add two numbers',
                parameters: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }],
                returnType: 'number'
            };
            UnifiedWasmBridge.prototype.describe = jest.fn().mockReturnValue(mockDoc);
            
            await gowm.load('test-source', { name: 'desc-test' });
            const doc = gowm.describeFunction('desc-test', 'add');
            expect(doc).toEqual(mockDoc);
            expect(UnifiedWasmBridge.prototype.describe).toHaveBeenCalledWith('add');
        });

        test('should return null for unknown module', () => {
            expect(gowm.describeFunction('unknown', 'add')).toBeNull();
        });
    });

    describe('getHelp() v1.4.0', () => {
        test('should include metadata and integrity options', () => {
            const help = gowm.getHelp();
            expect(help.options).toHaveProperty('metadata');
            expect(help.options).toHaveProperty('integrity');
            expect(help.options).toHaveProperty('validateCalls');
        });

        test('should list getModuleMetadata and describeFunction methods', () => {
            const help = gowm.getHelp();
            expect(help.methods).toHaveProperty('getModuleMetadata(name)');
            expect(help.methods).toHaveProperty('describeFunction(name, funcName)');
        });
    });

    describe('getVersion() v1.4.0', () => {
        test('should return version string', () => {
            const version = gowm.getVersion();
            expect(version).toMatch(/^\d+\.\d+\.\d+$/);
        });
    });

    describe('load() passes logLevel to bridge', () => {
        test('should pass logLevel option to UnifiedWasmBridge', async () => {
            const g = new GoWM({ logLevel: 'debug' });
            await g.load('test-source', { name: 'log-test' });
            
            expect(UnifiedWasmBridge).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({ logLevel: 'debug' })
            );
        });
    });
});
