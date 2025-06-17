# GoWM - Go Wasm Manager

<div align="center">
  <img src="./logo.png" alt="GoWM Logo" width="200" />

  <p><strong>GoWM</strong> simplifies the integration of Go WebAssembly modules into your JavaScript projects.</p>
</div>

## ✨ Features

- 🚀 **Unified interface** for loading Go WASM modules
- 🔧 **Node.js and browser support** with automatic detection
- ⚛️ **Built-in React hooks** (`useWasm`, `useWasmFromGitHub`)
- 🖖 **Vue.js composables** for Vue 3 (`useWasm`, `useWasmFromGitHub`, `useMultipleWasm`)
- 📦 **GitHub repository loading** with automatic WASM file resolution
- 🏷️ **Branch and tag support** for precise version control
- 🛡️ **Robust error handling** and function detection
- 🧹 **Automatic memory management** and resource cleanup
- 📊 **Statistics and monitoring** for loaded modules
- 🔄 **Synchronous and asynchronous calls** with `call()` and `callAsync()`
- 🎯 **Singleton API** and GoWM class for different use cases

## 📥 Installation

```bash
npm install gowm
# or
yarn add gowm
```

## 🚀 Quick Start

### Node.js

```javascript
const { load, loadFromGitHub } = require('gowm');

async function example() {
  try {
    // Load a WASM module from local file
    const math = await load('./math.wasm', { name: 'math' });
    
    // Or load directly from GitHub repository
    const githubMath = await loadFromGitHub('awesome-org/wasm-math', { 
      name: 'github-math',
      branch: 'main' 
    });
    
    // Call functions
    const result = math.call('add', 5, 3);
    console.log('5 + 3 =', result);
    
    // Async call
    const asyncResult = await githubMath.callAsync('multiply', 4, 7);
    console.log('4 * 7 =', asyncResult);
    
    // Check if a function exists
    if (math.hasFunction('subtract')) {
      console.log('Function subtract is available');
    }
    
    // Get statistics
    const stats = math.getStats();
    console.log('Functions:', stats.functions);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

### React

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
        console.error('Calculation error:', err);
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

### Vue.js

```vue
<template>
  <div class="calculator">
    <div v-if="loading">Loading WASM module from GitHub...</div>
    <div v-else-if="error">Error: {{ error.message }}</div>
    <div v-else>
      <input v-model.number="num1" type="number" placeholder="First number" />
      <input v-model.number="num2" type="number" placeholder="Second number" />
      <button @click="calculate">Calculate {{ num1 }} + {{ num2 }}</button>
      <div v-if="result !== null">Result: {{ result }}</div>
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

### Loading from GitHub

```javascript
const { loadFromGitHub } = require('gowm');

async function useGitHubLibrary() {
  try {
    // Basic loading - tries common filenames automatically
    const math = await loadFromGitHub('awesome-org/wasm-math');
    
    // Advanced loading with options
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
    
    const result = math.call('add', 10, 20);
    console.log('Result:', result);
  } catch (error) {
    console.error('GitHub loading error:', error);
  }
}
```

## 📚 API Reference

### load(wasmPath, options)

Loads a WASM module from a local file.

**Parameters:**
- `wasmPath` (string): Path to the .wasm file
- `options` (object, optional):
  - `name` (string): Module name (default: 'default')
  - `goRuntimePath` (string): Custom path to wasm_exec.js
  - `preInit` (boolean): Pre-initialize the module (default: true)

**Returns:** Promise<WasmBridge>

### loadFromGitHub(githubRepo, options)

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

**Automatic resolution:** Tries multiple common locations:
- `main.wasm`, `index.wasm`, `{repo-name}.wasm`
- `wasm/`, `dist/`, `build/` directories
- GitHub releases (if available)

**Returns:** Promise<WasmBridge>

### get(name)

Retrieves an already loaded module by name.

**Parameters:**
- `name` (string, optional): Module name (default: 'default')

**Returns:** WasmBridge | null

### Utility Functions

- `listModules()`: List all loaded modules
- `getStats()`: Get statistics for all modules
- `unload(name)`: Unload a specific module
- `unloadAll()`: Unload all modules
- `isLoaded(name)`: Check if a module is loaded
- `getTotalMemoryUsage()`: Get total memory usage across all modules

