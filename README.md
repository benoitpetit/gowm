# GoWM - Go Wasm Manager

<div align="center">
  <img src="./logo.png" alt="GoWM Logo" width="200" />

  <p><strong>GoWM</strong> simplifies the integration of Go Wasm modules into your JavaScript projects</br> with seamless GitHub repository support, React hooks, and Vue composables.</p>

  <p>
    <a href="https://www.npmjs.com/package/gowm"><img src="https://img.shields.io/npm/v/gowm.svg" alt="npm version"></a>
    <a href="https://github.com/benoitpetit/gowm/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/gowm.svg" alt="license"></a>
    <a href="https://www.npmjs.com/package/gowm"><img src="https://img.shields.io/npm/dm/gowm.svg" alt="downloads"></a>
  </p>
</div>

## ✨ Features

- 🚀 **Unified Interface** - Load Go WASM modules from local files or GitHub repositories
- 🔧 **Cross-Platform** - Full support for Node.js and browser environments
- ⚛️ **React Integration** - Built-in hooks (`useWasm`, `useWasmFromGitHub`)
- 🖖 **Vue 3 Support** - Reactive composables with automatic cleanup
- 📦 **GitHub Direct Loading** - Load WASM modules directly from GitHub repositories
- 🏷️ **Version Control** - Support for branches, tags, and specific commits
- 🛡️ **Error Handling** - Robust error handling and automatic retries
- 🧹 **Memory Management** - Automatic resource cleanup and memory management
- 📊 **Module Statistics** - Built-in monitoring and performance metrics
- 🔄 **Flexible Calls** - Both synchronous and asynchronous function calls

## 📥 Installation

```bash
npm install gowm
# or
yarn add gowm
# or
pnpm add gowm
```

## 🚀 Quick Start

### Node.js Example

```javascript
const { load, loadFromGitHub } = require('gowm');

async function example() {
  try {
    // Load from GitHub repository (recommended)
    const math = await loadFromGitHub('benoitpetit/wasm-modules-repository', { 
      name: 'math',
      path: 'math-wasm',
      branch: 'master'
    });
    
    // Load from local file
    const localWasm = await load('./math.wasm', { name: 'local-math' });
    
    // Call functions
    const result = math.call('add', 5, 3);
    console.log('5 + 3 =', result); // 8
    
    // Async calls
    const asyncResult = await math.callAsync('multiply', 4, 7);
    console.log('4 * 7 =', asyncResult); // 28
    
    // Check available functions
    if (math.hasFunction('divide')) {
      console.log('divide function is available');
    }
    
    // Get module statistics
    const stats = math.getStats();
    console.log('Available functions:', stats.functions);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

### React Integration

```jsx
import React, { useState } from 'react';
import { useWasmFromGitHub } from 'gowm/hooks/useWasm';

function Calculator() {
  const { wasm, loading, error } = useWasmFromGitHub('benoitpetit/wasm-modules-repository', {
    path: 'math-wasm',
    branch: 'master',
    name: 'calculator'
  });
  
  const [result, setResult] = useState(null);

  const calculate = async () => {
    if (wasm) {
      try {
        const sum = await wasm.callAsync('add', 10, 20);
        setResult(sum);
      } catch (err) {
        console.error('Calculation failed:', err);
      }
    }
  };

  if (loading) return <div>Loading WASM module...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={calculate}>Calculate 10 + 20</button>
      {result !== null && <p>Result: {result}</p>}
    </div>
  );
}
```

### Vue 3 Integration

```vue
<template>
  <div class="calculator">
    <div v-if="loading">Loading WASM module...</div>
    <div v-else-if="error" class="error">Error: {{ error.message }}</div>
    <div v-else>
      <input v-model.number="num1" type="number" placeholder="First number" />
      <input v-model.number="num2" type="number" placeholder="Second number" />
      <button @click="calculate">Calculate {{ num1 }} + {{ num2 }}</button>
      <div v-if="result !== null" class="result">Result: {{ result }}</div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useWasmFromGitHub } from 'gowm/composables/useWasm';

