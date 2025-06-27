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

- 🚀 **Loader System** - Intelligent loader for all source types (files, URLs, GitHub)
- 🔧 **Cross-Platform** - Full support for Node.js and browser environments
- 🎯 **Auto-Detection** - Automatically detects source type and optimal loading strategy
- 📦 **GitHub Direct Loading** - Load WASM modules directly from GitHub repositories
- 🏷️ **Version Control** - Support for branches, tags, and specific commits
- 🛡️ **Enhanced Error Handling** - Robust error handling with fallback strategies
- 🧹 **Smart Memory Management** - Advanced memory management and resource cleanup
- 📊 **Comprehensive Statistics** - Built-in monitoring, testing, and performance metrics
- 🔄 **Flexible API** - Both synchronous and asynchronous function calls
- 📝 **TypeScript Support** - Full TypeScript definitions included

### 🚀 Coming in v1.1.1
- ⚛️ **React Hooks** - useWasm hooks for seamless React integration
- 🖖 **Vue 3 Composables** - useWasm composables for Vue.js applications

## 📥 Installation

```bash
npm install gowm
# or
yarn add gowm
# or
pnpm add gowm
```

## 🚀 Quick Start

> **Note**: React hooks and Vue composables will be available in GoWM v1.1.1. Current version (1.1.0) provides core functionality only.

### Node.js Example

```javascript
const { load, loadFromGitHub, loadFromUrl } = require('gowm');

async function example() {
  try {
    // Load from GitHub repository (recommended)
    const math = await loadFromGitHub('benoitpetit/wasm-modules-repository', { 
      name: 'math',
      path: 'math-wasm',
      branch: 'master'
    });
    
    // Load from HTTP URL
    const remoteWasm = await loadFromUrl('https://example.com/module.wasm');
    
    // Load from local file
    const localWasm = await load('./math.wasm', { name: 'local-math' });
    
    // Auto-detection: GoWM automatically detects the source type
    const autoDetected1 = await load('owner/repo');                     // GitHub
    const autoDetected2 = await load('https://example.com/mod.wasm');   // HTTP
    const autoDetected3 = await load('./local.wasm');                   // File
    
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
    
    // Get comprehensive statistics
    const stats = math.getStats();
    console.log('Available functions:', stats.functions);
    console.log('Memory usage:', stats.memoryUsage);
    
    // Test module functionality
    const testResults = math.test();
    console.log('Module test results:', testResults);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

## 🔄 Loader System

GoWM v1.1.0 features a loader system that handles all source types with a single API:

### Auto-Detection
```javascript
const { load } = require('gowm');

// Automatically detects source type
await load('owner/repo');                        // → GitHub repository
await load('https://example.com/module.wasm');   // → HTTP URL  
await load('./local/module.wasm');               // → Local file
await load('/absolute/path/module.wasm');        // → Absolute path
```

### Specific Loading Methods
```javascript
const { loadFromFile, loadFromUrl, loadFromGitHub } = require('gowm');

// Explicit methods for specific sources
await loadFromFile('./module.wasm');             // Node.js only
await loadFromUrl('https://example.com/mod.wasm'); // HTTP/HTTPS
await loadFromGitHub('owner/repo', options);     // GitHub repository
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
    name: 'crypto-processor',
    timeout: 30000  // Custom timeout
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

#### `load(source, options)`

Universal loading function that auto-detects source type.

**Parameters:**
- `source` (string): Can be file path, HTTP URL, or GitHub repo
- `options` (object, optional):
  - `name` (string): Module identifier
  - `timeout` (number): Initialization timeout (default: 15000ms)
  - `preInit` (boolean): Pre-initialize module (default: true)
  - `goRuntimePath` (string): Custom path to wasm_exec.js

**Returns:** Promise<WasmBridge>

#### `loadFromGitHub(githubRepo, options)`

Loads a WASM module from a GitHub repository with automatic file resolution.

**Parameters:**
- `githubRepo` (string): GitHub repository ("owner/repo" or full GitHub URL)
- `options` (object, optional):
  - `name` (string): Module identifier (default: repository name)
  - `branch` (string): Git branch (default: 'main')
  - `tag` (string): Git tag (takes precedence over branch)
  - `path` (string): Path within repository (default: '')
  - `filename` (string): Specific filename (default: auto-detect)
  - `timeout` (number): Initialization timeout (default: 15000ms)
  - `goRuntimePath` (string): Custom path to wasm_exec.js
  - `preInit` (boolean): Pre-initialize the module (default: true)

