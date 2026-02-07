/**
 * Unit tests for the main index.js exports
 */

describe('GoWM package exports', () => {
    let gowmModule;

    beforeAll(() => {
        gowmModule = require('../../src/index');
    });

    test('should export default GoWM instance', () => {
        expect(gowmModule.default).toBeDefined();
    });

    test('should export version from package.json', () => {
        const pkg = require('../../package.json');
        expect(gowmModule.version).toBe(pkg.version);
    });

    test('should export GoWM class', () => {
        expect(gowmModule.GoWM).toBeDefined();
        expect(typeof gowmModule.GoWM).toBe('function');
    });

    test('should export UnifiedWasmLoader class', () => {
        expect(gowmModule.UnifiedWasmLoader).toBeDefined();
    });

    test('should export UnifiedWasmBridge class', () => {
        expect(gowmModule.UnifiedWasmBridge).toBeDefined();
    });

    test('should export legacy class names', () => {
        expect(gowmModule.WasmLoader).toBe(gowmModule.UnifiedWasmLoader);
        expect(gowmModule.WasmBridge).toBe(gowmModule.UnifiedWasmBridge);
    });

    test('should export bound methods', () => {
        expect(typeof gowmModule.load).toBe('function');
        expect(typeof gowmModule.loadFromGitHub).toBe('function');
        expect(typeof gowmModule.loadFromUrl).toBe('function');
        expect(typeof gowmModule.loadFromFile).toBe('function');
        expect(typeof gowmModule.get).toBe('function');
        expect(typeof gowmModule.unload).toBe('function');
        expect(typeof gowmModule.unloadAll).toBe('function');
        expect(typeof gowmModule.listModules).toBe('function');
        expect(typeof gowmModule.getStats).toBe('function');
        expect(typeof gowmModule.isLoaded).toBe('function');
        expect(typeof gowmModule.getHelp).toBe('function');
    });

    test('should export create factory function', () => {
        expect(typeof gowmModule.create).toBe('function');
        const instance = gowmModule.create({ logLevel: 'silent' });
        expect(instance).toBeDefined();
        expect(instance.logLevel).toBe('silent');
    });

    test('should export deprecated loadFromNPM', () => {
        expect(typeof gowmModule.loadFromNPM).toBe('function');
    });
});
