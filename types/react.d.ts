/**
 * GoWM React Hooks TypeScript Definitions
 * 
 * @version 1.1.6
 * @module gowm/react
 */

import type { WasmBridge, ModuleMetadata, LoadOptions, GitHubLoadOptions, WorkerModule, WorkerLoadOptions } from './index';

export interface UseWasmOptions extends LoadOptions {
    /** Log level for the internal GoWM instance (default: 'silent') */
    logLevel?: string;
}

export interface UseWasmGitHubOptions extends GitHubLoadOptions {
    /** Log level for the internal GoWM instance (default: 'silent') */
    logLevel?: string;
}

export interface UseWasmWorkerOptions extends WorkerLoadOptions {
    /** Log level for the internal GoWM instance (default: 'silent') */
    logLevel?: string;
}

export interface UseWasmResult {
    /** The loaded WASM bridge, or null while loading */
    bridge: WasmBridge | null;
    /** Whether the module is currently loading */
    loading: boolean;
    /** Error if loading failed, null otherwise */
    error: Error | null;
    /** Function to reload the module */
    reload: () => void;
}

export interface UseWasmFromGitHubResult extends UseWasmResult {
    /** Module metadata from module.json, or null */
    metadata: ModuleMetadata | null;
}

export interface UseWasmWorkerResult {
    /** The worker module proxy, or null while loading */
    worker: WorkerModule | null;
    /** Whether the worker is currently loading */
    loading: boolean;
    /** Error if loading failed, null otherwise */
    error: Error | null;
    /** Function to call a worker function */
    call: (functionName: string, ...args: any[]) => Promise<any>;
    /** Function to terminate the worker */
    terminate: () => void;
    /** Whether the worker is ready */
    ready: boolean;
    /** Whether running in a worker */
    inWorker: true;
}

export interface UseSharedBufferResult {
    /** The SharedArrayBuffer instance, or null if not supported */
    buffer: SharedArrayBuffer | null;
    /** Uint8Array view of the buffer, or null */
    view: Uint8Array | null;
    /** Size of the buffer in bytes */
    size: number;
    /** Whether SharedArrayBuffer is supported */
    supported: boolean;
    /** Error if initialization failed, null otherwise */
    error: Error | null;
    /** Whether the buffer is ready to use */
    ready: boolean;
    /** Write data to the shared buffer */
    writeData: (data: ArrayBuffer | Uint8Array | number[], offset?: number) => number;
    /** Read data from the shared buffer */
    readData: (length: number, offset?: number) => Uint8Array;
    /** Clear the buffer (fill with zeros) */
    clear: () => void;
}

export interface UseWasmWorkerWithSharedMemoryResult extends UseWasmWorkerResult {
    /** Shared buffer state and utilities */
    sharedBuffer: Omit<UseSharedBufferResult, 'buffer' | 'view'> & { 
        buffer: SharedArrayBuffer | null; 
        view: Uint8Array | null;
    };
    /** Call a function with data written to shared memory */
    callWithSharedMemory: (functionName: string, data: ArrayBuffer | Uint8Array | number[], ...args: any[]) => Promise<any>;
}

/**
 * React hook to load a WASM module from any source.
 * Automatically loads when source changes and cleans up on unmount.
 * 
 * @param source - File path, URL, or GitHub repo
 * @param options - GoWM load options
 * @returns Hook result with bridge, loading, error, and reload
 * 
 * @example
 * ```tsx
 * import { useWasm } from 'gowm/react';
 * 
 * function Calculator() {
 *   const { bridge, loading, error } = useWasm('./math.wasm');
 *   if (loading) return <p>Loading...</p>;
 *   if (error) return <p>Error: {error.message}</p>;
 *   return <p>Result: {bridge.call('add', 5, 3)}</p>;
 * }
 * ```
 */
export declare function useWasm(source: string | null, options?: UseWasmOptions): UseWasmResult;