export default {
  name: 'Calculator',
  setup() {
    const { wasm, loading, error } = useWasmFromGitHub('benoitpetit/wasm-modules-repository', {
      path: 'math-wasm',
      branch: 'master',
      name: 'math'
    });
    
    const num1 = ref(10);
    const num2 = ref(20);
    const result = ref(null);

    const calculate = async () => {
      if (wasm.value) {
        try {
          result.value = await wasm.value.callAsync('add', num1.value, num2.value);
        } catch (err) {
          console.error('Calculation error:', err);
        }
      }
    };

    return { wasm, loading, error, num1, num2, result, calculate };
  }
};
</script>
```

## 🐙 GitHub Repository Loading

GoWM excels at loading WASM modules directly from GitHub repositories with intelligent file discovery:

```javascript
const { loadFromGitHub } = require('gowm');

async function examples() {
  // Basic loading with automatic file discovery
  const math = await loadFromGitHub('benoitpetit/wasm-modules-repository', {
    path: 'math-wasm',
    branch: 'master'
  });
    
  // Advanced loading with specific options
  const crypto = await loadFromGitHub('benoitpetit/wasm-modules-repository', {
    path: 'crypto-wasm',
    filename: 'main.wasm',
    branch: 'master',
    name: 'crypto-processor'
  });
    
  // Load from full GitHub URL
  const image = await loadFromGitHub(
    'https://github.com/benoitpetit/wasm-modules-repository', 
    { 
      path: 'image-wasm',
      filename: 'main.wasm', 
      branch: 'master' 
    }
  );
}
```

### Automatic File Discovery

GoWM automatically searches for WASM files in these locations:

- **Root directory**: `main.wasm`, `index.wasm`, `{repo-name}.wasm`
- **Common folders**: `wasm/`, `dist/`, `build/`
- **GitHub releases**: Searches release assets for WASM files
- **Custom paths**: Respects your specified path and filename

## 📚 API Reference

### Core Functions

#### `loadFromGitHub(githubRepo, options)`

Loads a WASM module from a GitHub repository with automatic file resolution.

**Parameters:**
- `githubRepo` (string): GitHub repository ("owner/repo" or full GitHub URL)
- `options` (object, optional):
  - `name` (string): Module identifier (default: repository name)
  - `branch` (string): Git branch (default: 'master')
  - `tag` (string): Git tag (takes precedence over branch)
  - `path` (string): Path within repository (default: '')
  - `filename` (string): Specific filename (default: auto-detect)
  - `goRuntimePath` (string): Custom path to wasm_exec.js
  - `preInit` (boolean): Pre-initialize the module (default: true)

**Returns:** Promise<WasmBridge>

#### `load(wasmPath, options)`

Loads a WASM module from a local file or URL.

**Parameters:**
- `wasmPath` (string): Path to the .wasm file or URL
- `options` (object, optional):
  - `name` (string): Module identifier (default: 'default')
  - `goRuntimePath` (string): Custom path to wasm_exec.js
  - `preInit` (boolean): Pre-initialize the module (default: true)

**Returns:** Promise<WasmBridge>

#### `get(name)`

Retrieves an already loaded module by name.

**Parameters:**
- `name` (string, optional): Module name (default: 'default')

**Returns:** WasmBridge | null

### WasmBridge Methods

#### `call(funcName, ...args)`

Calls a WASM function synchronously.

**Parameters:**
- `funcName` (string): Name of the function to call
- `...args`: Function arguments

**Returns:** Function result

#### `callAsync(funcName, ...args)`

Calls a WASM function asynchronously.

**Parameters:**
- `funcName` (string): Name of the function to call
- `...args`: Function arguments

**Returns:** Promise<Function result>

#### `hasFunction(funcName)`

Checks if a function exists in the WASM module.

**Parameters:**
- `funcName` (string): Function name to check

**Returns:** boolean

#### `getAvailableFunctions()`

Gets a list of all available functions in the module.

**Returns:** string[]

#### `getStats()`

Gets module statistics and information.

**Returns:** Object with module statistics

#### `cleanup()`

Manually clean up module resources.

**Returns:** void

### Utility Functions

- `listModules()`: List all loaded modules
- `getStats()`: Get statistics for all modules
- `unload(name)`: Unload a specific module
- `unloadAll()`: Unload all modules
- `isLoaded(name)`: Check if a module is loaded
- `getTotalMemoryUsage()`: Get total memory usage

## ⚛️ React Hooks

### `useWasm(wasmPath, options)`

Hook for loading local WASM modules.

```jsx
import { useWasm } from 'gowm/hooks/useWasm';

