/**
 * GoWM React Hooks TypeScript Definitions
 * 
 * @version 1.1.2
 * @module gowm/react
 */

import type { WasmBridge, ModuleMetadata, LoadOptions, GitHubLoadOptions } from './index';

export interface UseWasmOptions extends LoadOptions {
    /** Log level for the internal GoWM instance (default: 'silent') */
    logLevel?: string;
}

export interface UseWasmGitHubOptions extends GitHubLoadOptions {
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
