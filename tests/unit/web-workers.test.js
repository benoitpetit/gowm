/**
 * Tests for  Web Workers Support
 * Tests for loadInWorker() and WasmWorkerManager
 * 
 * @version 1.3.0
 */

const WasmWorkerManager = require('../../src/core/wasm-worker');

describe(' Web Workers Support', () => {
    let workerManager;

    beforeEach(() => {
        // Mock window and Worker objects for testing
        global.window = {};
        global.Worker = class MockWorker {
            constructor(url) {
                this.url = url;
                this.onmessage = null;
                this.onerror = null;
                this.messageQueue = [];
            }

            postMessage(data, transfer) {
                this.messageQueue.push({ data, transfer });
                // Simulate async response
                setTimeout(() => {
                    if (data.type === 'init' && this.onmessage) {
                        this.onmessage({ data: { type: 'ready' } });
                    }
                }, 10);
            }

            terminate() {
                this.terminated = true;
            }
        };
        
        global.Blob = class MockBlob {
            constructor(parts, options) {
                this.parts = parts;
                this.type = options?.type;
            }
        };
        
        global.URL = {
            createObjectURL: (blob) => 'blob://mock-url'
        };

        workerManager = new WasmWorkerManager({ debug: false });
    });

    afterEach(() => {
        if (workerManager) {
            workerManager.terminateAll();
        }
        delete global.window;
        delete global.Worker;
        delete global.Blob;
        delete global.URL;
    });

    describe('WasmWorkerManager', () => {
        test('should create worker manager instance', () => {
            expect(workerManager).toBeDefined();
            expect(workerManager.workers).toBeInstanceOf(Map);
            expect(workerManager.maxWorkers).toBe(4);
        });

        test('should create a new worker', async () => {
            const moduleId = 'test-module';
            const source = 'test/module.wasm';

            const workerId = await workerManager.createWorker(moduleId, source, {});

            expect(workerId).toBe(moduleId);
            expect(workerManager.workers.has(moduleId)).toBe(true);
        });

        test('should not create duplicate workers', async () => {
            const moduleId = 'test-module';
            const source = 'test/module.wasm';

            const workerId1 = await workerManager.createWorker(moduleId, source, {});
            const workerId2 = await workerManager.createWorker(moduleId, source, {});

            expect(workerId1).toBe(workerId2);
            expect(workerManager.workers.size).toBe(1);
        });

        test('should get worker status', async () => {
            const moduleId = 'test-module';
            const source = 'test/module.wasm';

            await workerManager.createWorker(moduleId, source, {});
            const status = workerManager.getWorkerStatus(moduleId);

            expect(status).toBeDefined();
            expect(status.id).toBe(moduleId);
            expect(status.ready).toBe(true);
            expect(status.source).toBe(source);
        });

        test('should terminate a worker', async () => {
            const moduleId = 'test-module';
            const source = 'test/module.wasm';

            await workerManager.createWorker(moduleId, source, {});
            expect(workerManager.workers.has(moduleId)).toBe(true);

            workerManager.terminateWorker(moduleId);
            expect(workerManager.workers.has(moduleId)).toBe(false);
        });

        test('should terminate all workers', async () => {
            await workerManager.createWorker('module1', 'test1.wasm', {});
            await workerManager.createWorker('module2', 'test2.wasm', {});

            expect(workerManager.workers.size).toBe(2);

            workerManager.terminateAll();
            expect(workerManager.workers.size).toBe(0);
        });

        test('should handle worker initialization timeout', async () => {
            // Mock a worker that never responds
            global.Worker = class SlowWorker {
                constructor(url) {
                    this.url = url;
                    this.onmessage = null;
                    this.onerror = null;
                }
                postMessage() {
                    // Never respond
                }
                terminate() {}
            };

            const moduleId = 'slow-module';
            const source = 'test/slow.wasm';

            await expect(
                workerManager.createWorker(moduleId, source, { workerTimeout: 500 })
            ).rejects.toThrow(/timeout/i);
        }, 3000); // Increase Jest timeout to 3s
    });

    describe('Worker Function Calls', () => {
        test('should call worker function', async () => {
            const moduleId = 'test-module';
            const source = 'test/module.wasm';

            // Mock worker that responds to function calls
            global.Worker = class ResponsiveWorker extends global.Worker {
                postMessage(data, transfer) {
                    super.postMessage(data, transfer);
                    if (data.type === 'call' && this.onmessage) {
                        setTimeout(() => {
                            this.onmessage({
                                data: {
                                    type: 'result',
                                    callId: data.callId,
                                    result: 'test-result'
                                }
                            });
                        }, 10);
                    }
                }
            };

            workerManager = new WasmWorkerManager();
            await workerManager.createWorker(moduleId, source, {});

            const result = await workerManager.callWorkerFunction(
                moduleId,
                'testFunction',
                ['arg1', 'arg2']
            );

            expect(result).toBe('test-result');
        });

        test('should handle worker function call errors', async () => {
            const moduleId = 'test-module';
            const source = 'test/module.wasm';

            // Mock worker that returns error
            global.Worker = class ErrorWorker extends global.Worker {
                postMessage(data, transfer) {
                    super.postMessage(data, transfer);
                    if (data.type === 'call' && this.onmessage) {
                        setTimeout(() => {
                            this.onmessage({
                                data: {
                                    type: 'result',
                                    callId: data.callId,
                                    error: 'Function error'
                                }
                            });
                        }, 10);
                    }
                }
            };

            workerManager = new WasmWorkerManager();
            await workerManager.createWorker(moduleId, source, {});

            await expect(
                workerManager.callWorkerFunction(moduleId, 'testFunction', [])
            ).rejects.toThrow('Function error');
        });

        test('should extract transferable objects from arguments', () => {
            const buffer1 = new ArrayBuffer(100);
            const buffer2 = new ArrayBuffer(200);
            const args = [buffer1, { nested: buffer2 }];

            const transferables = workerManager._extractTransferables(args, []);

            expect(transferables.length).toBe(2);
            expect(transferables).toContain(buffer1);
            expect(transferables).toContain(buffer2);
        });

        test('should not transfer SharedArrayBuffer', () => {
            if (typeof SharedArrayBuffer === 'undefined') {
                // Skip test if SharedArrayBuffer not supported
                return;
            }

            const sharedBuffer = new SharedArrayBuffer(100);
            const args = [sharedBuffer];

            const transferables = workerManager._extractTransferables(args, []);

            expect(transferables.length).toBe(0);
        });
    });

    describe('Error Handling', () => {
        test('should throw error when worker not found', async () => {
            await expect(
                workerManager.callWorkerFunction('nonexistent', 'func', [])
            ).rejects.toThrow(/not found/i);
        });

        test('should throw error when worker not ready', async () => {
            const moduleId = 'not-ready-module';
            
            // Manually add a non-ready worker
            workerManager.workers.set(moduleId, {
                id: moduleId,
                worker: new global.Worker('test'),
                ready: false
            });

            await expect(
                workerManager.callWorkerFunction(moduleId, 'func', [])
            ).rejects.toThrow(/not ready/i);
        });

        test('should handle function call timeout', async () => {
            const moduleId = 'timeout-module';
            const source = 'test/module.wasm';

            // Mock worker that never responds to calls
            global.Worker = class NonResponsiveWorker extends global.Worker {
                postMessage(data, transfer) {
                    super.postMessage(data, transfer);
                    // Only respond to init, not to calls
                    if (data.type === 'init' && this.onmessage) {
                        setTimeout(() => {
                            this.onmessage({ data: { type: 'ready' } });
                        }, 10);
                    }
                }
            };

            workerManager = new WasmWorkerManager();
            await workerManager.createWorker(moduleId, source, {});

            await expect(
                workerManager.callWorkerFunction(moduleId, 'testFunction', [], { timeout: 100 })
            ).rejects.toThrow(/timeout/i);
        });
    });

    describe('Worker in Node.js environment', () => {
        let consoleWarnSpy;

        beforeEach(() => {
            // Clear window mock for Node.js tests
            delete global.window;
            // Mock console.warn to suppress expected warnings
            consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        });

        afterEach(() => {
            // Restore window mock
            global.window = {};
            consoleWarnSpy.mockRestore();
        });

        test('should detect Node.js environment', () => {
            const nodeWorkerManager = new WasmWorkerManager();
            expect(nodeWorkerManager._isNode).toBe(true);
        });

        test('should warn about Node.js environment', () => {
            // The spy is already set up in beforeEach
            new WasmWorkerManager();
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('not supported in Node.js')
            );
        });
    });
});