### WasmBridge

Main interface for interacting with a loaded WASM module.

#### Methods

- `call(funcName, ...args)`: Synchronous call to a Go WASM function
- `callAsync(funcName, ...args)`: Asynchronous call (returns a Promise)
- `hasFunction(funcName)`: Check if a function exists in the module
- `getAvailableFunctions()`: Get list of available functions
- `registerCallback(name, callback)`: Register a JavaScript callback accessible from Go
- `unregisterCallback(name)`: Remove a JavaScript callback
- `createBuffer(data)`: Create a buffer for data transfer (Float64Array, Uint8Array, string)
- `getStats()`: Get module statistics (functions, callbacks, memory)

### Vue.js Composables

#### useWasm(wasmPath, options)

Vue 3 composable for loading and using a WASM module with reactivity.

**Parameters:**
- `wasmPath` (string|Ref<string>): Path to the .wasm file
- `options` (object|Ref<object>, optional): Loading options

**Returns:**
```javascript
{
  wasm: Ref<WasmBridge | null>,
  loading: Ref<boolean>,
  error: Ref<Error | null>,
  reload: () => void
}
```

#### useWasmFromGitHub(githubRepo, options)

Vue 3 composable for loading a WASM module from GitHub.

**Parameters:**
- `githubRepo` (string|Ref<string>): GitHub repository
- `options` (object|Ref<object>, optional): GitHub loading options

**Returns:** Same interface as `useWasm`

#### useMultipleWasm(modules)

Vue 3 composable for loading multiple WASM modules.

**Parameters:**
- `modules` (Array|Ref<Array>): Array of module configurations

**Configuration object:**
```javascript
{
  name: string,           // Required: Module name
  path?: string,          // Optional: Local file path
  github?: string,        // Optional: GitHub repository
  options?: LoadOptions   // Optional: Loading options
}
```

#### useMultipleWasmFromGitHub(githubRepos)

Vue 3 composable for loading multiple WASM modules from GitHub repositories.

**Parameters:**
- `githubRepos` (Array|Ref<Array>): Array of GitHub repository configurations

**Configuration object:**
```javascript
{
  name: string,                    // Required: Module name
  repo: string,                    // Required: GitHub repository
  branch?: string,                 // Optional: Git branch
  tag?: string,                    // Optional: Git tag
  path?: string,                   // Optional: Path in repository
  filename?: string,               // Optional: Specific filename
  options?: GitHubLoadOptions      // Optional: Additional options
}
```

**Returns:**
```javascript
{
  modules: Ref<Record<string, WasmBridge>>,
  loading: Ref<boolean>,                    // Global loading state
  errors: Ref<Record<string, Error>>,       // Errors by module
  reload: () => void
}
```

### React Hooks

#### useWasm(wasmPath, options)

React hook for loading and using a WASM module.

**Parameters:**
- `wasmPath` (string): Path to the .wasm file
- `options` (object, optional): Loading options

**Returns:**
```javascript
{
  wasm: WasmBridge | null,
  loading: boolean,
  error: Error | null
}
```

#### useWasmFromGitHub(githubRepo, options)

React hook for loading a WASM module from GitHub.

**Parameters:**
- `githubRepo` (string): GitHub repository
- `options` (object, optional): GitHub loading options

**Returns:** Same interface as `useWasm`

#### useMultipleWasmFromGitHub(githubRepos, options)

React hook for loading multiple WASM modules from GitHub repositories.

**Parameters:**
- `githubRepos` (Array): Array of GitHub repository configurations
- `options` (object, optional): Global loading options

**Returns:**
```javascript
{
  modules: Record<string, WasmBridge>,
  loading: boolean,
  errors: Record<string, Error>,
  reload: () => void
}
```

## 🔧 Go Integration

### Basic Go Function Export

