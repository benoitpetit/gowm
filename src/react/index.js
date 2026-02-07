/**
 * GoWM React Hooks
 * React integration for loading and using Go WASM modules.
 * 
 * Usage:
 *   import { useWasm, useWasmFromGitHub } from 'gowm/react';
 * 
 * @version 1.1.2
 */

'use strict';

// React is a peer dependency — users must have it installed
let React;
try {
    React = require('react');
} catch (e) {
    // Will throw when hooks are called if React is not available
}

function ensureReact() {
    if (!React) {
        throw new Error(
            'React is required to use GoWM React hooks. ' +
            'Install it with: npm install react'
        );
    }
}

/**
 * Hook to load a WASM module from any source.
 * 
 * @param {string} source - File path, URL, or GitHub repo
 * @param {object} [options] - GoWM load options
 * @returns {{ bridge: object|null, loading: boolean, error: Error|null, reload: Function }}
 * 
 * @example
 * const { bridge, loading, error } = useWasm('./math.wasm');
 * if (bridge) bridge.call('add', 5, 3);
 */
function useWasm(source, options = {}) {
    ensureReact();
    const { useState, useEffect, useRef, useCallback } = React;

    const [bridge, setBridge] = useState(null);
    const [loading, setLoading] = useState(!!source);
    const [error, setError] = useState(null);
    const gowmRef = useRef(null);
    const mountedRef = useRef(true);

    // Serialize options for dependency tracking (stable reference)
    const optionsKey = JSON.stringify(options);

    const reload = useCallback(() => {
        if (!source) return;
        setLoading(true);
        setError(null);
        setBridge(null);
        loadModule();
    }, [source, optionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

    async function loadModule() {
        try {
            if (!gowmRef.current) {
                const GoWM = require('../core/gowm');
                gowmRef.current = new GoWM({ logLevel: options.logLevel || 'silent' });
            }

            const parsedOptions = JSON.parse(optionsKey);
            const result = await gowmRef.current.load(source, parsedOptions);

            if (mountedRef.current) {
                setBridge(result);
                setLoading(false);
            }
        } catch (err) {
            if (mountedRef.current) {
                setError(err);
                setLoading(false);
            }
        }
    }

    useEffect(() => {
        mountedRef.current = true;
        if (source) {
            setLoading(true);
            setError(null);
            setBridge(null);
            loadModule();
        }
        return () => {
            mountedRef.current = false;
            if (gowmRef.current) {
                gowmRef.current.unloadAll();
            }
        };
    }, [source, optionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

    return { bridge, loading, error, reload };
}

/**
 * Hook to load a WASM module from GitHub.
 * 
 * @param {string} repo - GitHub repo in format "owner/repo"
 * @param {object} [options] - GoWM GitHub load options (path, branch, etc.)
 * @returns {{ bridge: object|null, loading: boolean, error: Error|null, metadata: object|null, reload: Function }}
 * 
 * @example
 * const { bridge, loading, error, metadata } = useWasmFromGitHub(
 *   'benoitpetit/wasm-modules-repository',
 *   { path: 'math-wasm', branch: 'master' }
 * );
 */
function useWasmFromGitHub(repo, options = {}) {
    ensureReact();
    const { useState, useEffect, useRef, useCallback } = React;

    const [bridge, setBridge] = useState(null);
    const [loading, setLoading] = useState(!!repo);
    const [error, setError] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const gowmRef = useRef(null);
    const mountedRef = useRef(true);

    const optionsKey = JSON.stringify(options);

    const reload = useCallback(() => {
        if (!repo) return;
        setLoading(true);
        setError(null);
        setBridge(null);
        setMetadata(null);
        loadModule();
    }, [repo, optionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

    async function loadModule() {
        try {
            if (!gowmRef.current) {
                const GoWM = require('../core/gowm');
                gowmRef.current = new GoWM({ logLevel: options.logLevel || 'silent' });
            }

            const parsedOptions = JSON.parse(optionsKey);
            const result = await gowmRef.current.loadFromGitHub(repo, parsedOptions);

            if (mountedRef.current) {
                setBridge(result);
                setMetadata(result.getMetadata ? result.getMetadata() : null);
                setLoading(false);
            }
        } catch (err) {
            if (mountedRef.current) {
                setError(err);
                setLoading(false);
            }
        }
    }

    useEffect(() => {
        mountedRef.current = true;
        if (repo) {
            setLoading(true);
            setError(null);
            setBridge(null);
            setMetadata(null);
            loadModule();
        }
        return () => {
            mountedRef.current = false;
            if (gowmRef.current) {
                gowmRef.current.unloadAll();
            }
        };
    }, [repo, optionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

    return { bridge, loading, error, metadata, reload };
}

module.exports = { useWasm, useWasmFromGitHub };
