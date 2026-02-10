/**
 * Tests for  SharedArrayBuffer Support (Zero-Copy)
 * Tests for createSharedBuffer(), mapSharedBuffer(), and related functionality
 * 
 * @version 1.3.0
 */

const UnifiedWasmBridge = require('../../src/bridges/unified-bridge');

describe(' SharedArrayBuffer Support (Zero-Copy)', () => {
    let mockModule;
    let bridge;

    beforeEach(() => {
        // Mock WASM module
        mockModule = {
            instance: {
                exports: {
                    memory: {
                        buffer: new ArrayBuffer(1024)
                    },
                    testFunction: jest.fn(() => 'test result')
                }
            },
            go: {
                mem: {
                    buffer: new ArrayBuffer(2048)
                }
            },
            moduleId: 'test-module',
            metadata: {
                name: 'test-module',
                version: '1.0.0',
                functions: []
            }
        };

        bridge = new UnifiedWasmBridge(mockModule, { name: 'test-module' });

        // Mock SharedArrayBuffer if not available
        if (typeof SharedArrayBuffer === 'undefined') {
            global.SharedArrayBuffer = class MockSharedArrayBuffer extends ArrayBuffer {
                constructor(length) {
                    super(length);
                    this.isShared = true;
                }
            };
        }
    });

    afterEach(() => {
        if (bridge) {
            bridge.cleanup();
        }
    });

    describe('SharedArrayBuffer Support Detection', () => {
        test('should detect SharedArrayBuffer support', () => {
            const supported = bridge.isSharedArrayBufferSupported();
            expect(typeof supported).toBe('boolean');
        });

        test('should return true when SharedArrayBuffer is available', () => {
            // SharedArrayBuffer is mocked in beforeEach
            expect(bridge.isSharedArrayBufferSupported()).toBe(true);
        });
    });

    describe('Create Shared Buffer', () => {
        test('should create a shared buffer', () => {
            const size = 1024;
            const bufferInfo = bridge.createSharedBuffer(size);

            expect(bufferInfo).toBeDefined();
            expect(bufferInfo.buffer).toBeInstanceOf(SharedArrayBuffer);
            expect(bufferInfo.view).toBeInstanceOf(Uint8Array);
            expect(bufferInfo.size).toBe(size);
            expect(bufferInfo.isShared).toBe(true);
        });

        test('should throw error for invalid size', () => {
            expect(() => {
                bridge.createSharedBuffer(0);
            }).toThrow(/invalid size/i);

            expect(() => {
                bridge.createSharedBuffer(-100);
            }).toThrow(/invalid size/i);
        });

        test('should throw error when SharedArrayBuffer not supported', () => {
            // Temporarily remove SharedArrayBuffer
            const originalSAB = global.SharedArrayBuffer;
            delete global.SharedArrayBuffer;

            try {
                expect(() => {
                    bridge.createSharedBuffer(1024);
                }).toThrow(/not supported/i);
            } finally {
                global.SharedArrayBuffer = originalSAB;
            }
        });

        test('should include utility methods', () => {
            const bufferInfo = bridge.createSharedBuffer(1024);

            expect(typeof bufferInfo.write).toBe('function');
            expect(typeof bufferInfo.read).toBe('function');
            expect(typeof bufferInfo.clear).toBe('function');
            expect(typeof bufferInfo.free).toBe('function');
        });
    });

    describe('Shared Buffer Operations', () => {
        let bufferInfo;

        beforeEach(() => {
            bufferInfo = bridge.createSharedBuffer(1024);
        });

        test('should write data to shared buffer', () => {
            const data = new Uint8Array([1, 2, 3, 4, 5]);
            const bytesWritten = bufferInfo.write(data, 0);

            expect(bytesWritten).toBe(5);
            expect(bufferInfo.view[0]).toBe(1);
            expect(bufferInfo.view[4]).toBe(5);
        });

        test('should write data at offset', () => {
            const data = new Uint8Array([10, 20, 30]);
            const bytesWritten = bufferInfo.write(data, 100);

            expect(bytesWritten).toBe(103);
            expect(bufferInfo.view[100]).toBe(10);
            expect(bufferInfo.view[102]).toBe(30);
        });

        test('should throw error when write exceeds buffer size', () => {
            const largeData = new Uint8Array(2000);

            expect(() => {
                bufferInfo.write(largeData, 0);
            }).toThrow(/exceeds/i);
        });

        test('should read data from shared buffer', () => {
            // Write some data first
            const originalData = new Uint8Array([5, 10, 15, 20, 25]);
            bufferInfo.write(originalData, 50);

            // Read it back
            const readData = bufferInfo.read(5, 50);

            expect(readData).toBeInstanceOf(Uint8Array);
            expect(readData.length).toBe(5);
            expect(Array.from(readData)).toEqual([5, 10, 15, 20, 25]);
        });

        test('should throw error when read exceeds buffer size', () => {
            expect(() => {
                bufferInfo.read(2000, 0);
            }).toThrow(/exceeds/i);

            expect(() => {
                bufferInfo.read(100, 1000);
            }).toThrow(/exceeds/i);
        });

        test('should clear buffer', () => {
            // Write some data
            bufferInfo.write(new Uint8Array([1, 2, 3, 4, 5]), 0);
            expect(bufferInfo.view[0]).toBe(1);

            // Clear
            bufferInfo.clear();

            // Check all bytes are zero
            expect(bufferInfo.view[0]).toBe(0);
            expect(bufferInfo.view[1]).toBe(0);
            expect(bufferInfo.view[2]).toBe(0);
        });

        test('should handle free() gracefully', () => {
            // SharedArrayBuffer is GC managed, so free() should not throw
            expect(() => {
                bufferInfo.free();
            }).not.toThrow();
        });
    });

    describe('Map Shared Buffer to WASM Memory', () => {
        let sharedBuffer;

        beforeEach(() => {
            sharedBuffer = new SharedArrayBuffer(1024);
            const view = new Uint8Array(sharedBuffer);
            view.set([10, 20, 30, 40, 50]);
        });

        test('should map shared buffer to WASM memory', () => {
            // Mock allocation
            bridge.allocateWasmMemory = jest.fn(() => 100);

            const mapped = bridge.mapSharedBuffer(sharedBuffer, 0, 100);

            expect(mapped).toBeDefined();
            expect(mapped.isShared).toBe(true);
            expect(mapped.sharedBuffer).toBe(sharedBuffer);
            expect(mapped.size).toBe(100);
            expect(typeof mapped.sync).toBe('function');
        });

        test('should map shared buffer with offset', () => {
            bridge.allocateWasmMemory = jest.fn(() => 100);

            const mapped = bridge.mapSharedBuffer(sharedBuffer, 10, 50);

            expect(mapped.offset).toBe(10);
            expect(mapped.size).toBe(50);
        });

        test('should throw error for invalid buffer type', () => {
            const notSharedBuffer = new ArrayBuffer(100);

            expect(() => {
                bridge.mapSharedBuffer(notSharedBuffer);
            }).toThrow(/expected SharedArrayBuffer/i);
        });

        test('should throw error when mapping exceeds buffer size', () => {
            expect(() => {
                bridge.mapSharedBuffer(sharedBuffer, 0, 2000);
            }).toThrow(/exceeds/i);

            expect(() => {
                bridge.mapSharedBuffer(sharedBuffer, 1000, 100);
            }).toThrow(/exceeds/i);
        });

        test('should handle Go WASM memory allocation', () => {
            // Mock Go allocation
            bridge.allocateGoMemory = jest.fn(() => 200);
            bridge.allocateWasmMemory = jest.fn(() => null);

            const mapped = bridge.mapSharedBuffer(sharedBuffer, 0, 100);

            expect(bridge.allocateGoMemory).toHaveBeenCalledWith(100);
            expect(mapped.ptr).toBe(200);
        });

        test('should sync data back to shared buffer', () => {
            bridge.allocateWasmMemory = jest.fn(() => 100);

            const mapped = bridge.mapSharedBuffer(sharedBuffer, 0, 5);

            // Simulate WASM modifying the data (use values ≤255 for Uint8Array)
            const wasmView = new Uint8Array(mockModule.instance.exports.memory.buffer, 100, 5);
            wasmView.set([100, 150, 200, 250, 255]);

            // Sync back
            mapped.sync();

            // Check shared buffer was updated
            const originalView = new Uint8Array(sharedBuffer, 0, 5);
            expect(Array.from(originalView)).toEqual([100, 150, 200, 250, 255]);
        });

        test('should free mapped buffer', () => {
            bridge.allocateWasmMemory = jest.fn(() => 100);
            bridge.freeBuffer = jest.fn();

            const mapped = bridge.mapSharedBuffer(sharedBuffer, 0, 100);
            mapped.free();

            expect(bridge.freeBuffer).toHaveBeenCalledWith(100, 100);
        });
    });

    describe('Integration with Existing Buffer System', () => {
        test('should work alongside regular buffers', () => {
            // Create regular buffer
            const regularBuffer = bridge.createBuffer('test data');
            expect(regularBuffer).toBeDefined();
            expect(regularBuffer.isShared).toBeUndefined();

            // Create shared buffer
            const sharedBuffer = bridge.createSharedBuffer(1024);
            expect(sharedBuffer).toBeDefined();
            expect(sharedBuffer.isShared).toBe(true);

            // Both should coexist
            expect(bridge.allocatedBuffers.size).toBe(1); // Only regular buffer is tracked
        });

        test('should cleanup mapped shared buffers on cleanup', () => {
            const sharedBuffer = new SharedArrayBuffer(100);
            bridge.allocateWasmMemory = jest.fn(() => 100);
            bridge.freeBuffer = jest.fn();

            const mapped = bridge.mapSharedBuffer(sharedBuffer, 0, 50);
            expect(bridge.allocatedBuffers.has(mapped)).toBe(true);

            bridge.cleanup();

            expect(bridge.freeBuffer).toHaveBeenCalled();
            expect(bridge.allocatedBuffers.size).toBe(0);
        });
    });

    describe('Error Handling', () => {
        test('should throw GoWMError with correct error code', () => {
            const { ErrorCodes } = UnifiedWasmBridge;

            try {
                bridge.createSharedBuffer(-1);
            } catch (error) {
                expect(error.name).toBe('GoWMError');
                expect(error.code).toBe(ErrorCodes.INVALID_BUFFER_SIZE);
                expect(error.context).toBeDefined();
            }
        });

        test('should include helpful context in errors', () => {
            // Temporarily remove SharedArrayBuffer
            const originalSAB = global.SharedArrayBuffer;
            delete global.SharedArrayBuffer;

            try {
                bridge.createSharedBuffer(1024);
            } catch (error) {
                expect(error.context).toBeDefined();
                expect(error.context.help).toContain('Cross-Origin');
            } finally {
                global.SharedArrayBuffer = originalSAB;
            }
        });
    });

    describe('Performance Characteristics', () => {
        test('should not copy data when creating shared buffer', () => {
            const size = 1024 * 1024; // 1MB
            const bufferInfo = bridge.createSharedBuffer(size);

            // SharedArrayBuffer should be created directly without copying
            expect(bufferInfo.buffer.byteLength).toBe(size);
            expect(bufferInfo.view.buffer).toBe(bufferInfo.buffer);
        });

        test('should allow direct memory access', () => {
            const bufferInfo = bridge.createSharedBuffer(100);
            
            // Direct access should be possible
            bufferInfo.view[0] = 42;
            expect(bufferInfo.view[0]).toBe(42);

            // Multiple views should see same data
            const view2 = new Uint8Array(bufferInfo.buffer);
            expect(view2[0]).toBe(42);
        });
    });
});
