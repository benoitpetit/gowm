/**
 * GoWM - Go Wasm Manager TypeScript Definitions v1.1.2
 * 
 * Comprehensive TypeScript definitions for GoWM package.
 * Provides type safety for loading and managing Go Wasm modules.
 * Includes Event System, Type Generator, React Hooks, and Vue Composables.
 * 
 * @author devbyben
 * @license MIT
 */

/** Log level for GoWM instance */
export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

/** Event types emitted by GoWM */
export type GoWMEventType =
    | 'module:loading'
    | 'module:loaded'
    | 'module:error'
    | 'module:unloaded'
    | 'memory:warning';

/** Data payload for module:loading event */
export interface ModuleLoadingEvent {
    name: string;
    source: string;
}

/** Data payload for module:loaded event */
export interface ModuleLoadedEvent {
    name: string;
    bridge: WasmBridge;
    loadTime: number;
    source: string;
}

/** Data payload for module:error event */
export interface ModuleErrorEvent {
    name: string;
    error: Error;
    source: string;
}

/** Data payload for module:unloaded event */
export interface ModuleUnloadedEvent {
    name: string;
}

/** Data payload for memory:warning event */
export interface MemoryWarningEvent {
    usage: number;
    threshold: number;
    modules: string[];
}

/** Event callback function */
export type GoWMEventCallback<T = any> = (data: T) => void;

/**
 * Options for GoWM constructor
 */
export interface GoWMOptions {
    /** Log level (default: 'info') */
    logLevel?: LogLevel;
    /** Custom logger object (must have log, warn, error, debug methods; default: console) */
    logger?: {
        log: (...args: any[]) => void;
        warn: (...args: any[]) => void;
        error: (...args: any[]) => void;
        debug?: (...args: any[]) => void;
    };
    /** Memory usage threshold in bytes to emit 'memory:warning' event */
    memoryWarningThreshold?: number;
}

/**
 * Represents a loaded WebAssembly module with Go runtime
 */
export interface WasmModule {
    instance: WebAssembly.Instance;
    go: any;
    exports: WebAssembly.Exports;
    ready: boolean;
    /** Module identifier for namespace isolation */
    moduleId?: string;
    /** Module metadata from module.json (Phase 3) */
    metadata?: ModuleMetadata | null;
}

/**
 * Module metadata from module.json
 */
export interface ModuleMetadata {
    name: string;
    version: string;
    description: string;
    author?: string;
    license?: string;
    functions?: FunctionMetadata[];
    functionCategories?: Record<string, string[]>;
    gowmConfig?: GowmConfig;
    errorHandling?: {
        pattern: string;
        description: string;
        detection: string;
    };
    compatibility?: {
        nodejs?: string;
        browsers?: string[];
        gowm?: string;
    };
    [key: string]: any;
}

/**
 * Function metadata from module.json
 */
export interface FunctionMetadata {
    name: string;
    description?: string;
    category?: string;
    parameters?: ParameterMetadata[];
    returnType?: string;
    example?: string;
    errorPattern?: string;
}

/**
 * Parameter metadata from module.json
 */
export interface ParameterMetadata {
    name: string;
    type: string;
    description?: string;
    optional?: boolean;
}

/**
 * GoWM configuration from module.json
 */
export interface GowmConfig {
    readySignal?: string;
    errorPattern?: string;
    autoDetect?: boolean;
    preferredFilename?: string;
    standardFunctions?: string[];
    supportedBranches?: string[];
    compressedFile?: string;
    integrityFile?: string;
}

/**
 * Function description returned by bridge.describe()
 */
export interface FunctionDescription {
    name: string;
    description: string | null;
    category: string | null;
    parameters: ParameterMetadata[];
    returnType: string | null;
    example: string | null;
    errorPattern: string | null;
}

/**
 * Detailed function info returned by bridge.getDetailedFunctions()
 */
export interface DetailedFunction {
    name: string;
    description?: string | null;
    category?: string | null;
    parameters?: ParameterMetadata[];
    returnType?: string | null;
    example?: string | null;
    errorPattern?: string | null;
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
    /** Enable/disable caching (default: true) */
    enabled?: boolean;
    /** Cache TTL in milliseconds (default: 3600000 = 1h) */
    ttl?: number;
    /** Enable/disable disk cache (default: true) */
    diskCache?: boolean;
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
    /** Cache configuration (false to disable, or CacheOptions object) */
    cache?: false | CacheOptions;
    /** Number of retry attempts on network failure (default: 3) */
    retries?: number;
    /** Base retry delay in ms with exponential backoff (default: 1000) */
    retryDelay?: number;
    /** Fetch and use module.json metadata (default: true) */
    metadata?: boolean;
    /** Verify SHA256 integrity from .wasm.integrity file (default: true) */
    integrity?: boolean;
    /** Validate function calls using metadata (default: true) */
    validateCalls?: boolean;
}

