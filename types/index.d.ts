// Types pour TypeScript

export interface WasmModule {
    instance: WebAssembly.Instance;
    go: any;
    exports: WebAssembly.Exports;
    ready: boolean;
}

export interface LoadOptions {
    name?: string;
    goRuntimePath?: string;
    preInit?: boolean;
}

export interface BufferInfo {
    ptr: number;
    buffer: Uint8Array | Float64Array;
    size: number;
    free: () => void;
}

export interface ModuleStats {
    ready: boolean;
    functions: string[];
    callbacks: string[];
    memoryUsage: number;
    name: string;
}

export declare class WasmBridge {
    constructor(wasmModule: WasmModule, options?: LoadOptions);

    call(funcName: string, ...args: any[]): any;
    callAsync(funcName: string, ...args: any[]): Promise<any>;
    createBuffer(data: Float64Array | Uint8Array | string): BufferInfo;
    registerCallback(name: string, callback: Function): void;
    unregisterCallback(name: string): void;
    getAvailableFunctions(): string[];
    hasFunction(funcName: string): boolean;
    getStats(): ModuleStats;
    cleanup(): void;
}

export declare class WasmLoader {
    constructor();

    loadModule(wasmPath: string, options?: LoadOptions): Promise<WasmModule>;
    loadGoRuntime(customPath?: string): Promise<void>;
    getModule(name: string): WasmModule | undefined;
    unloadModule(name: string): boolean;
    listModules(): string[];
}

export declare class GoWM {
    constructor();

    load(wasmPath: string, options?: LoadOptions): Promise<WasmBridge>;
    get(name?: string): WasmBridge | null;
    loadFromNPM(packageName: string, options?: LoadOptions): Promise<WasmBridge>;
    unload(name?: string): boolean;
    listModules(): string[];
    getStats(): Record<string, ModuleStats>;
    unloadAll(): void;
}

// API simplifiée
export declare function load(wasmPath: string, options?: LoadOptions): Promise<WasmBridge>;
export declare function get(name?: string): WasmBridge | null;
export declare function loadFromNPM(packageName: string, options?: LoadOptions): Promise<WasmBridge>;
export declare function unload(name?: string): boolean;
export declare function listModules(): string[];
export declare function getStats(): Record<string, ModuleStats>;
export declare function unloadAll(): void;

// Hook React
export interface UseWasmResult {
    wasm: WasmBridge | null;
    loading: boolean;
    error: Error | null;
}

export declare function useWasm(wasmPath: string, options?: LoadOptions): UseWasmResult;

// Composables Vue
import { Ref } from 'vue';

export interface VueWasmResult {
    wasm: Ref<WasmBridge | null>;
    loading: Ref<boolean>;
    error: Ref<Error | null>;
    reload: () => void;
}

export interface VueMultiWasmConfig {
    name?: string;
    path?: string;
    package?: string;
    options?: LoadOptions;
}

export interface VueMultiWasmResult {
    modules: Ref<Record<string, WasmBridge>>;
    loading: Ref<boolean>;
    errors: Ref<Record<string, Error>>;
    reload: () => void;
}

export declare function useWasm(
    wasmPath: string | Ref<string>,
    options?: LoadOptions | Ref<LoadOptions>
): VueWasmResult;

export declare function useWasmFromNPM(
    packageName: string | Ref<string>,
    options?: LoadOptions | Ref<LoadOptions>
): VueWasmResult;

export declare function useMultipleWasm(
    modules: VueMultiWasmConfig[] | Ref<VueMultiWasmConfig[]>
): VueMultiWasmResult;