/**
 * React hook to load a WASM module from GitHub.
 * Automatically loads when repo changes and cleans up on unmount.
 * 
 * @param repo - GitHub repo in "owner/repo" format
 * @param options - GoWM GitHub load options
 * @returns Hook result with bridge, loading, error, metadata, and reload
 * 
 * @example
 * ```tsx
 * import { useWasmFromGitHub } from 'gowm/react';
 * 
 * function MathModule() {
 *   const { bridge, loading, metadata } = useWasmFromGitHub(
 *     'benoitpetit/wasm-modules-repository',
 *     { path: 'math-wasm' }
 *   );
 *   if (loading) return <p>Loading...</p>;
 *   return <p>{metadata?.name} v{metadata?.version}</p>;
 * }
 * ```
 */
export declare function useWasmFromGitHub(repo: string | null, options?: UseWasmGitHubOptions): UseWasmFromGitHubResult;

/**
 * React hook to load a WASM module in a Web Worker.
 * Prevents UI blocking during heavy computations.
 * Automatically loads when source changes and terminates worker on unmount.
 * 
 * @param source - File path, URL, or GitHub repo
 * @param options - GoWM worker load options
 * @returns Hook result with worker, loading, error, call, terminate, and ready
 * 
 * @example
 * ```tsx
 * import { useWasmWorker } from 'gowm/react';
 * 
 * function HeavyComputation() {
 *   const { call, ready, loading } = useWasmWorker('owner/repo');
 *   const handleCompute = async () => {
 *     if (ready) {
 *       const result = await call('heavyFunction', data);
 *       console.log(result);
 *     }
 *   };
 *   return (
 *     <button onClick={handleCompute} disabled={!ready || loading}>
 *       Compute
 *     </button>
 *   );
 * }
 * ```
 */
export declare function useWasmWorker(source: string | null, options?: UseWasmWorkerOptions): UseWasmWorkerResult;

/**
 * React hook for SharedArrayBuffer-based zero-copy operations.
 * Allows direct memory sharing between main thread and workers.
 * 
 * @param bufferSize - Size of shared buffer in bytes (default: 1MB)
 * @returns Shared buffer state and utilities
 * 
 * @example
 * ```tsx
 * import { useSharedBuffer } from 'gowm/react';
 * 
 * function DataProcessor() {
 *   const { buffer, writeData, readData, supported } = useSharedBuffer(1024 * 1024);
 *   if (!supported) return <p>SharedArrayBuffer not supported</p>;
 *   
 *   const process = () => {
 *     writeData(new Uint8Array([1, 2, 3]));
 *     const result = readData(3);
 *   };
 *   return <button onClick={process}>Process</button>;
 * }
 * ```
 */
export declare function useSharedBuffer(bufferSize?: number): UseSharedBufferResult;

/**
 * Advanced React hook: Combines worker and shared buffer for maximum performance.
 * Loads WASM in a worker with SharedArrayBuffer support for zero-copy data transfer.
 * 
 * @param source - Module source (file path, URL, or GitHub repo)
 * @param options - Loading options with sharedBufferSize
 * @returns Combined worker and shared buffer state
 * 
 * @example
 * ```tsx
 * import { useWasmWorkerWithSharedMemory } from 'gowm/react';
 * 
 * function HighPerformanceProcessor() {
 *   const { callWithSharedMemory, ready } = useWasmWorkerWithSharedMemory('owner/repo', {
 *     sharedBufferSize: 2 * 1024 * 1024 // 2MB
 *   });
 *   
 *   const process = async (data: Uint8Array) => {
 *     if (ready) {
 *       const result = await callWithSharedMemory('process', data);
 *       return result;
 *     }
 *   };
 *   
 *   return <button onClick={() => process(myData)}>Process</button>;
 * }
 * ```
 */
export declare function useWasmWorkerWithSharedMemory(source: string | null, options?: UseWasmWorkerOptions & { sharedBufferSize?: number }): UseWasmWorkerWithSharedMemoryResult;
