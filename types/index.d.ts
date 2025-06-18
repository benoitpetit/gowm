/**
 * GoWM - Go WebAssembly Manager TypeScript Definitions
 * 
 * Comprehensive TypeScript definitions for GoWM package.
 * Provides type safety for loading and managing Go WebAssembly modules.
 * 
 * @author devbyben
 * @license MIT
 */

/**
 * Represents a loaded WebAssembly module with Go runtime
 */
export interface WasmModule {
    instance: WebAssembly.Instance;
    go: any;
    exports: WebAssembly.Exports;
    ready: boolean;
}

/**
 * Base options for loading WASM modules
 */
export interface LoadOptions {
    /** Module identifier name (default: 'default') */
    name?: string;
    /** Custom path to wasm_exec.js runtime */
    goRuntimePath?: string;
    /** Pre-initialize the module for better performance (default: true) */
    preInit?: boolean;
}

/**
 * GitHub-specific loading options extending base LoadOptions
 */
export interface GitHubLoadOptions extends LoadOptions {
    /** Git branch to use (default: 'main') */
    branch?: string;
    /** Git tag to use (takes precedence over branch) */
    tag?: string;
    /** Path within the repository (default: '') */
    path?: string;
    /** Specific filename (enables auto-detection if not provided) */
    filename?: string;
}

/**
 * Buffer information for data transfer between JavaScript and WASM
 */
export interface BufferInfo {
    /** Pointer to the buffer in WASM memory */
    ptr: number;
    /** The actual buffer data */
    buffer: Uint8Array | Float64Array;
    /** Size of the buffer in bytes */
    size: number;
    /** Function to free the buffer memory */
    free: () => void;
}

/**
 * Statistics and information about a loaded WASM module
 */
export interface ModuleStats {
    /** Whether the module is ready for use */
    ready: boolean;
    /** List of available functions in the module */
    functions: string[];
    /** List of registered JavaScript callbacks */
    callbacks: string[];
    /** Current memory usage in bytes */
    memoryUsage: number;
    /** Number of allocated buffers */
    allocatedBuffers: number;
    /** Module identifier name */
    name: string;
}

/**
 * Bridge interface for interacting with a loaded WASM module
 * Provides methods for calling functions, managing memory, and getting statistics
 */
export declare class WasmBridge {
    constructor(wasmModule: WasmModule, options?: LoadOptions);

    /**
     * Call a WASM function synchronously
     * @param funcName - Name of the function to call
     * @param args - Function arguments
     * @returns Function result
     */
    call(funcName: string, ...args: any[]): any;

    /**
     * Call a WASM function asynchronously
     * @param funcName - Name of the function to call
     * @param args - Function arguments
     * @returns Promise that resolves to the function result
     */
    callAsync(funcName: string, ...args: any[]): Promise<any>;

    /**
     * Create a buffer for data transfer to WASM
     * @param data - Data to create buffer from
     * @returns Buffer information with cleanup function
     */
    createBuffer(data: Float64Array | Uint8Array | string): BufferInfo;

    /**
     * Register a JavaScript callback that can be called from WASM
     * @param name - Callback name
     * @param callback - JavaScript function to register
     */
    registerCallback(name: string, callback: Function): void;

    /**
     * Unregister a previously registered callback
     * @param name - Callback name to remove
     */
    unregisterCallback(name: string): void;

    /**
     * Get list of all available functions in the WASM module
     * @returns Array of function names
     */
    getAvailableFunctions(): string[];

    /**
     * Check if a specific function exists in the WASM module
     * @param funcName - Function name to check
     * @returns True if function exists
     */
    hasFunction(funcName: string): boolean;

    /**
     * Get statistics and information about the module
     * @returns Module statistics object
     */
    getStats(): ModuleStats;

    /**
     * Clean up module resources and memory
     */
    cleanup(): void;
}

/**
 * WASM module loader for managing module loading and caching
 */
export declare class WasmLoader {
    constructor();

    /**
     * Load a WASM module from file or URL
     * @param wasmPath - Path to the WASM file or URL
     * @param options - Loading options
     * @returns Promise that resolves to the loaded module
     */
    loadModule(wasmPath: string, options?: LoadOptions): Promise<WasmModule>;

    /**
     * Load the Go WebAssembly runtime
     * @param customPath - Custom path to wasm_exec.js
     */
    loadGoRuntime(customPath?: string): Promise<void>;

    /**
     * Get a previously loaded module by name
     * @param name - Module name
     * @returns The module or undefined if not found
     */
    getModule(name: string): WasmModule | undefined;

    /**
     * Unload a module and clean up resources
     * @param name - Module name to unload
     * @returns True if module was unloaded
     */
    unloadModule(name: string): boolean;

    /**
     * Get list of all loaded module names
     * @returns Array of module names
     */
    listModules(): string[];
}

/**
 * Main GoWM class for managing multiple WASM modules
 * Provides high-level interface for loading and managing WASM modules
 */
