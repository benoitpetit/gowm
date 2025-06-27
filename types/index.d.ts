/**
 * GoWM - Go Wasm Manager TypeScript Definitions v1.1.0
 * 
 * Comprehensive TypeScript definitions for GoWM package.
 * Provides type safety for loading and managing Go Wasm modules.
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
    /** Initialization timeout in milliseconds (default: 15000) */
    timeout?: number;
}

/**
 * GitHub-specific loading options extending base LoadOptions
 */
export interface GitHubLoadOptions extends LoadOptions {
    /** Git branch to use (default: 'master') */
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
     * Load the Go Wasm runtime
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
     * Load a WASM module from local file or URL with auto-detection
     * @param source - Path to .wasm file, URL, or GitHub repo
     * @param options - Loading options
     * @returns Promise that resolves to a WasmBridge instance
     */
    load(source: string, options?: LoadOptions): Promise<WasmBridge>;

    /**
     * Load a WASM module from GitHub repository
     * @param githubRepo - GitHub repository in 'owner/repo' format
     * @param options - GitHub-specific loading options
     * @returns Promise that resolves to a WasmBridge instance
     */
    loadFromGitHub(githubRepo: string, options?: GitHubLoadOptions): Promise<WasmBridge>;

    /**
     * Load a WASM module from HTTP/HTTPS URL
     * @param url - HTTP/HTTPS URL to WASM file
     * @param options - Loading options
     * @returns Promise that resolves to a WasmBridge instance
     */
    loadFromUrl(url: string, options?: LoadOptions): Promise<WasmBridge>;

    /**
     * Load a WASM module from local file (Node.js only)
     * @param filePath - Path to .wasm file
     * @param options - Loading options
     * @returns Promise that resolves to a WasmBridge instance
     */
    loadFromFile(filePath: string, options?: LoadOptions): Promise<WasmBridge>;

    /**
     * Get a previously loaded module
     * @param name - Module name
     * @returns WasmBridge instance or null if not found
     */
    get(name?: string): WasmBridge | null;

    /**
     * Unload a module and clean up resources
     * @param name - Module name to unload
     * @returns True if module was unloaded
     */
    unload(name?: string): boolean;

    /**
     * Get list of all loaded module names
     * @returns Array of module names
     */
    listModules(): string[];

    /**
     * Get statistics for all modules
     * @returns Object with module names as keys and stats as values
     */
    getStats(): Record<string, ModuleStats>;

    /**
     * Unload all modules and clean up resources
     */
    unloadAll(): void;

    /**
     * Check if a module is loaded
     * @param name - Module name to check
     * @returns True if module is loaded
     */
    isLoaded(name?: string): boolean;

    /**
     * Get total memory usage of all modules
     * @returns Total memory usage in bytes
     */
    getTotalMemoryUsage(): number;

    /**
     * Test all loaded modules
     * @returns Test results object
     */
    testAll(): Record<string, any>;

    /**
     * Get help information about GoWM
     * @returns Help information object
     */
    getHelp(): any;
}

// Default exports for direct function usage
export declare function load(source: string, options?: LoadOptions): Promise<WasmBridge>;
export declare function loadFromGitHub(githubRepo: string, options?: GitHubLoadOptions): Promise<WasmBridge>;
export declare function loadFromUrl(url: string, options?: LoadOptions): Promise<WasmBridge>;
export declare function loadFromFile(filePath: string, options?: LoadOptions): Promise<WasmBridge>;
export declare function get(name?: string): WasmBridge | null;
export declare function unload(name?: string): boolean;
export declare function listModules(): string[];
export declare function getStats(): Record<string, ModuleStats>;
export declare function unloadAll(): void;
export declare function isLoaded(name?: string): boolean;
export declare function getTotalMemoryUsage(): number;
export declare function testAll(): Record<string, any>;
export declare function getHelp(): any;

// Legacy exports for backward compatibility
export { WasmBridge as UnifiedWasmBridge };
export { WasmLoader as UnifiedWasmLoader };

/**
 * Framework Integration Notice
 * 
 * React Hooks and Vue Composables will be available in GoWM v1.1.1
 * Current version: 1.1.0 - Core functionality only
 * 
 * Planned for v1.1.1:
 * - useWasm React hook
 * - useWasmFromGitHub React hook
 * - useWasm Vue composable
 * - useWasmFromGitHub Vue composable
 */

export default GoWM;
