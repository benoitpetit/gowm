/**
 * Unit tests for GoWM React Hooks (Phase 4.6)
 * Tests the hook logic without a full React rendering environment.
 */

// Mock React with minimal hooks implementation
const mockState = {};
let stateCounter = 0;
let effectCallbacks = [];
let cleanupCallbacks = [];

const mockReact = {
    useState: (initial) => {
        const id = stateCounter++;
        if (!(id in mockState)) mockState[id] = initial;
        return [mockState[id], (val) => {
            mockState[id] = typeof val === 'function' ? val(mockState[id]) : val;
        }];
    },
    useEffect: (cb, deps) => {
        effectCallbacks.push(cb);
    },
    useRef: (initial) => {
        const ref = { current: initial };
        return ref;
    },
    useCallback: (fn) => fn
};

// Mock require for React
jest.mock('react', () => mockReact, { virtual: true });

// Mock GoWM class
jest.mock('../../src/core/gowm', () => {
    return jest.fn().mockImplementation(() => ({
        load: jest.fn().mockResolvedValue({
            getMetadata: () => ({ name: 'test', version: '1.0.0' }),
            call: jest.fn()
        }),
        loadFromGitHub: jest.fn().mockResolvedValue({
            getMetadata: () => ({ name: 'math-wasm', version: '0.2.0' }),
            call: jest.fn()
        }),
        unloadAll: jest.fn()
    }));
});

describe('React Hooks (Phase 4.6)', () => {
    let reactHooks;

    beforeEach(() => {
        jest.clearAllMocks();
        stateCounter = 0;
        Object.keys(mockState).forEach(k => delete mockState[k]);
        effectCallbacks = [];
        cleanupCallbacks = [];
        // Re-require to reset module state
        jest.isolateModules(() => {
            reactHooks = require('../../src/react/index');
        });
    });

    describe('useWasm()', () => {
        test('should export useWasm function', () => {
            expect(typeof reactHooks.useWasm).toBe('function');
        });

        test('should return correct shape', () => {
            const result = reactHooks.useWasm('./test.wasm');
            expect(result).toHaveProperty('bridge');
            expect(result).toHaveProperty('loading');
            expect(result).toHaveProperty('error');
            expect(result).toHaveProperty('reload');
            expect(typeof result.reload).toBe('function');
        });

        test('should start with loading=true when source provided', () => {
            const result = reactHooks.useWasm('./test.wasm');
            expect(result.loading).toBe(true);
        });

        test('should start with loading=false when no source', () => {
            const result = reactHooks.useWasm(null);
            expect(result.loading).toBe(false);
        });

        test('should have null bridge initially', () => {
            const result = reactHooks.useWasm('./test.wasm');
            expect(result.bridge).toBeNull();
        });

        test('should have null error initially', () => {
            const result = reactHooks.useWasm('./test.wasm');
            expect(result.error).toBeNull();
        });

        test('should register effect with source dependency', () => {
            reactHooks.useWasm('./test.wasm');
            expect(effectCallbacks.length).toBeGreaterThan(0);
        });
    });

    describe('useWasmFromGitHub()', () => {
        test('should export useWasmFromGitHub function', () => {
            expect(typeof reactHooks.useWasmFromGitHub).toBe('function');
        });

        test('should return correct shape with metadata', () => {
            const result = reactHooks.useWasmFromGitHub('owner/repo', { path: 'math-wasm' });
            expect(result).toHaveProperty('bridge');
            expect(result).toHaveProperty('loading');
            expect(result).toHaveProperty('error');
            expect(result).toHaveProperty('metadata');
            expect(result).toHaveProperty('reload');
        });

        test('should start with loading=true', () => {
            const result = reactHooks.useWasmFromGitHub('owner/repo');
            expect(result.loading).toBe(true);
        });

        test('should have null metadata initially', () => {
            const result = reactHooks.useWasmFromGitHub('owner/repo');
            expect(result.metadata).toBeNull();
        });
    });
});

describe('React Hooks - React not available', () => {
    test('should throw when React is not installed', () => {
        // Replace react mock with null
        jest.isolateModules(() => {
            jest.mock('react', () => { throw new Error('Cannot find module'); }, { virtual: true });
            const hooks = require('../../src/react/index');
            expect(() => hooks.useWasm('./test.wasm')).toThrow('React is required');
        });
    });
});