export declare class GoWM {
    constructor();

    /**
     * Load a WASM module from local file or URL
     * @param wasmPath - Path to the .wasm file or URL
     * @param options - Loading options
     * @returns Promise that resolves to a WasmBridge instance
     */
    load(wasmPath: string, options?: LoadOptions): Promise<WasmBridge>;

    /**
     * Get a previously loaded module by name
     * @param name - Module name (default: 'default')
     * @returns The WasmBridge instance or null if not found
     */
    get(name?: string): WasmBridge | null;

    /**
     * Load a WASM module from GitHub repository
     * @param githubRepo - GitHub repository in format "owner/repo" or full URL
     * @param options - GitHub loading options
     * @returns Promise that resolves to a WasmBridge instance
     */
    loadFromGitHub(githubRepo: string, options?: GitHubLoadOptions): Promise<WasmBridge>;

    /**
     * Legacy NPM loading method
     * @deprecated This method is deprecated and will be removed in future versions. Use loadFromGitHub instead.
     * @param packageName - NPM package name
     * @param options - Loading options
     * @returns Promise that resolves to a WasmBridge instance
     */
    loadFromNPM(packageName: string, options?: LoadOptions): Promise<WasmBridge>;

    /**
     * Unload a specific module
     * @param name - Module name (default: 'default')
     * @returns True if module was unloaded
     */
    unload(name?: string): boolean;

    /**
     * Get list of all loaded module names
     * @returns Array of module names
     */
    listModules(): string[];

    /**
     * Get statistics for all loaded modules
     * @returns Object with module names as keys and stats as values
     */
    getStats(): Record<string, ModuleStats>;

    /**
     * Unload all modules and clean up resources
     */
    unloadAll(): void;

    /**
     * Check if a module is currently loaded
     * @param name - Module name (default: 'default')
     * @returns True if module is loaded
     */
    isLoaded(name?: string): boolean;

    /**
     * Get total memory usage across all modules
     * @returns Total memory usage in bytes
     */
    getTotalMemoryUsage(): number;
}

// =============================================================================
// Simplified API Functions
// =============================================================================

/**
 * Load a WASM module from local file or URL
 * @param wasmPath - Path to the .wasm file or URL
 * @param options - Loading options
 * @returns Promise that resolves to a WasmBridge instance
 */
export declare function load(wasmPath: string, options?: LoadOptions): Promise<WasmBridge>;

/**
 * Get a previously loaded module by name
 * @param name - Module name (default: 'default')
 * @returns The WasmBridge instance or null if not found
 */
export declare function get(name?: string): WasmBridge | null;

/**
 * Load a WASM module from GitHub repository
 * @param githubRepo - GitHub repository in format "owner/repo" or full URL
 * @param options - GitHub loading options
 * @returns Promise that resolves to a WasmBridge instance
 */
export declare function loadFromGitHub(githubRepo: string, options?: GitHubLoadOptions): Promise<WasmBridge>;

/**
 * Legacy NPM loading function
 * @deprecated This function is deprecated and will be removed in future versions. Use loadFromGitHub instead.
 * @param packageName - NPM package name
 * @param options - Loading options
 * @returns Promise that resolves to a WasmBridge instance
 */
export declare function loadFromNPM(packageName: string, options?: LoadOptions): Promise<WasmBridge>;

/**
 * Unload a specific module
 * @param name - Module name (default: 'default')
 * @returns True if module was unloaded
 */
export declare function unload(name?: string): boolean;

/**
 * Get list of all loaded module names
 * @returns Array of module names
 */
export declare function listModules(): string[];

/**
 * Get statistics for all loaded modules
 * @returns Object with module names as keys and stats as values
 */
export declare function getStats(): Record<string, ModuleStats>;

/**
 * Unload all modules and clean up resources
 */
export declare function unloadAll(): void;

/**
 * Check if a module is currently loaded
 * @param name - Module name (default: 'default')
 * @returns True if module is loaded
 */
export declare function isLoaded(name?: string): boolean;

/**
 * Get total memory usage across all modules
 * @returns Total memory usage in bytes
 */
export declare function getTotalMemoryUsage(): number;

// =============================================================================
// React Hooks Types
// =============================================================================

/**
 * Result object returned by React WASM hooks
 */
export interface UseWasmResult {
    /** The loaded WASM bridge instance or null */
    wasm: WasmBridge | null;
    /** Loading state */
    loading: boolean;
    /** Error state if loading failed */
    error: Error | null;
}

/**
 * Result object for React hooks that load multiple modules
 */
export interface UseMultipleWasmResult {
    /** Object with module names as keys and WasmBridge instances as values */
    modules: Record<string, WasmBridge>;
    /** Global loading state */
    loading: boolean;
    /** Object with module names as keys and Error instances as values */
    errors: Record<string, Error>;
    /** Function to reload all modules */
    reload: () => void;
}

