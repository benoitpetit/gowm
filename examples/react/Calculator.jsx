/**
 * React Calculator Component using GoWM
 * 
 * Demonstrates React hooks integration with Go WebAssembly
 * math module for real-time calculations.
 */

import React, { useState } from 'react';
import { useWasmFromGitHub } from 'gowm/hooks/useWasm';

const Calculator = () => {
    const [num1, setNum1] = useState(10);
    const [num2, setNum2] = useState(5);
    const [operation, setOperation] = useState('add');
    const [result, setResult] = useState(null);

    // Load math WASM module from GitHub
    const { wasm, loading, error } = useWasmFromGitHub('benoitpetit/wasm-projects', {
        path: 'math-wasm',
        filename: 'main.wasm',
        name: 'math'
    });

    // Perform calculation
    const calculate = () => {
        if (!wasm) return;

        try {
            wasm.call('setSilentMode', true);
            const calculationResult = wasm.call(operation, num1, num2);
            
            if (typeof calculationResult === 'string' && calculationResult.includes('Erreur')) {
                setResult(`Error: ${calculationResult}`);
            } else {
                setResult(calculationResult);
            }
        } catch (err) {
            setResult(`Error: ${err.message}`);
        }
    };

    // Get available functions
    const getAvailableFunctions = () => {
        if (!wasm) return [];
        try {
            return wasm.call('getAvailableFunctions') || [];
        } catch {
            return ['add', 'subtract', 'multiply', 'divide', 'power', 'factorial'];
        }
    };

    const availableFunctions = getAvailableFunctions();

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>
                    <div style={styles.spinner}></div>
                    <p>Loading math WASM module...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.error}>
                    <h3>❌ Error Loading Module</h3>
                    <p>{error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>🧮 GoWM Calculator</h1>
            <p style={styles.subtitle}>React + Go WebAssembly Math Module</p>
            
            <div style={styles.calculator}>
                <div style={styles.inputGroup}>
                    <label style={styles.label}>First Number:</label>
                    <input
                        type="number"
                        value={num1}
                        onChange={(e) => setNum1(parseFloat(e.target.value) || 0)}
                        style={styles.input}
                    />
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Operation:</label>
                    <select
                        value={operation}
                        onChange={(e) => setOperation(e.target.value)}
                        style={styles.select}
                    >
                        {availableFunctions.map(func => (
                            <option key={func} value={func}>
                                {func.charAt(0).toUpperCase() + func.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={styles.inputGroup}>
                    <label style={styles.label}>Second Number:</label>
                    <input
                        type="number"
                        value={num2}
                        onChange={(e) => setNum2(parseFloat(e.target.value) || 0)}
                        style={styles.input}
                        disabled={operation === 'factorial'}
                    />
                </div>

                <button onClick={calculate} style={styles.button}>
                    Calculate
                </button>

                {result !== null && (
                    <div style={styles.result}>
                        <h3>Result:</h3>
                        <div style={styles.resultValue}>
                            {operation === 'factorial' ? `${num1}!` : `${num1} ${getOperatorSymbol(operation)} ${num2}`} = {result}
                        </div>
                    </div>
                )}

                {wasm && (
                    <div style={styles.info}>
                        <p><strong>Module:</strong> {wasm.getStats().name}</p>
                        <p><strong>Functions:</strong> {availableFunctions.length}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper function to get operator symbol
const getOperatorSymbol = (op) => {
    const symbols = {
        add: '+',
        subtract: '-',
        multiply: '×',
        divide: '÷',
        power: '^'
    };
    return symbols[op] || op;
};

// Styles
const styles = {
    container: {
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    title: {
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: '8px'
    },
    subtitle: {
        color: '#64748b',
        textAlign: 'center',
        marginBottom: '30px'
    },
    calculator: {
        background: 'white',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    },
    inputGroup: {
        marginBottom: '20px'
    },
    label: {
        display: 'block',
        marginBottom: '8px',
        fontWeight: '500',
        color: '#374151'
    },
    input: {
        width: '100%',
        padding: '12px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '16px',
        boxSizing: 'border-box'
    },
    select: {
        width: '100%',
        padding: '12px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '16px',
        boxSizing: 'border-box'
    },
    button: {
        width: '100%',
        background: '#3b82f6',
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '16px',
        cursor: 'pointer',
        marginBottom: '20px'
    },
    result: {
        background: '#f0fdf4',
        padding: '20px',
        borderRadius: '8px',
        textAlign: 'center',
        marginBottom: '20px'
    },
    resultValue: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#059669'
    },
    info: {
        background: '#f8fafc',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '14px',
        color: '#64748b'
    },
    loading: {
        textAlign: 'center',
        padding: '40px'
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '4px solid #f3f4f6',
        borderTop: '4px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 20px'
    },
    error: {
        background: '#fef2f2',
        color: '#ef4444',
        padding: '20px',
        borderRadius: '8px',
        textAlign: 'center'
    }
};

export default Calculator; 