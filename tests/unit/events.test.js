/**
 * Unit tests for GoWM Event System
 */
const GoWM = require('../../src/core/gowm');
const UnifiedWasmLoader = require('../../src/loaders/unified-loader');
const UnifiedWasmBridge = require('../../src/bridges/unified-bridge');

jest.mock('../../src/loaders/unified-loader');
jest.mock('../../src/bridges/unified-bridge');

describe('GoWM Event System', () => {
    let gowm;
    let consoleLogSpy;
    let consoleWarnSpy;

    beforeAll(() => {
        // Suppress console.log and console.warn for cleaner test output
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterAll(() => {
        consoleLogSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        UnifiedWasmLoader.mockClear();
        UnifiedWasmBridge.mockClear();

        UnifiedWasmLoader.prototype.loadModule = jest.fn().mockResolvedValue({
            instance: {}, go: {}, exports: {}, ready: true,
            moduleId: 'test', source: 'test-source',
            loadedAt: new Date().toISOString()
        });
        UnifiedWasmLoader.prototype.extractModuleId = jest.fn().mockReturnValue('test-module');
        UnifiedWasmLoader.prototype.parseGitHubRepo = jest.fn().mockReturnValue({
            owner: 'owner', repo: 'repo', fullRepo: 'owner/repo'
        });
        UnifiedWasmLoader.prototype.unloadModule = jest.fn().mockReturnValue(true);
        UnifiedWasmLoader.prototype.getStats = jest.fn().mockReturnValue({ totalModules: 0 });

        UnifiedWasmBridge.prototype.getStats = jest.fn().mockReturnValue({
            name: 'test', ready: true, functions: [], callbacks: [],
            allocatedBuffers: 0, memoryUsage: { total: 0 }
        });
        UnifiedWasmBridge.prototype.getMemoryUsage = jest.fn().mockReturnValue({ total: 1024 });
        UnifiedWasmBridge.prototype.cleanup = jest.fn();
        UnifiedWasmBridge.prototype.getMetadata = jest.fn().mockReturnValue(null);

        gowm = new GoWM();
    });

    describe('on() / off()', () => {
        test('should register and call event listeners', () => {
            const listener = jest.fn();
            gowm.on('module:loaded', listener);
            gowm._emit('module:loaded', { name: 'test' });
            expect(listener).toHaveBeenCalledWith({ name: 'test' });
        });

        test('should support multiple listeners for same event', () => {
            const l1 = jest.fn();
            const l2 = jest.fn();
            gowm.on('module:loaded', l1);
            gowm.on('module:loaded', l2);
            gowm._emit('module:loaded', { name: 'test' });
            expect(l1).toHaveBeenCalled();
            expect(l2).toHaveBeenCalled();
        });

        test('should remove listener with off()', () => {
            const listener = jest.fn();
            gowm.on('module:loaded', listener);
            gowm.off('module:loaded', listener);
            gowm._emit('module:loaded', { name: 'test' });
            expect(listener).not.toHaveBeenCalled();
        });

        test('should return this for chaining', () => {
            const result = gowm.on('module:loaded', () => {});
            expect(result).toBe(gowm);
            const result2 = gowm.off('module:loaded', () => {});
            expect(result2).toBe(gowm);
        });

        test('should throw when callback is not a function', () => {
            expect(() => gowm.on('module:loaded', 'not-a-function')).toThrow('must be a function');
        });

        test('should handle off() for non-existing event gracefully', () => {
            expect(() => gowm.off('nonexistent', () => {})).not.toThrow();
        });
    });

    describe('once()', () => {
        test('should call listener only once', () => {
            const listener = jest.fn();
            gowm.once('module:loaded', listener);
            gowm._emit('module:loaded', { name: 'a' });
            gowm._emit('module:loaded', { name: 'b' });
            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith({ name: 'a' });
        });

        test('should return this for chaining', () => {
            const result = gowm.once('module:loaded', () => {});
            expect(result).toBe(gowm);
        });
    });

    describe('_emit()', () => {
        test('should not throw when no listeners', () => {
            expect(() => gowm._emit('module:loaded', {})).not.toThrow();
        });

        test('should catch errors in listeners without crashing', () => {
            const spy = jest.spyOn(console, 'error').mockImplementation();
            gowm.on('module:loaded', () => { throw new Error('boom'); });
            expect(() => gowm._emit('module:loaded', {})).not.toThrow();
            spy.mockRestore();
        });
    });

    describe('Event integration with load()', () => {
        test('should emit module:loading before load', async () => {
            const listener = jest.fn();
            gowm.on('module:loading', listener);
            await gowm.load('./test.wasm');
            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'test-module', source: './test.wasm' })
            );
        });

        test('should emit module:loaded after successful load', async () => {
            const listener = jest.fn();
            gowm.on('module:loaded', listener);
            await gowm.load('./test.wasm');
            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'test-module',
                    source: './test.wasm',
                    loadTime: expect.any(Number)
                })
            );
        });

        test('should emit module:error on load failure', async () => {
            UnifiedWasmLoader.prototype.loadModule.mockRejectedValue(new Error('fail'));
            const listener = jest.fn();
            gowm.on('module:error', listener);
            await expect(gowm.load('./test.wasm')).rejects.toThrow();
            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'test-module',
                    error: expect.any(Error),
                    source: './test.wasm'
                })
            );
        });
    });

    describe('Event integration with unload()', () => {
        test('should emit module:unloaded', async () => {
            const listener = jest.fn();
            gowm.on('module:unloaded', listener);
            await gowm.load('./test.wasm');
            gowm.unload('test-module');
            expect(listener).toHaveBeenCalledWith({ name: 'test-module' });
        });

        test('should not emit when module not found', () => {
            const listener = jest.fn();
            gowm.on('module:unloaded', listener);
            gowm.unload('nonexistent');
            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('memory:warning event', () => {
        test('should emit memory:warning when threshold exceeded', async () => {
            const gowmMem = new GoWM({ memoryWarningThreshold: 512 });
            const listener = jest.fn();
            gowmMem.on('memory:warning', listener);
            await gowmMem.load('./test.wasm');

            // Memory mock returns 1024, threshold is 512
            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    usage: 1024,
                    threshold: 512,
                    modules: expect.any(Array)
                })
            );
        });

        test('should not emit when no threshold set', async () => {
            const listener = jest.fn();
            gowm.on('memory:warning', listener);
            await gowm.load('./test.wasm');
            expect(listener).not.toHaveBeenCalled();
        });
    });
});