```go
package main

import (
    "syscall/js"
)

func add(this js.Value, p []js.Value) interface{} {
    if len(p) != 2 {
        return js.ValueOf("Error: two arguments required")
    }
    
    a := p[0].Float()
    b := p[1].Float()
    return js.ValueOf(a + b)
}

func multiply(this js.Value, p []js.Value) interface{} {
    if len(p) != 2 {
        return js.ValueOf("Error: two arguments required")
    }
    
    a := p[0].Float()
    b := p[1].Float()
    return js.ValueOf(a * b)
}

func main() {
    c := make(chan struct{}, 0)
    
    // Export functions to JavaScript
    js.Global().Set("add", js.FuncOf(add))
    js.Global().Set("multiply", js.FuncOf(multiply))
    
    // Signal readiness
    js.Global().Set("__gowm_ready", js.ValueOf(true))
    
    <-c
}
```

### Building and Publishing WASM

```bash
# Build WASM
GOOS=js GOARCH=wasm go build -o main.wasm main.go

# Create GitHub repository structure
mkdir my-wasm-lib
cd my-wasm-lib
cp main.wasm .
cp $(go env GOROOT)/misc/wasm/wasm_exec.js .

# Push to GitHub
git init
git add .
git commit -m "Initial WASM module"
git remote add origin https://github.com/username/my-wasm-lib.git
git push -u origin main

# Create a release (optional)
git tag v1.0.0
git push --tags
```

## 📁 Project Structure

```
examples/
├── math-wasm/           # Go math library example
├── image-wasm/          # Image processing example
├── basic-usage.js       # Basic Node.js usage
├── advanced-usage.js    # Advanced features demo
├── github-usage.js      # GitHub loading examples
├── react-calculator.jsx # React example
├── vue-calculator.vue   # Vue.js example
└── browser-demo.html    # Browser demo

src/
├── index.js            # Main entry point
├── loader.js           # WASM module loader
├── bridge.js           # WASM-JavaScript bridge
├── browser.js          # Browser-specific code
└── loader-browser.js   # Browser loader

composables/
└── useWasm.js          # Vue 3 composables

hooks/
└── useWasm.js          # React hooks

types/
└── index.d.ts          # TypeScript definitions
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific tests
npm run test:basic
npm run test:advanced
npm run test:wasm
npm run test:image

# Test GitHub loading
node examples/github-usage.js

# Build examples
npm run build:examples

# Start browser demo
npm run demo:browser
```

## ⚡ Performance Tips

- Use `preInit: true` for better performance (default)
- Reuse module instances when possible
- Clean up modules when done: `bridge.cleanup()`
- Monitor memory usage with `getTotalMemoryUsage()`
- Use specific branches/tags for stable versions
- Cache GitHub repositories locally when possible

## 🛠️ TypeScript Support

GoWM includes comprehensive TypeScript definitions:

- `LoadOptions`: Module loading options
- `GitHubLoadOptions`: GitHub-specific loading options
- `WasmBridge`: Main bridge interface
- `ModuleStats`: Statistics interface
- `UseWasmResult`: Hook return types
- `VueWasmResult`: Composable return types
- `GitHubRepoConfig`: GitHub repository configuration

### Error Handling

```javascript
try {
  const math = await loadFromGitHub('myorg/wasm-math');
  const result = math.call('add', 5, 3);
} catch (error) {
  console.error('WASM call error:', error.message);
}
```

## 🔄 Migration from NPM

The NPM loading system is now deprecated in favor of GitHub loading:

```javascript
// ❌ Old (deprecated)
const math = await loadFromNPM('my-wasm-math');

// ✅ New (recommended)
const math = await loadFromGitHub('myorg/wasm-math');
```

### Benefits of GitHub Loading

- ✅ **Direct repository access** - No NPM publishing required
- ✅ **Branch and tag support** - Use specific versions
- ✅ **Custom file paths** - Flexible repository structure
- ✅ **Release asset support** - Load from GitHub releases
- ✅ **Automatic file discovery** - Smart filename detection
- ✅ **Version control integration** - Direct Git integration

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests.

## 🔗 Links

- [GitHub Repository](https://github.com/benoitpetit/gowm)
- [NPM Package](https://www.npmjs.com/package/gowm)
- [Go WebAssembly Documentation](https://github.com/golang/go/wiki/WebAssembly)
