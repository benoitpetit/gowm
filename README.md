# GoWM - Go WebAssembly Manager

<div align="center">
  <img src="./logo.png" alt="GoWM Logo" width="200" />

  <p><strong>GoWM</strong> simplifies the integration of Go WebAssembly modules into your JavaScript projects with support for GitHub repositories, React hooks, and Vue composables.</p>

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
- 🎯 **Multiple APIs** - Singleton API and class-based approach

## 📥 Installation

```bash
npm install gowm
# or
yarn add gowm
# or
pnpm add gowm
```

## 🚀 Quick Start

### Basic Usage (Node.js)

```javascript
const { load, loadFromGitHub } = require('gowm');

async function example() {
  try {
    // Load from local file
    const localWasm = await load('./math.wasm', { name: 'math' });
    
    // Load directly from GitHub repository
    const githubWasm = await loadFromGitHub('awesome-org/wasm-math', { 
      name: 'github-math',
      branch: 'main' 
    });
    
    // Call functions
    const result = localWasm.call('add', 5, 3);
    console.log('5 + 3 =', result); // 8
    
    // Async calls
    const asyncResult = await githubWasm.callAsync('multiply', 4, 7);
    console.log('4 * 7 =', asyncResult); // 28
    
    // Check available functions
    if (localWasm.hasFunction('subtract')) {
      console.log('subtract function is available');
    }
    
    // Get module statistics
    const stats = localWasm.getStats();
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

function CalculatorComponent() {
  const { wasm, loading, error } = useWasmFromGitHub('myorg/wasm-calculator', {
    branch: 'stable',
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

  if (loading) return <div>Loading WASM module from GitHub...</div>;
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
    <div v-if="loading">Loading WASM module from GitHub...</div>
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
  name: 'CalculatorComponent',
  setup() {
    const { wasm, loading, error } = useWasmFromGitHub('company/math-wasm', {
      tag: 'v2.0.0',
      path: 'dist',
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
  // Basic loading - automatic file discovery
    const math = await loadFromGitHub('awesome-org/wasm-math');
    
  // Advanced loading with specific options
    const imageProcessor = await loadFromGitHub('image-corp/wasm-image', {
      branch: 'develop',        // Use develop branch
      path: 'dist',            // Look in dist folder
      filename: 'image.wasm',  // Specific filename
      name: 'image-processor'  // Module name
    });
    
    // Load from specific tag/release
    const stableVersion = await loadFromGitHub('company/wasm-lib', {
      tag: 'v1.2.0',           // Use specific tag
      name: 'stable'
    });
    
    // Load from full GitHub URL
    const fromUrl = await loadFromGitHub(
      'https://github.com/org/repo', 
      { filename: 'module.wasm' }
    );
}
```

### Automatic File Discovery

GoWM automatically searches for WASM files in common locations:

- **Root directory**: `main.wasm`, `index.wasm`, `{repo-name}.wasm`
- **Common folders**: `wasm/`, `dist/`, `build/`
- **GitHub releases**: Searches release assets for WASM files
- **Custom paths**: Respects your specified path and filename

## 📚 API Reference

### Core Functions

#### `load(wasmPath, options)`

Loads a WASM module from a local file or URL.

**Parameters:**
- `wasmPath` (string): Path to the .wasm file or URL
- `options` (object, optional):
  - `name` (string): Module identifier (default: 'default')
  - `goRuntimePath` (string): Custom path to wasm_exec.js
  - `preInit` (boolean): Pre-initialize the module (default: true)

**Returns:** Promise<WasmBridge>

#### `loadFromGitHub(githubRepo, options)`

Loads a WASM module from a GitHub repository with automatic file resolution.

**Parameters:**
- `githubRepo` (string): GitHub repository ("owner/repo" or full GitHub URL)
- `options` (object, optional):
  - `name` (string): Module name (default: repository name)
  - `branch` (string): Git branch (default: 'main')
  - `tag` (string): Git tag (takes precedence over branch)
  - `path` (string): Path within repository (default: '')
  - `filename` (string): Specific filename (default: auto-detect)
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

**Returns:** Object with statistics

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

Hook for loading WASM modules from GitHub.

```jsx
import { useWasmFromGitHub } from 'gowm/hooks/useWasm';

function MyComponent() {
  const { wasm, loading, error } = useWasmFromGitHub('org/repo', {
    branch: 'main',
    name: 'myModule'
  });
}
```

### `useMultipleWasmFromGitHub(githubRepos, options)`

Hook for loading multiple WASM modules from GitHub.

```jsx
import { useMultipleWasmFromGitHub } from 'gowm/hooks/useWasm';

function MyComponent() {
  const { modules, loading, errors, reload } = useMultipleWasmFromGitHub([
    { name: 'math', repo: 'org/math-wasm' },
    { name: 'image', repo: 'org/image-wasm', branch: 'dev' }
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

Composable for loading WASM modules from GitHub.

```vue
<script>
import { useWasmFromGitHub } from 'gowm/composables/useWasm';

export default {
  setup() {
    const { wasm, loading, error } = useWasmFromGitHub('org/repo', {
      tag: 'v1.0.0'
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
      { name: 'github', github: 'org/repo' }
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
            const wasm = await loadFromGitHub('org/wasm-module');
            const result = wasm.call('myFunction', 42);
            console.log(result);
        }
        
        init();
    </script>
</head>
<body>
    <h1>GoWM Browser Example</h1>
</body>
</html>
```

## 🔄 Migration from Deprecated Features

### NPM Package Loading (Deprecated)

**⚠️ IMPORTANT:** NPM package loading is deprecated and will be removed in future versions. Please migrate to GitHub repository loading for better reliability and performance.

**Old way (deprecated):**
```javascript
// ❌ Deprecated - will be removed
const math = await loadFromNPM('my-wasm-package');
```

**New way (recommended):**
```javascript
// ✅ Recommended approach
const math = await loadFromGitHub('myorg/my-wasm-package');
```

### Migration Benefits

- **Better reliability**: Direct access to source repositories
- **Version control**: Use specific branches, tags, or commits
- **Faster loading**: No NPM registry overhead
- **Always up-to-date**: Access latest releases immediately
- **Better caching**: Browser and CDN optimization

## 📊 Examples

Check out the `/examples` directory for comprehensive examples:

- **Node.js examples**: Basic and advanced usage
- **React examples**: Complete React applications
- **Vue examples**: Vue 3 application templates
- **Browser examples**: Vanilla JavaScript implementations
- **Framework examples**: Integration with popular frameworks

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/benoitpetit/gowm.git
cd gowm
npm install
npm test
```

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