/**
 * React hook for loading a local WASM module
 * @param wasmPath - Path to the .wasm file or URL
 * @param options - Loading options
 * @returns Hook result with wasm, loading, and error states
 */
export declare function useWasm(wasmPath: string, options?: LoadOptions): UseWasmResult;

/**
 * React hook for loading a WASM module from GitHub
 * @param githubRepo - GitHub repository in format "owner/repo" or full URL
 * @param options - GitHub loading options
 * @returns Hook result with wasm, loading, and error states
 */
export declare function useWasmFromGitHub(githubRepo: string, options?: GitHubLoadOptions): UseWasmResult;

/**
 * Configuration for loading multiple GitHub repositories
 */
export interface GitHubRepoConfig {
    /** Module name (required) */
    name: string;
    /** GitHub repository (required) */
    repo: string;
    /** Git branch */
    branch?: string;
    /** Git tag */
    tag?: string;
    /** Path within repository */
    path?: string;
    /** Specific filename */
    filename?: string;
    /** Additional loading options */
    options?: GitHubLoadOptions;
}

/**
 * React hook for loading multiple WASM modules from GitHub
 * @param githubRepos - Array of GitHub repository configurations
 * @param options - Global loading options
 * @returns Hook result with modules, loading, errors, and reload function
 */
export declare function useMultipleWasmFromGitHub(githubRepos: GitHubRepoConfig[], options?: GitHubLoadOptions): UseMultipleWasmResult;

/**
 * Legacy React hook for NPM package loading
 * @deprecated This hook is deprecated and will be removed in future versions. Use useWasmFromGitHub instead.
 * @param packageName - NPM package name
 * @param options - Loading options
 * @returns Hook result with wasm, loading, and error states
 */
export declare function useWasmFromNPM(packageName: string, options?: LoadOptions): UseWasmResult;

// =============================================================================
// Vue 3 Composables Types
// =============================================================================

// Import Vue's Ref type for composables
import { Ref } from 'vue';

/**
 * Result object returned by Vue WASM composables
 */
export interface VueWasmResult {
    /** Reactive reference to the loaded WASM bridge instance */
    wasm: Ref<WasmBridge | null>;
    /** Reactive loading state */
    loading: Ref<boolean>;
    /** Reactive error state */
    error: Ref<Error | null>;
    /** Function to reload the module */
    reload: () => void;
}

/**
 * Configuration for loading multiple WASM modules with Vue composables
 */
export interface VueMultiWasmConfig {
    /** Module name (required) */
    name: string;
    /** Local file path */
    path?: string;
    /** GitHub repository */
    github?: string;
    /** Loading options */
    options?: LoadOptions;
}

/**
 * Result object for Vue composables that load multiple modules
 */
export interface VueMultiWasmResult {
    /** Reactive object with module names as keys and WasmBridge instances as values */
    modules: Ref<Record<string, WasmBridge>>;
    /** Reactive global loading state */
    loading: Ref<boolean>;
    /** Reactive object with module names as keys and Error instances as values */
    errors: Ref<Record<string, Error>>;
    /** Function to reload all modules */
    reload: () => void;
}

/**
 * Vue composable for loading a local WASM module
 * @param wasmPath - Path to the .wasm file or reactive reference
 * @param options - Loading options or reactive reference
 * @returns Composable result with reactive states and reload function
 */
export declare function useWasm(
    wasmPath: string | Ref<string>,
    options?: LoadOptions | Ref<LoadOptions>
): VueWasmResult;

/**
 * Vue composable for loading a WASM module from GitHub
 * @param githubRepo - GitHub repository or reactive reference
 * @param options - GitHub loading options or reactive reference
 * @returns Composable result with reactive states and reload function
 */
export declare function useWasmFromGitHub(
    githubRepo: string | Ref<string>,
    options?: GitHubLoadOptions | Ref<GitHubLoadOptions>
): VueWasmResult;

/**
 * Vue composable for loading multiple WASM modules
 * @param modules - Array of module configurations or reactive reference
 * @returns Composable result with reactive states and reload function
 */
export declare function useMultipleWasm(
    modules: VueMultiWasmConfig[] | Ref<VueMultiWasmConfig[]>
): VueMultiWasmResult;

/**
 * Vue composable for loading multiple WASM modules from GitHub
 * @param githubRepos - Array of GitHub repository configurations or reactive reference
 * @returns Composable result with reactive states and reload function
 */
export declare function useMultipleWasmFromGitHub(
    githubRepos: GitHubRepoConfig[] | Ref<GitHubRepoConfig[]>
): VueMultiWasmResult;

/**
 * Legacy Vue composable for NPM package loading
 * @deprecated This composable is deprecated and will be removed in future versions. Use useWasmFromGitHub instead.
 * @param packageName - NPM package name or reactive reference
 * @param options - Loading options or reactive reference
 * @returns Composable result with reactive states and reload function
 */
export declare function useWasmFromNPM(
    packageName: string | Ref<string>,
    options?: LoadOptions | Ref<LoadOptions>
): VueWasmResult;
