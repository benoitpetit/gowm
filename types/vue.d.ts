/**
 * GoWM Vue 3 Composables TypeScript Definitions
 * 
 * @version 1.1.1
 * @module gowm/vue
 */

import type { WasmBridge, ModuleMetadata, LoadOptions, GitHubLoadOptions } from './index';
import type { Ref } from 'vue';

export interface UseWasmOptions extends LoadOptions {
    /** Log level for the internal GoWM instance (default: 'silent') */
    logLevel?: string;
}

export interface UseWasmGitHubOptions extends GitHubLoadOptions {
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
