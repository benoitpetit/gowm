/**
 * Tests for  Standardized Error Codes
 * Tests the GoWMError class and error code standardization
 */

describe(' Standardized Error Codes', () => {
    let UnifiedWasmBridge, GoWMError, ErrorCodes;
    let consoleLogSpy;
    
    beforeAll(() => {
        // Suppress console.log for cleaner test output
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });
    
    afterAll(() => {
        consoleLogSpy.mockRestore();
    });
    
    beforeEach(() => {
        jest.resetModules();
        UnifiedWasmBridge = require('../../src/bridges/unified-bridge');
        GoWMError = UnifiedWasmBridge.GoWMError;
        ErrorCodes = UnifiedWasmBridge.ErrorCodes;
    });

    describe('GoWMError class', () => {
        it('should create error with message, code, and context', () => {
            const error = new GoWMError(
                'Test error message',
                ErrorCodes.UNKNOWN,
                { testKey: 'testValue' }
            );
            
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(GoWMError);
            expect(error.message).toBe('Test error message');
            expect(error.code).toBe(ErrorCodes.UNKNOWN);
            expect(error.context).toEqual({ testKey: 'testValue' });
            expect(error.timestamp).toBeDefined();
            expect(error.name).toBe('GoWMError');
        });

        it('should have timestamp in ISO format', () => {
            const error = new GoWMError('Test', ErrorCodes.UNKNOWN);
            const timestamp = new Date(error.timestamp);
            
            expect(timestamp instanceof Date).toBe(true);
            expect(timestamp.getTime()).not.toBeNaN();
        });

        it('should work without context parameter', () => {
            const error = new GoWMError('Test', ErrorCodes.UNKNOWN);
            
            expect(error.context).toEqual({});
        });

        it('should have proper stack trace', () => {
            const error = new GoWMError('Test', ErrorCodes.UNKNOWN);
            
            expect(error.stack).toBeDefined();
            expect(typeof error.stack).toBe('string');
            expect(error.stack).toContain('GoWMError');
        });
    });

    describe('ErrorCodes constants', () => {
        it('should have all expected error codes', () => {
            expect(ErrorCodes.FUNCTION_NOT_FOUND).toBe('GOWM_ERR_FUNCTION_NOT_FOUND');
            expect(ErrorCodes.FUNCTION_CALL_FAILED).toBe('GOWM_ERR_FUNCTION_CALL_FAILED');
            expect(ErrorCodes.INVALID_ARGUMENTS).toBe('GOWM_ERR_INVALID_ARGUMENTS');
            expect(ErrorCodes.MEMORY_ALLOCATION_FAILED).toBe('GOWM_ERR_MEMORY_ALLOCATION_FAILED');
            expect(ErrorCodes.BUFFER_CREATION_FAILED).toBe('GOWM_ERR_BUFFER_CREATION_FAILED');
            expect(ErrorCodes.INVALID_BUFFER_SIZE).toBe('GOWM_ERR_INVALID_BUFFER_SIZE');
            expect(ErrorCodes.MODULE_NOT_LOADED).toBe('GOWM_ERR_MODULE_NOT_LOADED');
            expect(ErrorCodes.MODULE_NOT_READY).toBe('GOWM_ERR_MODULE_NOT_READY');
            expect(ErrorCodes.NETWORK_ERROR).toBe('GOWM_ERR_NETWORK');
            expect(ErrorCodes.DOWNLOAD_FAILED).toBe('GOWM_ERR_DOWNLOAD_FAILED');
            expect(ErrorCodes.UNKNOWN).toBe('GOWM_ERR_UNKNOWN');
        });

        it('should have consistent naming convention', () => {
            for (const [key, value] of Object.entries(ErrorCodes)) {
                expect(value).toMatch(/^GOWM_ERR_/);
            }
        });
    });

    describe('UnifiedWasmBridge error integration', () => {
        let bridge;
        let mockModule;

        beforeEach(() => {
            mockModule = {
                instance: { exports: {} },
                go: { mem: { buffer: new ArrayBuffer(1024) } },
                exports: {},
                ready: true,
                moduleId: 'test-module',
                metadata: {
                    functions: [
                        {
                            name: 'testFunc',
                            parameters: [
                                { name: 'arg1', type: 'string' },
                                { name: 'arg2', type: 'number' }
                            ]
                        }
                    ]
                }
            };
            
            bridge = new UnifiedWasmBridge(mockModule, { name: 'test-module' });
        });

        it('should expose ErrorCodes on bridge instance', () => {
            expect(bridge.ErrorCodes).toBeDefined();
            expect(bridge.ErrorCodes).toBe(ErrorCodes);
        });

        it('should throw GoWMError when function not found', () => {
            try {
                bridge.call('nonexistentFunction');
                fail('Should have thrown GoWMError');
            } catch (error) {
                expect(error).toBeInstanceOf(GoWMError);
                expect(error.code).toBe(ErrorCodes.FUNCTION_NOT_FOUND);
                expect(error.message).toContain('nonexistentFunction');
                expect(error.context.funcName).toBe('nonexistentFunction');
                expect(error.context.moduleId).toBe('test-module');
            }
        });

        it('should throw GoWMError on invalid arguments', () => {
            // Mock a function in namespace
            if (!globalThis.__gowm_modules_) {
                globalThis.__gowm_modules_ = {};
            }
            globalThis.__gowm_modules_['test-module'] = {
                testFunc: (arg1, arg2) => `${arg1}-${arg2}`
            };
            
            try {
                // Call with missing arguments
                bridge.call('testFunc');
                fail('Should have thrown GoWMError');
            } catch (error) {
                expect(error).toBeInstanceOf(GoWMError);
                expect(error.code).toBe(ErrorCodes.INVALID_ARGUMENTS);
                expect(error.context.funcName).toBe('testFunc');
                expect(error.context.expected).toBe(2);
                expect(error.context.actual).toBe(0);
            }
            
            // Cleanup
            delete globalThis.__gowm_modules_['test-module'];
        });

        it('should throw GoWMError on invalid buffer size', () => {
            try {
                bridge.allocateWasmMemory(0);
                fail('Should have thrown GoWMError');
            } catch (error) {
                expect(error).toBeInstanceOf(GoWMError);
                expect(error.code).toBe(ErrorCodes.INVALID_BUFFER_SIZE);
                expect(error.context.size).toBe(0);
            }
        });

        it('should throw GoWMError on buffer creation with null data', () => {
            try {
                bridge.createBuffer(null);
                fail('Should have thrown GoWMError');
            } catch (error) {
                expect(error).toBeInstanceOf(GoWMError);
                expect(error.code).toBe(ErrorCodes.BUFFER_CREATION_FAILED);
            }
        });

        it('should throw GoWMError on unsupported buffer data type', () => {
            try {
                bridge.createBuffer({ unsupported: 'object' });
                fail('Should have thrown GoWMError');
            } catch (error) {
                expect(error).toBeInstanceOf(GoWMError);
                expect(error.code).toBe(ErrorCodes.BUFFER_CREATION_FAILED);
                expect(error.context.dataType).toBe('object');
            }
        });

        it('should wrap non-GoWMError exceptions in GoWMError', () => {
            // Mock a function that throws a regular Error
            if (!globalThis.__gowm_modules_) {
                globalThis.__gowm_modules_ = {};
            }
            globalThis.__gowm_modules_['test-module'] = {
                throwingFunc: () => {
                    throw new Error('Regular error');
                }
            };
            
            try {
                bridge.call('throwingFunc');
                fail('Should have thrown GoWMError');
            } catch (error) {
                expect(error).toBeInstanceOf(GoWMError);
                expect(error.code).toBe(ErrorCodes.FUNCTION_CALL_FAILED);
                expect(error.message).toContain('Regular error');
                expect(error.context.originalError).toBeDefined();
            }
            
            // Cleanup
            delete globalThis.__gowm_modules_['test-module'];
        });

        it('should preserve GoWMError when re-thrown', () => {
            // Mock a function that throws GoWMError
            if (!globalThis.__gowm_modules_) {
                globalThis.__gowm_modules_ = {};
            }
            
            const originalError = new GoWMError(
                'Original error',
                ErrorCodes.MEMORY_ALLOCATION_FAILED,
                { originalContext: true }
            );
            
            globalThis.__gowm_modules_['test-module'] = {
                throwsGoWMError: () => {
                    throw originalError;
                }
            };
            
            try {
                bridge.call('throwsGoWMError');
                fail('Should have thrown GoWMError');
            } catch (error) {
                expect(error).toBeInstanceOf(GoWMError);
                expect(error).toBe(originalError); // Should be same instance
                expect(error.code).toBe(ErrorCodes.MEMORY_ALLOCATION_FAILED);
                expect(error.context.originalContext).toBe(true);
            }
            
            // Cleanup
            delete globalThis.__gowm_modules_['test-module'];
        });
    });

    describe('Error code usage in different scenarios', () => {
        it('should differentiate between different error types', () => {
            const functionError = new GoWMError('Func not found', ErrorCodes.FUNCTION_NOT_FOUND);
            const memoryError = new GoWMError('Mem alloc failed', ErrorCodes.MEMORY_ALLOCATION_FAILED);
            const networkError = new GoWMError('Network failed', ErrorCodes.NETWORK_ERROR);
            
            expect(functionError.code).not.toBe(memoryError.code);
            expect(memoryError.code).not.toBe(networkError.code);
            expect(networkError.code).not.toBe(functionError.code);
        });

        it('should allow programmatic error handling by code', () => {
            function handleError(error) {
                if (!(error instanceof GoWMError)) {
                    return 'unknown';
                }
                
                switch (error.code) {
                    case ErrorCodes.FUNCTION_NOT_FOUND:
                        return 'function-missing';
                    case ErrorCodes.MEMORY_ALLOCATION_FAILED:
                        return 'out-of-memory';
                    case ErrorCodes.NETWORK_ERROR:
                        return 'network-issue';
                    default:
                        return 'other';
                }
            }
            
            const funcError = new GoWMError('Test', ErrorCodes.FUNCTION_NOT_FOUND);
            const memError = new GoWMError('Test', ErrorCodes.MEMORY_ALLOCATION_FAILED);
            const netError = new GoWMError('Test', ErrorCodes.NETWORK_ERROR);
            const unknownError = new GoWMError('Test', ErrorCodes.UNKNOWN);
            
            expect(handleError(funcError)).toBe('function-missing');
            expect(handleError(memError)).toBe('out-of-memory');
            expect(handleError(netError)).toBe('network-issue');
            expect(handleError(unknownError)).toBe('other');
            expect(handleError(new Error('regular'))).toBe('unknown');
        });
    });

    describe('Integration with main exports', () => {
        it('should export GoWMError from main index', () => {
            const gowm = require('../../src/index');
            
            expect(gowm.GoWMError).toBeDefined();
            expect(gowm.GoWMError).toBe(GoWMError);
        });

        it('should export ErrorCodes from main index', () => {
            const gowm = require('../../src/index');
            
            expect(gowm.ErrorCodes).toBeDefined();
            expect(gowm.ErrorCodes).toBe(ErrorCodes);
        });

        it('should allow creating GoWMError from imported module', () => {
            const { GoWMError: ImportedGoWMError, ErrorCodes: ImportedErrorCodes } = require('../../src/index');
            
            const error = new ImportedGoWMError('Test', ImportedErrorCodes.UNKNOWN);
            
            expect(error).toBeInstanceOf(GoWMError);
            expect(error.code).toBe(ErrorCodes.UNKNOWN);
        });
    });

    describe('Backward compatibility', () => {
        it('should still work with try-catch error handling', () => {
            const error = new GoWMError('Test', ErrorCodes.FUNCTION_NOT_FOUND);
            
            let caught = false;
            try {
                throw error;
            } catch (e) {
                caught = true;
                expect(e.message).toBe('Test');
            }
            
            expect(caught).toBe(true);
        });

        it('should work with Promise rejection', async () => {
            const error = new GoWMError('Async error', ErrorCodes.NETWORK_ERROR);
            
            await expect(Promise.reject(error)).rejects.toThrow('Async error');
            await expect(Promise.reject(error)).rejects.toBeInstanceOf(GoWMError);
        });

        it('should serialize to JSON for logging', () => {
            const error = new GoWMError(
                'Test error',
                ErrorCodes.FUNCTION_NOT_FOUND,
                { funcName: 'test' }
            );
            
            const serialized = JSON.stringify({
                message: error.message,
                code: error.code,
                context: error.context,
                timestamp: error.timestamp
            });
            
            const parsed = JSON.parse(serialized);
            
            expect(parsed.message).toBe('Test error');
            expect(parsed.code).toBe(ErrorCodes.FUNCTION_NOT_FOUND);
            expect(parsed.context.funcName).toBe('test');
            expect(parsed.timestamp).toBe(error.timestamp);
        });
    });
});
