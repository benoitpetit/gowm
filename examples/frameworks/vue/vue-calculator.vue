<template>
  <div class="vue-calculator">
    <!-- État de chargement -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <h2>Chargement du module WASM...</h2>
      <p>Compilation du module Go en cours...</p>
    </div>

    <!-- État d'erreur -->
    <div v-else-if="error" class="error-state">
      <h2>❌ Erreur de chargement</h2>
      <p>{{ error.message }}</p>
      <div class="error-help">
        <h4>Solutions possibles:</h4>
        <ul>
          <li>Vérifiez que Go est installé: <code>go version</code></li>
          <li>Compilez le module: <code>cd examples/math-wasm && ./build.sh</code></li>
          <li>Vérifiez que le serveur sert les fichiers .wasm</li>
        </ul>
      </div>
      <button @click="reload" class="btn btn-primary">
        🔄 Réessayer
      </button>
    </div>

    <!-- Interface principale -->
    <div v-else class="calculator-main">
      <header class="calculator-header">
        <h1>🧮 Calculatrice WASM Vue.js</h1>
        <p class="subtitle">Démonstration de GoWM avec Vue 3</p>
      </header>

      <div class="calculator-body">
        <!-- Section des entrées -->
        <div class="input-section">
          <div class="input-row">
            <div class="input-group">
              <label for="num1">Premier nombre:</label>
              <input
                id="num1"
                v-model.number="num1"
                type="number"
                class="number-input"
                @keyup.enter="calculate"
              />
            </div>

            <div class="input-group">
              <label for="operation">Opération:</label>
              <select
                id="operation"
                v-model="operation"
                class="operation-select"
              >
                <option value="add">Addition (+)</option>
                <option value="subtract">Soustraction (-)</option>
                <option value="multiply">Multiplication (×)</option>
                <option value="divide">Division (÷)</option>
                <option value="power">Puissance (^)</option>
              </select>
            </div>

            <div class="input-group">
              <label for="num2">Deuxième nombre:</label>
              <input
                id="num2"
                v-model.number="num2"
                type="number"
                class="number-input"
                @keyup.enter="calculate"
              />
            </div>
          </div>

          <!-- Boutons d'action -->
          <div class="button-section">
            <button @click="calculate" class="btn btn-primary btn-large">
              🧮 Calculer {{ getOperationSymbol(operation) }}
            </button>
            
            <button @click="calculateFactorial" class="btn btn-secondary">
              📊 Factorielle de {{ num1 }}
            </button>

            <button @click="calculateRandom" class="btn btn-accent">
              🎲 Calcul aléatoire
            </button>
          </div>
        </div>

        <!-- Résultat -->
        <div v-if="result !== null" class="result-section">
          <h3>Résultat:</h3>
          <div class="result-display" :class="{ error: isError }">
            {{ result }}
          </div>
          <div v-if="!isError" class="result-meta">
            <span>Calculé en {{ lastCalculationTime }}ms</span>
            <button @click="copyResult" class="btn btn-small btn-outline">
              📋 Copier
            </button>
          </div>
        </div>

        <!-- Calculs rapides -->
        <div class="quick-calculations">
          <h3>⚡ Calculs rapides</h3>
          <div class="quick-grid">
            <button
              v-for="quick in quickCalculations"
              :key="quick.label"
              @click="executeQuickCalculation(quick)"
              class="quick-btn"
            >
              {{ quick.label }}
            </button>
          </div>
        </div>

        <!-- Historique -->
        <div v-if="history.length > 0" class="history-section">
          <div class="history-header">
            <h3>📚 Historique</h3>
            <div class="history-actions">
              <button @click="exportHistory" class="btn btn-small btn-outline">
                💾 Exporter
              </button>
              <button @click="clearHistory" class="btn btn-small btn-outline">
                🗑️ Effacer
              </button>
            </div>
          </div>
          
          <div class="history-list">
            <div
              v-for="entry in history"
              :key="entry.id"
              class="history-item"
              @click="useHistoryEntry(entry)"
            >
              <div class="history-operation">{{ entry.operation }}</div>
              <div class="history-meta">
                <span class="timestamp">{{ entry.timestamp }}</span>
                <span class="duration">{{ entry.duration }}ms</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Statistiques du module -->
        <div class="module-stats">
          <h3>📊 Statistiques du module</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Statut:</span>
              <span class="stat-value status-ready">✅ Prêt</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Fonctions:</span>
              <span class="stat-value">{{ availableFunctions.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Calculs:</span>
              <span class="stat-value">{{ totalCalculations }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Temps moyen:</span>
              <span class="stat-value">{{ averageTime }}ms</span>
            </div>
          </div>
          
          <details class="function-list">
            <summary>🔧 Fonctions disponibles</summary>
            <div class="functions">
              <span
                v-for="func in availableFunctions"
                :key="func"
                class="function-tag"
              >
                {{ func }}
              </span>
            </div>
          </details>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useWasm } from '../composables/useWasm';

export default {
  name: 'VueWasmCalculator',
  setup() {
    // État de l'interface
    const num1 = ref(10);
    const num2 = ref(5);
    const operation = ref('add');
    const result = ref(null);
    const history = ref([]);
    const lastCalculationTime = ref(0);
    const totalCalculations = ref(0);
    const calculationTimes = ref([]);

    // Hook WASM
    const { wasm, loading, error, reload } = useWasm('/examples/math-wasm/main.wasm', {
      name: 'vue-math'
    });

    // Computed properties
    const isError = computed(() => {
      return typeof result.value === 'string' && result.value.includes('Erreur');
    });

    const availableFunctions = computed(() => {
      if (!wasm.value) return [];
      try {
        const functions = wasm.value.call('getAvailableFunctions');
        return Array.isArray(functions) ? functions : [];
      } catch {
        return ['add', 'subtract', 'multiply', 'divide', 'power', 'factorial'];
      }
    });

    const averageTime = computed(() => {
      if (calculationTimes.value.length === 0) return 0;
      const sum = calculationTimes.value.reduce((a, b) => a + b, 0);
      return (sum / calculationTimes.value.length).toFixed(1);
    });

    const quickCalculations = ref([
      { label: '10!', fn: 'factorial', args: [10] },
      { label: '2^8', fn: 'power', args: [2, 8] },
      { label: '42 × 24', fn: 'multiply', args: [42, 24] },
      { label: '100 ÷ 4', fn: 'divide', args: [100, 4] },
      { label: '15 + 27', fn: 'add', args: [15, 27] },
      { label: '50 - 18', fn: 'subtract', args: [50, 18] }
    ]);

    // Méthodes
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

    const performCalculation = async (funcName, ...args) => {
      if (!wasm.value) throw new Error('Module WASM non disponible');

      const start = performance.now();
      const calcResult = await wasm.value.callAsync(funcName, ...args);
      const duration = Math.round(performance.now() - start);

      lastCalculationTime.value = duration;
      calculationTimes.value.push(duration);
      totalCalculations.value++;

      // Garder seulement les 100 derniers temps
      if (calculationTimes.value.length > 100) {
        calculationTimes.value = calculationTimes.value.slice(-100);
      }

      return { result: calcResult, duration };
    };

    const addToHistory = (operation, result, duration) => {
      const historyEntry = {
        id: Date.now(),
        operation,
        result,
        duration,
        timestamp: new Date().toLocaleString()
      };
      
      history.value.unshift(historyEntry);
      
      // Garder seulement les 20 dernières entrées
      if (history.value.length > 20) {
        history.value = history.value.slice(0, 20);
      }
    };

    const calculate = async () => {
      try {
        const { result: calcResult, duration } = await performCalculation(
          operation.value,
          num1.value,
          num2.value
        );

        result.value = calcResult;
        
        const operationStr = `${num1.value} ${getOperationSymbol(operation.value)} ${num2.value} = ${calcResult}`;
        addToHistory(operationStr, calcResult, duration);

      } catch (err) {
        console.error('Erreur de calcul:', err);
        result.value = `Erreur: ${err.message}`;
      }
    };

    const calculateFactorial = async () => {
      try {
        const { result: factResult, duration } = await performCalculation('factorial', num1.value);
        
        result.value = factResult;
        
        const operationStr = `${num1.value}! = ${factResult}`;
        addToHistory(operationStr, factResult, duration);

      } catch (err) {
        console.error('Erreur factorielle:', err);
        result.value = `Erreur: ${err.message}`;
      }
    };

    const calculateRandom = async () => {
      const randomNum1 = Math.floor(Math.random() * 100) + 1;
      const randomNum2 = Math.floor(Math.random() * 20) + 1;
      const operations = ['add', 'subtract', 'multiply', 'divide'];
      const randomOp = operations[Math.floor(Math.random() * operations.length)];

      num1.value = randomNum1;
      num2.value = randomNum2;
      operation.value = randomOp;

      await calculate();
    };

    const executeQuickCalculation = async (quick) => {
      try {
        const { result: calcResult, duration } = await performCalculation(quick.fn, ...quick.args);
        
        result.value = calcResult;
        addToHistory(quick.label + ' = ' + calcResult, calcResult, duration);

      } catch (err) {
        console.error('Erreur calcul rapide:', err);
        result.value = `Erreur: ${err.message}`;
      }
    };

    const useHistoryEntry = (entry) => {
      // Extraire les valeurs de l'entrée d'historique si possible
      const match = entry.operation.match(/^(\d+(?:\.\d+)?)\s*([+\-×÷^])\s*(\d+(?:\.\d+)?)/);
      if (match) {
        num1.value = parseFloat(match[1]);
        num2.value = parseFloat(match[3]);
        
        const opMap = {
          '+': 'add',
          '-': 'subtract',
          '×': 'multiply',
          '÷': 'divide',
          '^': 'power'
        };
        operation.value = opMap[match[2]] || 'add';
      }
    };

    const copyResult = async () => {
      if (result.value && !isError.value) {
        try {
          await navigator.clipboard.writeText(result.value.toString());
          // Petit feedback visuel
          const resultEl = document.querySelector('.result-display');
          if (resultEl) {
            resultEl.style.background = '#d4edda';
            setTimeout(() => {
              resultEl.style.background = '';
            }, 500);
          }
        } catch (err) {
          console.error('Erreur copie:', err);
        }
      }
    };

    const clearHistory = () => {
      history.value = [];
    };

    const exportHistory = () => {
      const data = {
        exported: new Date().toISOString(),
        calculations: history.value,
        stats: {
          total: totalCalculations.value,
          averageTime: averageTime.value
        }
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `wasm-calculator-history-${Date.now()}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
    };

    // Watchers
    watch([num1, num2], () => {
      // Auto-validation des entrées
      if (num1.value < 0 && operation.value === 'factorial') {
        result.value = 'Attention: factorielle non définie pour les nombres négatifs';
      } else if (num2.value === 0 && operation.value === 'divide') {
        result.value = 'Attention: division par zéro';
      } else if (result.value && typeof result.value === 'string' && result.value.includes('Attention:')) {
        result.value = null;
      }
    });

    // Lifecycle
    onMounted(() => {
      // Charger l'historique depuis localStorage si disponible
      try {
        const saved = localStorage.getItem('wasm-calculator-history');
        if (saved) {
          history.value = JSON.parse(saved);
        }
      } catch (err) {
        console.warn('Impossible de charger l\'historique:', err);
      }
    });

    // Sauvegarder l'historique
    watch(history, (newHistory) => {
      try {
        localStorage.setItem('wasm-calculator-history', JSON.stringify(newHistory));
      } catch (err) {
        console.warn('Impossible de sauvegarder l\'historique:', err);
      }
    }, { deep: true });

    return {
      // État
      wasm,
      loading,
      error,
      num1,
      num2,
      operation,
      result,
      history,
      lastCalculationTime,
      totalCalculations,
      quickCalculations,

      // Computed
      isError,
      availableFunctions,
      averageTime,

      // Méthodes
      reload,
      getOperationSymbol,
      calculate,
      calculateFactorial,
      calculateRandom,
      executeQuickCalculation,
      useHistoryEntry,
      copyResult,
      clearHistory,
      exportHistory
    };
  }
};
</script>

<style scoped>
.vue-calculator {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

/* États de chargement et d'erreur */
.loading-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.loading-spinner {
  width: 50px;
  height: 50px;
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

.error-state {
  background: white;
  border-radius: 12px;
  padding: 30px;
  border-left: 4px solid #e74c3c;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.error-help {
  margin: 20px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

/* Interface principale */
.calculator-main {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.calculator-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px;
  text-align: center;
}

.calculator-header h1 {
  margin: 0 0 10px 0;
  font-size: 2.5em;
}

.subtitle {
  margin: 0;
  opacity: 0.9;
  font-size: 1.1em;
}

.calculator-body {
  padding: 30px;
}

/* Section des entrées */
.input-section {
  margin-bottom: 30px;
}

.input-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 20px;
  align-items: end;
  margin-bottom: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.9em;
}

.number-input, .operation-select {
  padding: 12px;
  border: 2px solid #e1e8ed;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s;
  background: white;
}

.number-input:focus, .operation-select:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.button-section {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

/* Boutons */
.btn {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-large {
  padding: 16px 24px;
  font-size: 16px;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover {
  background: #2980b9;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background: #7f8c8d;
}

.btn-accent {
  background: #e67e22;
  color: white;
}

.btn-accent:hover {
  background: #d35400;
}

.btn-outline {
  background: transparent;
  border: 1px solid #bdc3c7;
  color: #7f8c8d;
}

.btn-outline:hover {
  background: #ecf0f1;
  border-color: #95a5a6;
}

/* Résultat */
.result-section {
  margin: 30px 0;
  text-align: center;
}

.result-display {
  font-size: 2.5em;
  font-weight: bold;
  color: #2c3e50;
  padding: 20px;
  background: #ecf0f1;
  border-radius: 12px;
  margin: 15px 0;
  transition: all 0.3s;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
}

.result-display.error {
  background: #fadbd8;
  color: #c0392b;
  font-size: 1.5em;
}

.result-meta {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  color: #7f8c8d;
  font-size: 0.9em;
}

/* Calculs rapides */
.quick-calculations {
  margin: 30px 0;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  margin-top: 15px;
}

.quick-btn {
  padding: 10px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  font-family: monospace;
  font-weight: 500;
}

.quick-btn:hover {
  background: #e9ecef;
  border-color: #adb5bd;
  transform: translateY(-1px);
}

/* Historique */
.history-section {
  margin: 30px 0;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.history-actions {
  display: flex;
  gap: 8px;
}

.history-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background: white;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  border-bottom: 1px solid #f8f9fa;
  cursor: pointer;
  transition: background 0.3s;
}

.history-item:last-child {
  border-bottom: none;
}

.history-item:hover {
  background: #f8f9fa;
}

.history-operation {
  font-family: monospace;
  font-weight: 500;
  color: #2c3e50;
}

.history-meta {
  display: flex;
  flex-direction: column;
  align-items: end;
  gap: 2px;
  font-size: 0.8em;
  color: #7f8c8d;
}

/* Statistiques */
.module-stats {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-top: 30px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin: 15px 0;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-label {
  font-weight: 500;
  color: #5a6c7d;
}

.stat-value {
  font-weight: 600;
  color: #2c3e50;
}

.status-ready {
  color: #27ae60;
}

.function-list {
  margin-top: 15px;
}

.function-list summary {
  cursor: pointer;
  font-weight: 500;
  padding: 10px;
  background: white;
  border-radius: 6px;
  margin-bottom: 10px;
}

.functions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px;
}

.function-tag {
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  font-family: monospace;
}

/* Responsive */
@media (max-width: 768px) {
  .vue-calculator {
    margin: 10px;
    padding: 10px;
  }

  .calculator-header {
    padding: 20px;
  }

  .calculator-header h1 {
    font-size: 2em;
  }

  .calculator-body {
    padding: 20px;
  }

  .input-row {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .button-section {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }

  .result-display {
    font-size: 2em;
  }

  .quick-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .history-item {
    flex-direction: column;
    align-items: start;
    gap: 8px;
  }

  .history-actions {
    flex-direction: column;
    width: 100%;
  }

  .history-header {
    flex-direction: column;
    align-items: start;
    gap: 10px;
  }
}

code {
  background: #f4f4f4;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9em;
}
</style>
