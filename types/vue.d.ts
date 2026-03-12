/**
 * GoWM Vue 3 Composables TypeScript Definitions
 * 
 * @version 1.1.6
 * @module gowm/vue
 */

import type { WasmBridge, ModuleMetadata, LoadOptions, GitHubLoadOptions, WorkerModule, WorkerLoadOptions } from './index';
import type { Ref, ComputedRef } from 'vue';

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
    /** Reactive ref to the loaded WASM bridge */
    bridge: Ref<WasmBridge | null>;
    /** Reactive ref indicating loading state */
    loading: Ref<boolean>;
    /** Reactive ref to loading error */
    error: Ref<Error | null>;
    /** Function to reload the module */
    reload: () => void;
}

export interface UseWasmFromGitHubResult extends UseWasmResult {
    /** Reactive ref to module metadata from module.json */
    metadata: Ref<ModuleMetadata | null>;
}

export interface UseWasmWorkerResult {
    /** Reactive ref to the worker module proxy */
    worker: Ref<WorkerModule | null>;
    /** Reactive ref indicating loading state */
    loading: Ref<boolean>;
    /** Reactive ref to loading error */
    error: Ref<Error | null>;
    /** Reactive ref indicating if worker is ready */
    ready: Ref<boolean>;
    /** Function to call a worker function */
    call: (functionName: string, ...args: any[]) => Promise<any>;
    /** Function to terminate the worker */
    terminate: () => void;
}

export interface UseSharedBufferResult {
    /** Reactive ref to the SharedArrayBuffer instance */
    buffer: Ref<SharedArrayBuffer | null>;
    /** Reactive ref to Uint8Array view */
    view: Ref<Uint8Array | null>;
    /** Size of the buffer in bytes */
    size: number;
    /** Reactive ref indicating if SharedArrayBuffer is supported */
    supported: Ref<boolean>;
    /** Reactive ref to initialization error */
    error: Ref<Error | null>;
    /** Reactive ref indicating if buffer is ready */
    ready: Ref<boolean>;
    /** Write data to the shared buffer */
    writeData: (data: ArrayBuffer | Uint8Array | number[], offset?: number) => number;
    /** Read data from the shared buffer */
    readData: (length: number, offset?: number) => Uint8Array;
    /** Clear the buffer (fill with zeros) */
    clear: () => void;
}

export interface UseWasmWorkerWithSharedMemoryResult {
    /** Reactive ref to the worker module */
    worker: Ref<WorkerModule | null>;
    /** Reactive ref indicating loading state */
    loading: Ref<boolean>;
    /** Reactive ref to loading error */
    error: Ref<Error | null>;
    /** Computed ref indicating if both worker and buffer are ready */
    ready: ComputedRef<boolean>;
    /** Reactive ref to SharedArrayBuffer */
    buffer: Ref<SharedArrayBuffer | null>;
    /** Reactive ref to Uint8Array view */
    view: Ref<Uint8Array | null>;
    /** Reactive ref indicating if SharedArrayBuffer is supported */
    supported: Ref<boolean>;
    /** Function to call a worker function */
    call: (functionName: string, ...args: any[]) => Promise<any>;
    /** Function to call with shared memory */
    callWithSharedMemory: (functionName: string, data: ArrayBuffer | Uint8Array | number[], ...args: any[]) => Promise<any>;
    /** Function to terminate the worker */
    terminate: () => void;
    /** Write data to the shared buffer */
    writeData: (data: ArrayBuffer | Uint8Array | number[], offset?: number) => number;
    /** Read data from the shared buffer */
    readData: (length: number, offset?: number) => Uint8Array;
    /** Clear the shared buffer */
    clear: () => void;
}

/**
 * Vue 3 composable to load a WASM module from any source.
 * Supports reactive source parameter. Cleans up on unmount.
 * 
 * @param source - File path, URL, or GitHub repo (string or Ref<string>)
 * @param options - GoWM load options
 * @returns Composable result with reactive bridge, loading, error, and reload
 * 
 * @example
 * ```vue
 * <script setup>
 * import { useWasm } from 'gowm/vue';
 * 
 * const { bridge, loading, error } = useWasm('./math.wasm');
 * </script>
 * <template>
 *   <p v-if="loading">Loading...</p>
 *   <p v-else-if="error">Error: {{ error.message }}</p>
 *   <p v-else>Result: {{ bridge.call('add', 5, 3) }}</p>
 * </template>
 * ```
 */