/**
 * GitHub-specific loading options extending base LoadOptions
 */
export interface GitHubLoadOptions extends LoadOptions {
    /** Git branch to use (default: auto-detected via GitHub API) */
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
    /** Whether module.json metadata is available */
    hasMetadata: boolean;
    /** Metadata summary (if available) */
    metadata?: {
        name: string;
        version: string;
        description: string;
        functionsCount: number;
        categories: string[];
        errorPattern: string | null;
    } | null;
}

/**
 * Bridge interface for interacting with a loaded WASM module
 * Provides methods for calling functions, managing memory, and getting statistics
 */
export declare class WasmBridge {
    constructor(wasmModule: WasmModule, options?: LoadOptions & { moduleId?: string });

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
     * Get detailed function information from module.json metadata
     * @returns Array of detailed function info
     */
    getDetailedFunctions(): DetailedFunction[];

    /**
     * Get inline documentation for a specific function
     * @param funcName - Function name to describe
     * @returns Function documentation or null
     */
    describe(funcName: string): FunctionDescription | null;

    /**
     * Get module metadata from module.json
     * @returns Module metadata or null
     */
    getMetadata(): ModuleMetadata | null;

    /**
     * Get function categories from module.json
     * @returns Category mapping or null
     */
    getFunctionCategories(): Record<string, string[]> | null;

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
    constructor(options?: GoWMOptions);

    /**
     * Get the GoWM version
     * @returns Version string
     */
    getVersion(): string;

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

    /**
     * Clear the WASM cache (memory + disk/IndexedDB)
     * @param options - Cache clearing options
     */
    clearCache(options?: { memory?: boolean; disk?: boolean }): Promise<void>;

    /**
     * Get module.json metadata for a loaded module
     * @param name - Module name (default: 'default')
     * @returns Module metadata or null
     */
    getModuleMetadata(name?: string): ModuleMetadata | null;

    /**
     * Get inline documentation for a function in a loaded module
     * @param name - Module name
     * @param funcName - Function name
     * @returns Function documentation or null
     */
    describeFunction(name: string, funcName: string): FunctionDescription | null;

    // ──── Event System (v1.1.2) ────

    /**
     * Register an event listener
     * @param event - Event name
     * @param callback - Callback function
     * @returns this (for chaining)
     */
    on<E extends GoWMEventType>(event: E, callback: GoWMEventCallback): this;
    on(event: string, callback: GoWMEventCallback): this;

    /**
     * Remove an event listener
     * @param event - Event name
     * @param callback - Callback function to remove
     * @returns this (for chaining)
     */
    off<E extends GoWMEventType>(event: E, callback: GoWMEventCallback): this;
    off(event: string, callback: GoWMEventCallback): this;

    /**
     * Register a one-time event listener (auto-removed after first call)
     * @param event - Event name
     * @param callback - Callback function
     * @returns this (for chaining)
     */
    once<E extends GoWMEventType>(event: E, callback: GoWMEventCallback): this;
    once(event: string, callback: GoWMEventCallback): this;
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
export declare function clearCache(options?: { memory?: boolean; disk?: boolean }): Promise<void>;
export declare function getModuleMetadata(name?: string): ModuleMetadata | null;
export declare function describeFunction(name: string, funcName: string): FunctionDescription | null;

// Legacy exports for backward compatibility
export { WasmBridge as UnifiedWasmBridge };
export { WasmLoader as UnifiedWasmLoader };

// ──── Type Generator (v1.1.2) ────

export interface TypeGeneratorOptions {
    /** Custom interface name (default: derived from module name) */
    interfaceName?: string;
    /** Include JSDoc comments (default: true) */
    includeJSDoc?: boolean;
    /** Export as default (default: false) */
    exportDefault?: boolean;
}

export interface TypeGeneratorGitHubOptions extends TypeGeneratorOptions {
    /** Git branch (default: 'master') */
    branch?: string;
}

/**
 * Generate TypeScript interface definitions from module.json metadata
 * @param metadata - Parsed module.json content
 * @param options - Generation options
 * @returns TypeScript source code
 */
export declare function generateTypes(metadata: ModuleMetadata, options?: TypeGeneratorOptions): string;

/**
 * Generate TypeScript interface definitions from a GitHub-hosted module.json
 * @param repo - GitHub repo in 'owner/repo/modulePath' format
 * @param options - Generation options (includes branch)
 * @returns Promise resolving to TypeScript source code
 */
export declare function generateTypesFromGitHub(repo: string, options?: TypeGeneratorGitHubOptions): Promise<string>;

export default GoWM;