function MyComponent() {
  const { wasm, loading, error } = useWasm('./my-module.wasm', {
    name: 'myModule'
  });

  // Use wasm when loaded
}
```

### `useWasmFromGitHub(githubRepo, options)`

Hook for loading WASM modules from GitHub repositories.

```jsx
import { useWasmFromGitHub } from 'gowm/hooks/useWasm';

function MyComponent() {
  const { wasm, loading, error } = useWasmFromGitHub('benoitpetit/wasm-modules-repository', {
    path: 'math-wasm',
    branch: 'master',
    name: 'myModule'
  });
}
```

### `useMultipleWasmFromGitHub(githubRepos, options)`

Hook for loading multiple WASM modules from GitHub repositories.

```jsx
import { useMultipleWasmFromGitHub } from 'gowm/hooks/useWasm';

function MyComponent() {
  const { modules, loading, errors, reload } = useMultipleWasmFromGitHub([
    { name: 'math', repo: 'benoitpetit/wasm-modules-repository', path: 'math-wasm' },
    { name: 'crypto', repo: 'benoitpetit/wasm-modules-repository', path: 'crypto-wasm', branch: 'master' }
  ]);
}
```

## 🖖 Vue 3 Composables

### `useWasm(wasmPath, options)`

Composable for loading local WASM modules.

```vue
<script>
import { useWasm } from 'gowm/composables/useWasm';

export default {
  setup() {
    const { wasm, loading, error, reload } = useWasm('./my-module.wasm');
    return { wasm, loading, error, reload };
  }
}
</script>
```

### `useWasmFromGitHub(githubRepo, options)`

Composable for loading WASM modules from GitHub repositories.

```vue
<script>
import { useWasmFromGitHub } from 'gowm/composables/useWasm';

export default {
  setup() {
    const { wasm, loading, error } = useWasmFromGitHub('benoitpetit/wasm-modules-repository', {
      path: 'math-wasm',
      branch: 'master'
    });
    return { wasm, loading, error };
  }
}
</script>
```

### `useMultipleWasm(modules)`

Composable for loading multiple WASM modules.

```vue
<script>
import { useMultipleWasm } from 'gowm/composables/useWasm';

export default {
  setup() {
    const { modules, loading, errors } = useMultipleWasm([
      { name: 'local', path: './local.wasm' },
      { name: 'github', github: 'benoitpetit/wasm-modules-repository', path: 'math-wasm' }
    ]);
    return { modules, loading, errors };
  }
}
</script>
```

## 🌐 Browser Usage

For browser environments, use the ES6 module version:

```html
<!DOCTYPE html>
<html>
<head>
    <script type="module">
        import { loadFromGitHub } from './node_modules/gowm/src/browser.js';
        
        async function init() {
            const wasm = await loadFromGitHub('benoitpetit/wasm-modules-repository', {
              path: 'math-wasm',
              branch: 'master'
            });
            const result = wasm.call('add', 21, 21);
            console.log('21 + 21 =', result); // 42
        }
        
        init();
    </script>
</head>
<body>
    <h1>GoWM Browser Example</h1>
</body>
</html>
```

## 📊 Examples

Check out the `/examples` directory for comprehensive examples:

- **Node.js examples**: Basic and advanced usage patterns
- **React examples**: Complete React applications with hooks
- **Vue examples**: Vue 3 application templates with composables
- **Browser examples**: Vanilla JavaScript implementations

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [NPM Package](https://www.npmjs.com/package/gowm)
- [GitHub Repository](https://github.com/benoitpetit/gowm)
- [Documentation](https://github.com/benoitpetit/gowm/blob/main/README.md)
- [Examples](https://github.com/benoitpetit/gowm/tree/main/examples)

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/benoitpetit">@devbyben</a></p>
  <p>⭐ Star us on GitHub if this project helped you!</p>
</div>