export declare function useWasm(source: string | Ref<string> | null, options?: UseWasmOptions): UseWasmResult;

/**
 * Vue 3 composable to load a WASM module from GitHub.
 * Supports reactive repo parameter. Cleans up on unmount.
 * 
 * @param repo - GitHub repo "owner/repo" (string or Ref<string>)
 * @param options - GoWM GitHub load options
 * @returns Composable result with reactive bridge, loading, error, metadata, and reload
 * 
 * @example
 * ```vue
 * <script setup>
 * import { useWasmFromGitHub } from 'gowm/vue';
 * 
 * const { bridge, loading, metadata } = useWasmFromGitHub(
 *   'benoitpetit/wasm-modules-repository',
 *   { path: 'math-wasm' }
 * );
 * </script>
 * <template>
 *   <p v-if="loading">Loading...</p>
 *   <p v-else>{{ metadata?.name }} v{{ metadata?.version }}</p>
 * </template>
 * ```
 */
export declare function useWasmFromGitHub(repo: string | Ref<string> | null, options?: UseWasmGitHubOptions): UseWasmFromGitHubResult;

/**
 * Vue 3 composable to load a WASM module in a Web Worker.
 * Prevents UI blocking during heavy computations.
 * Supports reactive source parameter. Cleans up on unmount.
 * 
 * @param source - File path, URL, or GitHub repo (string or Ref<string>)
 * @param options - GoWM worker load options
 * @returns Composable result with reactive worker, loading, error, call, terminate, and ready
 * 
 * @example
 * ```vue
 * <script setup>
 * import { useWasmWorker } from 'gowm/vue';
 * 
 * const { worker, loading, call, terminate, ready } = useWasmWorker('owner/repo');
 * 
 * const handleCompute = async () => {
 *   if (ready.value) {
 *     const result = await call('heavyFunction', data);
 *     console.log(result);
 *   }
 * };
 * </script>
 * <template>
 *   <button @click="handleCompute" :disabled="!ready || loading">
 *     Compute
 *   </button>
 * </template>
 * ```
 */
export declare function useWasmWorker(source: string | Ref<string> | null, options?: UseWasmWorkerOptions): UseWasmWorkerResult;

/**
 * Vue 3 composable for SharedArrayBuffer-based zero-copy operations.
 * Allows direct memory sharing between main thread and workers.
 * 
 * @param bufferSize - Size of shared buffer in bytes (default: 1MB)
 * @returns Shared buffer state and utilities
 * 
 * @example
 * ```vue
 * <script setup>
 * import { useSharedBuffer } from 'gowm/vue';
 * 
 * const { buffer, view, writeData, readData, supported, ready } = useSharedBuffer(1024 * 1024);
 * 
 * const process = () => {
 *   if (ready.value) {
 *     writeData(new Uint8Array([1, 2, 3]));
 *     const result = readData(3);
 *   }
 * };
 * </script>
 * <template>
 *   <p v-if="!supported">SharedArrayBuffer not supported</p>
 *   <button v-else @click="process" :disabled="!ready">Process</button>
 * </template>
 * ```
 */
export declare function useSharedBuffer(bufferSize?: number): UseSharedBufferResult;

/**
 * Advanced Vue 3 composable: Combines worker and shared buffer for maximum performance.
 * Loads WASM in a worker with SharedArrayBuffer support for zero-copy data transfer.
 * 
 * @param source - Module source (file path, URL, or GitHub repo)
 * @param options - Loading options with sharedBufferSize
 * @returns Combined worker and shared buffer state
 * 
 * @example
 * ```vue
 * <script setup>
 * import { useWasmWorkerWithSharedMemory } from 'gowm/vue';
 * 
 * const { callWithSharedMemory, ready } = useWasmWorkerWithSharedMemory('owner/repo', {
 *   sharedBufferSize: 2 * 1024 * 1024 // 2MB
 * });
 * 
 * const process = async (data) => {
 *   if (ready.value) {
 *     const result = await callWithSharedMemory('process', data);
 *     return result;
 *   }
 * };
 * </script>
 * <template>
 *   <button @click="process(myData)">High-Performance Process</button>
 * </template>
 * ```
 */
export declare function useWasmWorkerWithSharedMemory(source: string | Ref<string> | null, options?: UseWasmWorkerOptions & { sharedBufferSize?: number }): UseWasmWorkerWithSharedMemoryResult;
