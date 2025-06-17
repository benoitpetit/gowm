<template>
  <div class="github-calculator">
    <header class="header">
      <h1>🧮 Vue GitHub WASM Calculator</h1>
      <p>Loading WASM modules directly from GitHub repositories</p>
    </header>

    <!-- Loading state -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <h2>Loading WASM modules from GitHub...</h2>
      <p>Fetching math operations from repository: {{ githubRepo }}</p>
      <div class="loading-details">
        <p>Branch: {{ options.branch || 'main' }}</p>
        <p v-if="options.path">Path: {{ options.path }}</p>
        <p v-if="options.tag">Tag: {{ options.tag }}</p>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="error-state">
      <h2>❌ Error loading WASM from GitHub</h2>
      <div class="error-details">
        <p><strong>Repository:</strong> {{ githubRepo }}</p>
        <p><strong>Error:</strong> {{ error.message }}</p>
        <button @click="reload" class="retry-button">🔄 Retry</button>
      </div>
    </div>

    <!-- Main calculator interface -->
    <div v-else class="calculator-main">
      <div class="module-info">
        <h3>📦 Loaded from GitHub</h3>
        <p><strong>Repository:</strong> {{ githubRepo }}</p>
        <p><strong>Branch/Tag:</strong> {{ options.branch || options.tag || 'main' }}</p>
        <p><strong>Functions available:</strong> {{ availableFunctions.join(', ') }}</p>
      </div>

      <div class="calculator-interface">
        <div class="input-section">
          <div class="input-group">
            <label>First Number:</label>
            <input 
              v-model.number="num1" 
              type="number" 
              placeholder="Enter first number"
              @keyup.enter="performCalculation"
            />
          </div>
          
          <div class="input-group">
            <label>Second Number:</label>
            <input 
              v-model.number="num2" 
              type="number" 
              placeholder="Enter second number"
              @keyup.enter="performCalculation"
            />
          </div>

          <div class="input-group">
            <label>Operation:</label>
            <select v-model="selectedOperation">
              <option value="add">➕ Addition</option>
              <option value="subtract">➖ Subtraction</option>
              <option value="multiply">✖️ Multiplication</option>
              <option value="divide">➗ Division</option>
              <option value="power" v-if="hasFunction('power')">🔢 Power</option>
            </select>
          </div>
        </div>

        <div class="button-section">
          <button 
            @click="performCalculation" 
            :disabled="!canCalculate"
            class="calculate-button"
          >
            🧮 Calculate {{ num1 }} {{ operationSymbol }} {{ num2 }}
          </button>
          
          <button 
            @click="performAsyncCalculation" 
            :disabled="!canCalculate"
            class="async-button"
          >
            ⚡ Async Calculate
          </button>
        </div>

        <div v-if="result !== null" class="result-section">
          <h3>Result:</h3>
          <div class="result-display">
            {{ num1 }} {{ operationSymbol }} {{ num2 }} = {{ result }}
          </div>
          <p class="calculation-info">
            {{ isAsync ? 'Async' : 'Sync' }} calculation completed in {{ calculationTime }}ms
          </p>
        </div>

        <!-- Advanced operations -->
        <div class="advanced-section">
          <h3>🔬 Advanced Operations</h3>
          
          <div class="advanced-operation">
            <label>Factorial of:</label>
            <input v-model.number="factorialInput" type="number" min="0" max="20" />
            <button @click="calculateFactorial" :disabled="!hasFunction('factorial')">
              Calculate {{ factorialInput }}!
            </button>
            <span v-if="factorialResult !== null">= {{ factorialResult }}</span>
          </div>
        </div>
      </div>

      <!-- Module statistics -->
      <div class="stats-section">
        <h3>📊 Module Statistics</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Ready:</span>
            <span class="stat-value">{{ moduleStats.ready ? '✅' : '❌' }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Functions:</span>
            <span class="stat-value">{{ moduleStats.functions?.length || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Memory Usage:</span>
            <span class="stat-value">{{ formatBytes(moduleStats.memoryUsage) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Callbacks:</span>
            <span class="stat-value">{{ moduleStats.callbacks?.length || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- Repository switcher -->
      <div class="repo-switcher">
        <h3>🔄 Switch Repository</h3>
        <div class="switcher-options">
          <button @click="switchRepo('stable-org/math-wasm', { tag: 'v1.0.0' })">
            📦 Stable v1.0.0
          </button>
          <button @click="switchRepo('beta-org/math-wasm', { branch: 'develop' })">
            🧪 Beta (develop)
          </button>
          <button @click="switchRepo('advanced-org/wasm-math', { path: 'dist' })">
            🚀 Advanced
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useWasmFromGitHub } from '../composables/useWasm';

export default {
  name: 'VueGitHubCalculator',
  setup() {
    // Reactive repository and options
    const githubRepo = ref('math-org/wasm-calculator');
    const options = ref({
      branch: 'main',
      name: 'github-math',
      path: 'dist'
    });

    // Use the GitHub WASM composable
    const { wasm, loading, error, reload } = useWasmFromGitHub(githubRepo, options);

    // Calculator state
    const num1 = ref(10);
    const num2 = ref(5);
    const selectedOperation = ref('add');
    const result = ref(null);
    const isAsync = ref(false);
    const calculationTime = ref(0);
    const factorialInput = ref(5);
    const factorialResult = ref(null);

    // Module information
    const availableFunctions = ref([]);
    const moduleStats = ref({});

    // Computed properties
    const operationSymbol = computed(() => {
      const symbols = {
        add: '+',
        subtract: '-',
        multiply: '×',
        divide: '÷',
        power: '^'
      };
      return symbols[selectedOperation.value] || '+';
    });

    const canCalculate = computed(() => {
      return wasm.value && 
             typeof num1.value === 'number' && 
             typeof num2.value === 'number' &&
             hasFunction(selectedOperation.value);
    });

    // Helper functions
    const hasFunction = (funcName) => {
      return wasm.value?.hasFunction(funcName) || false;
    };

    const formatBytes = (bytes) => {
      if (!bytes) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Calculation functions
    const performCalculation = async () => {
      if (!wasm.value || !canCalculate.value) return;

      try {
        const startTime = performance.now();
        
        let calcResult;
        if (selectedOperation.value === 'add') {
          calcResult = wasm.value.call('add', num1.value, num2.value);
        } else if (selectedOperation.value === 'subtract') {
          calcResult = wasm.value.call('subtract', num1.value, num2.value);
        } else if (selectedOperation.value === 'multiply') {
          calcResult = wasm.value.call('multiply', num1.value, num2.value);
        } else if (selectedOperation.value === 'divide') {
          calcResult = wasm.value.call('divide', num1.value, num2.value);
        } else if (selectedOperation.value === 'power') {
          calcResult = wasm.value.call('power', num1.value, num2.value);
        }

        const endTime = performance.now();
        
        result.value = calcResult;
        isAsync.value = false;
        calculationTime.value = Math.round(endTime - startTime);
        
        console.log(`✅ Calculation completed: ${num1.value} ${operationSymbol.value} ${num2.value} = ${calcResult}`);
      } catch (err) {
        console.error('❌ Calculation error:', err);
        result.value = `Error: ${err.message}`;
      }
    };

    const performAsyncCalculation = async () => {
      if (!wasm.value || !canCalculate.value) return;

      try {
        const startTime = performance.now();
        
        let calcResult;
        if (selectedOperation.value === 'add') {
          calcResult = await wasm.value.callAsync('add', num1.value, num2.value);
        } else if (selectedOperation.value === 'subtract') {
          calcResult = await wasm.value.callAsync('subtract', num1.value, num2.value);
        } else if (selectedOperation.value === 'multiply') {
          calcResult = await wasm.value.callAsync('multiply', num1.value, num2.value);
        } else if (selectedOperation.value === 'divide') {
          calcResult = await wasm.value.callAsync('divide', num1.value, num2.value);
        } else if (selectedOperation.value === 'power') {
          calcResult = await wasm.value.callAsync('power', num1.value, num2.value);
        }

        const endTime = performance.now();
        
        result.value = calcResult;
        isAsync.value = true;
        calculationTime.value = Math.round(endTime - startTime);
        
        console.log(`✅ Async calculation completed: ${num1.value} ${operationSymbol.value} ${num2.value} = ${calcResult}`);
      } catch (err) {
        console.error('❌ Async calculation error:', err);
        result.value = `Error: ${err.message}`;
      }
    };

    const calculateFactorial = async () => {
      if (!wasm.value || !hasFunction('factorial')) return;

      try {
        console.log(`🔄 Calculating factorial of ${factorialInput.value}`);
        const factResult = await wasm.value.callAsync('factorial', factorialInput.value);
        factorialResult.value = factResult;
        console.log(`✅ Factorial result: ${factorialInput.value}! = ${factResult}`);
      } catch (err) {
        console.error('❌ Factorial error:', err);
        factorialResult.value = `Error: ${err.message}`;
      }
    };

    // Repository switching
    const switchRepo = (newRepo, newOptions) => {
      console.log(`🔄 Switching to repository: ${newRepo}`);
      githubRepo.value = newRepo;
      options.value = { ...options.value, ...newOptions };
      result.value = null;
      factorialResult.value = null;
    };

    // Update module info when WASM loads
    const updateModuleInfo = () => {
      if (wasm.value) {
        try {
          availableFunctions.value = wasm.value.getAvailableFunctions();
          moduleStats.value = wasm.value.getStats();
          console.log('📊 Module info updated:', {
            functions: availableFunctions.value,
            stats: moduleStats.value
          });
        } catch (err) {
          console.warn('⚠️ Could not get module info:', err.message);
        }
      }
    };

    // Watch for WASM loading
    onMounted(() => {
      const unwatch = () => {
        if (wasm.value) {
          updateModuleInfo();
        }
      };
      
      // Check periodically if WASM is loaded
      const interval = setInterval(() => {
        if (wasm.value && !loading.value) {
          updateModuleInfo();
          clearInterval(interval);
        }
      }, 100);

      // Cleanup interval after 10 seconds
      setTimeout(() => clearInterval(interval), 10000);
    });

    return {
      // WASM state
      wasm,
      loading,
      error,
      reload,
      githubRepo,
      options,
      
      // Calculator state
      num1,
      num2,
      selectedOperation,
      result,
      isAsync,
      calculationTime,
      factorialInput,
      factorialResult,
      
      // Module info
      availableFunctions,
      moduleStats,
      
      // Computed
      operationSymbol,
      canCalculate,
      
      // Methods
      hasFunction,
      formatBytes,
      performCalculation,
      performAsyncCalculation,
      calculateFactorial,
      switchRepo
    };
  }
};
</script>

<style scoped>
.github-calculator {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
}

.header h1 {
  margin: 0 0 10px 0;
  font-size: 2em;
}

.header p {
  margin: 0;
  opacity: 0.9;
}

/* Loading states */
.loading-state, .error-state {
  text-align: center;
  padding: 40px;
  border-radius: 12px;
  margin: 20px 0;
}

.loading-state {
  background: #f8f9fa;
  border: 2px solid #e9ecef;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  background: #f8d7da;
  border: 2px solid #f5c6cb;
  color: #721c24;
}

.retry-button {
  background: #dc3545;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 10px;
}

.retry-button:hover {
  background: #c82333;
}

/* Main calculator */
.calculator-main {
  display: grid;
  gap: 20px;
}

.module-info {
  background: #e7f3ff;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #0066cc;
}

.calculator-interface {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.input-section {
  display: grid;
  gap: 15px;
  margin-bottom: 20px;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.input-group label {
  min-width: 120px;
  font-weight: 600;
}

.input-group input, .input-group select {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-size: 14px;
}

.input-group input:focus, .input-group select:focus {
  outline: none;
  border-color: #667eea;
}

.button-section {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.calculate-button, .async-button {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.calculate-button {
  background: #28a745;
  color: white;
}

.calculate-button:hover:not(:disabled) {
  background: #218838;
}

.async-button {
  background: #667eea;
  color: white;
}

.async-button:hover:not(:disabled) {
  background: #5a67d8;
}

.calculate-button:disabled, .async-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.result-section {
  background: #d4edda;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #28a745;
}

.result-display {
  font-size: 24px;
  font-weight: bold;
  color: #155724;
  margin: 10px 0;
}

.advanced-section {
  margin-top: 20px;
  padding: 15px;
  background: #fff3cd;
  border-radius: 8px;
  border-left: 4px solid #ffc107;
}

.advanced-operation {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.advanced-operation input {
  width: 80px;
  padding: 6px;
  border: 2px solid #e9ecef;
  border-radius: 4px;
}

.advanced-operation button {
  background: #ffc107;
  color: #212529;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.advanced-operation button:hover:not(:disabled) {
  background: #e0a800;
}

.advanced-operation button:disabled {
  background: #6c757d;
  color: white;
  cursor: not-allowed;
}

/* Statistics */
.stats-section {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: white;
  border-radius: 4px;
}

.stat-label {
  font-weight: 600;
}

.stat-value {
  font-family: 'Monaco', 'Menlo', monospace;
}

/* Repository switcher */
.repo-switcher {
  background: #e9ecef;
  padding: 15px;
  border-radius: 8px;
}

.switcher-options {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.switcher-options button {
  background: #6c757d;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.switcher-options button:hover {
  background: #5a6268;
}

@media (max-width: 768px) {
  .github-calculator {
    padding: 10px;
  }
  
  .button-section {
    flex-direction: column;
  }
  
  .switcher-options {
    flex-direction: column;
  }
  
  .advanced-operation {
    flex-direction: column;
    align-items: stretch;
  }
}
</style> 