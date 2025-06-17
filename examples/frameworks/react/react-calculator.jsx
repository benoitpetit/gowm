/**
 * Exemple React avec GoWM
 * Démontre l'utilisation du hook useWasm pour intégrer WASM dans React
 */

import React, { useState, useCallback } from 'react';
import { useWasm } from '../hooks/useWasm';

// Composant principal de calculatrice
function WasmCalculator() {
    const { wasm, loading, error } = useWasm('/examples/math-wasm/main.wasm', {
        name: 'react-math'
    });

    const [num1, setNum1] = useState(10);
    const [num2, setNum2] = useState(5);
    const [operation, setOperation] = useState('add');
    const [result, setResult] = useState(null);
    const [history, setHistory] = useState([]);

    // Fonction pour effectuer un calcul
    const calculate = useCallback(async () => {
        if (!wasm) return;

        try {
            let calcResult;

            switch (operation) {
                case 'add':
                    calcResult = await wasm.callAsync('add', num1, num2);
                    break;
                case 'subtract':
                    calcResult = await wasm.callAsync('subtract', num1, num2);
                    break;
                case 'multiply':
                    calcResult = await wasm.callAsync('multiply', num1, num2);
                    break;
                case 'divide':
                    calcResult = await wasm.callAsync('divide', num1, num2);
                    break;
                case 'power':
                    calcResult = await wasm.callAsync('power', num1, num2);
                    break;
                default:
                    throw new Error('Opération non supportée');
            }

            setResult(calcResult);

            // Ajouter à l'historique
            const historyEntry = {
                id: Date.now(),
                operation: `${num1} ${getOperationSymbol(operation)} ${num2} = ${calcResult}`,
                timestamp: new Date().toLocaleTimeString()
            };
            setHistory(prev => [historyEntry, ...prev.slice(0, 9)]); // Garder 10 entrées max

        } catch (err) {
            console.error('Erreur de calcul:', err);
            setResult(`Erreur: ${err.message}`);
        }
    }, [wasm, num1, num2, operation]);

    // Calculer la factorielle
    const calculateFactorial = useCallback(async () => {
        if (!wasm) return;

        try {
            const factResult = await wasm.callAsync('factorial', num1);
            setResult(factResult);

            const historyEntry = {
                id: Date.now(),
                operation: `${num1}! = ${factResult}`,
                timestamp: new Date().toLocaleTimeString()
            };
            setHistory(prev => [historyEntry, ...prev.slice(0, 9)]);

        } catch (err) {
            console.error('Erreur factorielle:', err);
            setResult(`Erreur: ${err.message}`);
        }
    }, [wasm, num1]);

    // Obtenir le symbole de l'opération
    const getOperationSymbol = (op) => {
        const symbols = {
            add: '+',
            subtract: '-',
            multiply: '×',
            divide: '÷',
            power: '^'
        };
        return symbols[op] || op;
    };

    // Effacer l'historique
    const clearHistory = () => setHistory([]);

    // États de chargement et d'erreur
    if (loading) {
        return (
            <div className="calculator-container loading">
                <div className="loading-spinner"></div>
                <p>Chargement du module WASM...</p>
                <small>Compilation du module Go en cours...</small>
            </div>
        );
    }

    if (error) {
        return (
            <div className="calculator-container error">
                <h2>❌ Erreur de chargement</h2>
                <p>{error.message}</p>
                <div className="error-help">
                    <h4>Solutions possibles:</h4>
                    <ul>
                        <li>Vérifiez que Go est installé: <code>go version</code></li>
                        <li>Compilez le module: <code>cd examples/math-wasm && ./build.sh</code></li>
                        <li>Vérifiez que le serveur sert les fichiers .wasm</li>
                    </ul>
                </div>
            </div>
        );
    }

    return (
        <div className="calculator-container">
            <h1>🧮 Calculatrice WASM Go</h1>
            <p className="subtitle">Démonstration de GoWM avec React</p>

            <div className="calculator-body">
                {/* Inputs */}
                <div className="input-section">
                    <div className="input-group">
                        <label htmlFor="num1">Premier nombre:</label>
                        <input
                            id="num1"
                            type="number"
                            value={num1}
                            onChange={(e) => setNum1(parseFloat(e.target.value) || 0)}
                            className="number-input"
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="operation">Opération:</label>
                        <select
                            id="operation"
                            value={operation}
                            onChange={(e) => setOperation(e.target.value)}
                            className="operation-select"
                        >
                            <option value="add">Addition (+)</option>
                            <option value="subtract">Soustraction (-)</option>
                            <option value="multiply">Multiplication (×)</option>
                            <option value="divide">Division (÷)</option>
                            <option value="power">Puissance (^)</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label htmlFor="num2">Deuxième nombre:</label>
                        <input
                            id="num2"
                            type="number"
                            value={num2}
                            onChange={(e) => setNum2(parseFloat(e.target.value) || 0)}
                            className="number-input"
                        />
                    </div>
                </div>

                {/* Boutons */}
                <div className="button-section">
                    <button
                        onClick={calculate}
                        className="btn btn-primary"
                    >
                        Calculer {getOperationSymbol(operation)}
                    </button>

                    <button
                        onClick={calculateFactorial}
                        className="btn btn-secondary"
                    >
                        Factorielle de {num1}
                    </button>
                </div>

                {/* Résultat */}
                {result !== null && (
                    <div className="result-section">
                        <h3>Résultat:</h3>
                        <div className="result-display">
                            {result}
                        </div>
                    </div>
                )}

                {/* Historique */}
                {history.length > 0 && (
                    <div className="history-section">
                        <div className="history-header">
                            <h3>Historique</h3>
                            <button
                                onClick={clearHistory}
                                className="btn btn-small btn-outline"
                            >
                                Effacer
                            </button>
                        </div>
                        <div className="history-list">
                            {history.map(entry => (
                                <div key={entry.id} className="history-item">
                                    <span className="operation">{entry.operation}</span>
                                    <span className="timestamp">{entry.timestamp}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Informations sur le module */}
            <div className="module-info">
                <h4>🔍 Informations du module</h4>
                <div className="info-grid">
                    <div>Statut: <span className="status-ready">✅ Prêt</span></div>
                    <div>Fonctions: {wasm?.getAvailableFunctions?.()?.length || 'N/A'}</div>
                    <div>Type: WebAssembly Go</div>
                </div>
            </div>
        </div>
    );
}

// Styles CSS intégrés pour la démonstration
const styles = `
.calculator-container {
    max-width: 600px;
    margin: 20px auto;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.calculator-container.loading {
    text-align: center;
    padding: 40px;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.calculator-container.error {
    border-left: 4px solid #e74c3c;
    background: #fdf2f2;
}

.error-help {
    margin-top: 20px;
    padding: 15px;
    background: white;
    border-radius: 8px;
}

.subtitle {
    color: #666;
    margin-bottom: 30px;
}

.input-section {
    display: grid;
    gap: 15px;
    margin-bottom: 20px;
}

.input-group {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.input-group label {
    font-weight: 500;
    color: #333;
}

.number-input, .operation-select {
    padding: 10px;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 16px;
    transition: border-color 0.3s;
}

.number-input:focus, .operation-select:focus {
    outline: none;
    border-color: #3498db;
}

.button-section {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    flex-wrap: wrap;
}

.btn {
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;
}

.btn-primary {
    background: #3498db;
    color: white;
}

.btn-primary:hover {
    background: #2980b9;
}

.btn-secondary {
    background: #95a5a6;
    color: white;
}

.btn-secondary:hover {
    background: #7f8c8d;
}

.btn-small {
    padding: 6px 12px;
    font-size: 14px;
}

.btn-outline {
    background: transparent;
    border: 1px solid #ddd;
    color: #666;
}

.result-section {
    margin-bottom: 20px;
}

.result-display {
    font-size: 24px;
    font-weight: bold;
    color: #2c3e50;
    padding: 15px;
    background: #ecf0f1;
    border-radius: 8px;
    text-align: center;
}

.history-section {
    margin-bottom: 20px;
}

.history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.history-list {
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #ddd;
    border-radius: 8px;
}

.history-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    border-bottom: 1px solid #eee;
}

.history-item:last-child {
    border-bottom: none;
}

.operation {
    font-family: monospace;
    font-weight: 500;
}

.timestamp {
    color: #666;
    font-size: 12px;
}

.module-info {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    margin-top: 20px;
}

.info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px;
    margin-top: 10px;
}

.status-ready {
    color: #27ae60;
    font-weight: 500;
}

code {
    background: #f4f4f4;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
}

@media (max-width: 600px) {
    .calculator-container {
        margin: 10px;
        padding: 15px;
    }
    
    .button-section {
        flex-direction: column;
    }
    
    .info-grid {
        grid-template-columns: 1fr;
    }
}
`;

// Injecter les styles
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    document.head.appendChild(styleElement);
}

export default WasmCalculator;
