const { useState, useEffect } = require('react');
const { load, loadFromNPM } = require('../src/index');

function useWasm(wasmPath, options = {}) {
    const [wasm, setWasm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;

        async function loadWasm() {
            try {
                setLoading(true);
                setError(null);

                const bridge = await load(wasmPath, options);

                if (mounted) {
                    setWasm(bridge);
                }
            } catch (err) {
                if (mounted) {
                    setError(err);
                    setWasm(null);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        loadWasm();

        return () => {
            mounted = false;
        };
    }, [wasmPath, JSON.stringify(options)]);

    return { wasm, loading, error };
}

// Hook pour charger depuis NPM
function useWasmFromNPM(packageName, options = {}) {
    const [wasm, setWasm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let mounted = true;

        async function loadWasm() {
            try {
                setLoading(true);
                setError(null);

                const bridge = await loadFromNPM(packageName, options);

                if (mounted) {
                    setWasm(bridge);
                }
            } catch (err) {
                if (mounted) {
                    setError(err);
                    setWasm(null);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        loadWasm();

        return () => {
            mounted = false;
        };
    }, [packageName, JSON.stringify(options)]);

    return { wasm, loading, error };
}

// Hook pour charger depuis NPM
module.exports = {
    useWasm,
    useWasmFromNPM
};