**Returns:** Promise<WasmBridge>

#### `loadFromUrl(url, options)`

Loads a WASM module from HTTP/HTTPS URL.

**Parameters:**
- `url` (string): HTTP/HTTPS URL to WASM file
- `options` (object, optional): Same as `load()` options

**Returns:** Promise<WasmBridge>

#### `loadFromFile(filePath, options)`

Loads a WASM module from local file (Node.js only).

**Parameters:**
- `filePath` (string): Path to the .wasm file
- `options` (object, optional): Same as `load()` options

**Returns:** Promise<WasmBridge>

#### `get(name)`

Retrieves an already loaded module by name.

**Parameters:**
- `name` (string, optional): Module name (default: 'default')

**Returns:** UnifiedWasmBridge | null

### Enhanced Bridge Methods

The bridge provides comprehensive functionality:

#### `call(funcName, ...args)`

Calls a WASM function synchronously.

#### `callAsync(funcName, ...args)`

Calls a WASM function asynchronously.

#### `createBuffer(data)`

Creates a buffer for data transfer with enhanced type support.

**Supported Types:**
- `Float64Array`, `Float32Array`
- `Uint8Array`, `Uint16Array`, `Uint32Array`
- `Int8Array`, `Int16Array`, `Int32Array`
- `Array`, `string`

#### `test()`

Runs comprehensive tests on the module.

**Returns:** Object with test results:
```javascript
{
  functionCalls: boolean,
  memoryAllocation: boolean,
  callbacks: boolean,
  asyncCalls: boolean,
  errors: string[]
}
```

#### `getStats()`

Gets comprehensive module statistics.

**Returns:** Object with detailed statistics:
```javascript
{
  name: string,
  ready: boolean,
  environment: 'Node.js' | 'Browser',
  functions: string[],
  callbacks: string[],
  allocatedBuffers: number,
  memoryUsage: {
    total: number,
    wasm: number,
    go: number,
    buffers: number,
    buffersCount: number
  },
  supportedDataTypes: string[],
  loadedAt: string
}
```

### Utility Functions

- `listModules()`: List all loaded modules
- `getStats()`: Get statistics for all modules  
- `unload(name)`: Unload a specific module
- `unloadAll()`: Unload all modules
- `isLoaded(name)`: Check if a module is loaded
- `getTotalMemoryUsage()`: Get total memory usage
- `testAll()`: Test all loaded modules
- `getHelp()`: Get comprehensive help information

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

For browser environments, GoWM automatically optimizes for the browser:

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

### Global Usage
```html
<script src="path/to/gowm/src/browser.js"></script>
<script>
    GoWM.loadFromUrl('https://example.com/module.wasm');
</script>
```

## 🏗️ Architecture

GoWM v1.1.0 features a clean architecture:

```
src/
├── core/gowm.js              # Main GoWM class
├── loaders/loader.js         # Loading system  
├── bridges/bridge.js         # Bridge interface
├── legacy/                   # Legacy files (preserved)
├── index.js                  # Main entry point
└── browser.js                # Browser-optimized entry
```

### Key Improvements

- **Single Loader**: One loader handles all source types
- **Enhanced Bridge**: Advanced memory management and testing
- **Better Performance**: Optimized loading and initialization
- **Comprehensive Testing**: Built-in module testing capabilities
- **Detailed Statistics**: In-depth monitoring and metrics

## 📊 Examples

Check out the `/examples` directory for comprehensive examples:

- **Node.js examples**: Basic and advanced usage patterns
- **React examples**: Complete React applications with hooks
- **Vue examples**: Vue 3 application templates with composables
- **Browser examples**: Vanilla JavaScript implementations

### Running Examples

```bash
# Run basic Node.js example
npm run test:basic

# Run crypto example
npm run test:crypto

# Serve browser examples
npm run demo:serve
```

## 🔧 Development

### Testing Your Modules

```javascript
const gowm = require('gowm');

// Load and test a module
const module = await gowm.load('your-module.wasm');
const testResults = module.test();
console.log('Test results:', testResults);

// Get comprehensive statistics
const stats = gowm.getStats();
console.log('System stats:', stats);
```

### Custom Loading

```javascript
const { WasmLoader, WasmBridge } = require('gowm');

// Use components directly for advanced scenarios
const loader = new WasmLoader();
const module = await loader.loadModule('source');
const bridge = new WasmBridge(module);
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
