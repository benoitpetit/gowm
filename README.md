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
- 🧹 **Smart Memory Management** - Safe memory allocation and resource cleanup
- 📊 **Comprehensive Statistics** - Built-in monitoring, testing, and performance metrics
- 🔄 **Flexible API** - Both synchronous and asynchronous function calls
- 📝 **TypeScript Support** - Full TypeScript definitions included
- ⚛️ **React Hooks** - `useWasm()` and `useWasmFromGitHub()` hooks
- 💚 **Vue Composables** - `useWasm()` and `useWasmFromGitHub()` composables
- 🔧 **CLI** - `npx gowm list|info|types|verify|install`
- 📡 **Event System** - `on()` / `off()` / `once()` / `on('module:loaded')`, `on('module:error')`, `on('memory:warning')` with chaining for module lifecycle events
- 🏗️ **Type Generator** - Generate TypeScript interfaces from `module.json`
- ⚛️ **React Hooks** - `import { useWasm } from 'gowm/react'` with auto-cleanup and reload
- 💚 **Vue 3 Composables** - `import { useWasm } from 'gowm/vue'` with reactive refs and watch
- 🔧 **CLI** - `npx gowm list|info|types|verify|install` for module discovery and management
- 🏗️ **Type Generator** - `generateTypes()` creates TypeScript interfaces from `module.json`
- 📦 **ESM Exports Map** - Sub-path exports `gowm/react`, `gowm/vue`, `gowm/tools/type-generator`
- 📋 **TypeScript Definitions** - Dedicated `types/react.d.ts` and `types/vue.d.ts`
- 📋 **Module Metadata** - Automatic `module.json` fetching from GitHub repositories
- 🔒 **SHA256 Integrity** - WASM file integrity verification via `.wasm.integrity` files (SRI format)
- 🎯 **readySignal Auto-Discovery** - Uses `gowmConfig.readySignal` from metadata instead of generic polling
- ✅ **Function Call Validation** - Parameter count validation, type warnings in debug mode
- 📖 **`describe()` Documentation** - Inline documentation for functions (`bridge.describe('add')`)
- 📊 **`getDetailedFunctions()`** - Rich function listing with parameters, types, examples
- 🗂️ **`getFunctionCategories()`** - Organized function categories from metadata
- 💾 **Multi-Level Cache** - Memory (L1) + disk/IndexedDB (L2) caching with configurable TTL
- 🔁 **Retry with Backoff** - Automatic retry with exponential backoff on network failures
- ⚡ **Streaming Instantiation** - `WebAssembly.instantiateStreaming()` for HTTP loads (compile during download)
- 🎯 **Promise-Based Readiness** - Callback-first signals with adaptive polling fallback
- 📦 **Compressed WASM** - Auto-detect and decompress `.wasm.gz` and `.wasm.br` files
- 🔒 **Module Namespace Isolation** - Each module gets its own namespace via `globalThis.__gowm_modules_`
- 🌿 **Auto Branch Detection** - GitHub default branch auto-detected via API
- 🔍 **Improved Source Detection** - Strict local path and GitHub URL detection
- 📝 **Configurable Logging** - Log levels with custom logger support
- 🛡️ **Safe Memory Allocation** - Removed unsafe offset-based fallback
- 🧪 **274 Unit Tests** - Extended coverage for all features

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
const { GoWM } = require("gowm");

async function example() {
  try {
    // Create a GoWM instance with configurable logging
    const gowm = new GoWM({ logLevel: "info" });

    // Load from GitHub repository (branch auto-detected)
    // module.json metadata fetched, SHA256 integrity verified
    const math = await gowm.loadFromGitHub(
      "benoitpetit/wasm-modules-repository",
      {
        name: "math",
        path: "math-wasm",
        retries: 3, // retry on network failure
        cache: { ttl: 3600000 }, // cache for 1 hour
        // metadata: true,      // auto-fetch module.json (default)
        // integrity: true,     // verify SHA256 hash (default)
        // validateCalls: true, // validate parameters (default)
      },
    );

    // Call functions (parameters validated against metadata)
    const result = math.call("add", 5, 3);
    console.log("5 + 3 =", result); // 8

    // Describe a function from module.json metadata
    const desc = gowm.describeFunction("math", "add");
    console.log(desc);
    // { name: 'add', description: '...', parameters: [...], returnType: '...' }

    // Get detailed function list with metadata
    const functions = math.getDetailedFunctions();
    console.log("Functions:", functions.length);

    // Get function categories
    const categories = math.getFunctionCategories();
    console.log("Categories:", Object.keys(categories));

    // Module metadata
    const metadata = gowm.getModuleMetadata("math");
    console.log(`${metadata.name} v${metadata.version}`);

    // Load from HTTP URL (uses streaming instantiation when possible)
    const remoteWasm = await gowm.loadFromUrl(
      "https://example.com/module.wasm",
    );

    // Load from local file
    const localWasm = await gowm.load("./math.wasm", { name: "local-math" });

    // Disable cache for a specific load
    const freshLoad = await gowm.load("./module.wasm", { cache: false });

    // Async calls
    const asyncResult = await math.callAsync("multiply", 4, 7);
    console.log("4 * 7 =", asyncResult); // 28

    // Check available functions
    if (math.hasFunction("divide")) {
      console.log("divide function is available");
    }

    // Get comprehensive statistics
    const stats = math.getStats();
    console.log("Available functions:", stats.functions);
    console.log("Memory usage:", stats.memoryUsage);

    // Clear the cache
    await gowm.clearCache();
  } catch (error) {
    console.error("Error:", error);
  }
}

example();
```

## 🔄 Loader System

GoWM features a loader system that handles all source types with a single API:

### Auto-Detection

```javascript
const { load } = require("gowm");

// Automatically detects source type
await load("owner/repo"); // → GitHub repository
await load("https://example.com/module.wasm"); // → HTTP URL
await load("./local/module.wasm"); // → Local file
await load("/absolute/path/module.wasm"); // → Absolute path
```

### Specific Loading Methods

```javascript
const { loadFromFile, loadFromUrl, loadFromGitHub } = require("gowm");

// Explicit methods for specific sources
await loadFromFile("./module.wasm"); // Node.js only
await loadFromUrl("https://example.com/mod.wasm"); // HTTP/HTTPS
await loadFromGitHub("owner/repo", options); // GitHub repository
```

## 🐙 GitHub Repository Loading

GoWM excels at loading WASM modules directly from GitHub repositories with intelligent file discovery and automatic default branch detection:

```javascript
const { GoWM } = require("gowm");
const gowm = new GoWM();

async function examples() {
  // Basic loading — branch auto-detected via GitHub API
  const math = await gowm.loadFromGitHub(
    "benoitpetit/wasm-modules-repository",
    {
      path: "math-wasm",
    },
  );

  // Advanced loading with specific options
  const crypto = await gowm.loadFromGitHub(
    "benoitpetit/wasm-modules-repository",
    {
      path: "crypto-wasm",
      filename: "main.wasm",
      name: "crypto-processor",
      timeout: 30000, // Custom timeout
    },
  );

  // Load from full GitHub URL
  const image = await gowm.loadFromGitHub(
    "https://github.com/benoitpetit/wasm-modules-repository",
    {
      path: "image-wasm",
      filename: "main.wasm",
    },
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
  - `branch` (string): Git branch (default: auto-detected via GitHub API)
  - `tag` (string): Git tag (takes precedence over branch)
  - `path` (string): Path within repository (default: '')
  - `filename` (string): Specific filename (default: auto-detect)
  - `timeout` (number): Initialization timeout (default: 15000ms)
  - `goRuntimePath` (string): Custom path to wasm_exec.js
  - `preInit` (boolean): Pre-initialize the module (default: true)
  - `metadata` (boolean): Fetch module.json metadata (default: true)
  - `integrity` (boolean): Verify SHA256 integrity (default: true)
  - `validateCalls` (boolean): Validate function parameters (default: true)

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

Calls a WASM function synchronously. Validates parameter count and types (debug mode) against module.json metadata.

#### `callAsync(funcName, ...args)`

Calls a WASM function asynchronously.

#### `describe(funcName)`

Returns inline documentation for a function from module.json metadata.

**Returns:** `{ name, description, category, parameters, returnType, example, errorPattern }` or `null`

#### `getDetailedFunctions()`

Returns all functions with their full metadata (parameters, types, descriptions).

**Returns:** `Array<{ name, description, category, parameters, returnType, example }>`

#### `getMetadata()`

Returns the raw module.json metadata object.

#### `getFunctionCategories()`

Returns function categories from metadata.

**Returns:** `{ [category: string]: string[] }` or `null`

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
- `getVersion()`: Get GoWM version string
- `clearCache()`: Clear all cached WASM bytes
- `getModuleMetadata(name)`: Get module.json metadata
- `describeFunction(moduleName, funcName)`: Describe a function from metadata
- `on(event, callback)`: Register event listener
- `off(event, callback)`: Remove event listener
- `once(event, callback)`: One-time event listener
- `generateTypes(metadata, options)`: Generate TypeScript types
- `generateTypesFromGitHub(repo, options)`: Generate types from GitHub

## 🌐 Browser Usage

For browser environments, GoWM automatically optimizes for the browser:

```html
<!DOCTYPE html>
<html>
  <head>
    <script type="module">
      import { loadFromGitHub } from "./node_modules/gowm/src/browser.js";

      async function init() {
        const wasm = await loadFromGitHub(
          "benoitpetit/wasm-modules-repository",
          {
            path: "math-wasm",
          },
        );
        const result = wasm.call("add", 21, 21);
        console.log("21 + 21 =", result); // 42
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
  GoWM.loadFromUrl("https://example.com/module.wasm");
</script>
```

## 📡 Event System

Monitor module lifecycle with event listeners:

```javascript
const gowm = new GoWM({ memoryWarningThreshold: 50 * 1024 * 1024 });

gowm
  .on("module:loading", ({ name, source }) => console.log(`Loading ${name}...`))
  .on("module:loaded", ({ name, loadTime }) =>
    console.log(`Loaded in ${loadTime}ms`),
  )
  .on("module:error", ({ name, error }) =>
    console.error(`Failed: ${error.message}`),
  )
  .on("module:unloaded", ({ name }) => console.log(`Unloaded ${name}`))
  .on("memory:warning", ({ totalMemory, threshold }) =>
    console.warn("Memory warning!"),
  );

// One-time listener
gowm.once("module:loaded", ({ name }) =>
  console.log(`First module loaded: ${name}`),
);

// Remove listener
const handler = (data) => console.log(data);
gowm.on("module:loaded", handler);
gowm.off("module:loaded", handler);
```

## ⚛️ React Hooks

```bash
npm install gowm react
```

```tsx
import { useWasm, useWasmFromGitHub } from "gowm/react";

function Calculator() {
  const { bridge, loading, error, reload } = useWasmFromGitHub(
    "benoitpetit/wasm-modules-repository",
    { path: "math-wasm" },
  );

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      <p>5 + 3 = {bridge.call("add", 5, 3)}</p>
      <button onClick={reload}>Reload</button>
    </div>
  );
}
```

## 💚 Vue 3 Composables

```bash
npm install gowm vue
```

```vue
<script setup>
import { useWasmFromGitHub } from "gowm/vue";

const { bridge, loading, error, metadata, reload } = useWasmFromGitHub(
  "benoitpetit/wasm-modules-repository",
  { path: "math-wasm" },
);
</script>

<template>
  <p v-if="loading">Loading...</p>
  <p v-else-if="error">Error: {{ error.message }}</p>
  <div v-else>
    <p>{{ metadata?.name }} v{{ metadata?.version }}</p>
    <p>5 + 3 = {{ bridge.call("add", 5, 3) }}</p>
    <button @click="reload">Reload</button>
  </div>
</template>
```

## 🔧 CLI

```bash
# List available modules in a repository
npx gowm list benoitpetit/wasm-modules-repository

# Get module info from module.json
npx gowm info benoitpetit/wasm-modules-repository math-wasm

# Generate TypeScript types from module.json
npx gowm types benoitpetit/wasm-modules-repository math-wasm --out math-wasm.d.ts

# Verify WASM file integrity
npx gowm verify ./main.wasm --integrity sha256-xxxxxxxxx

# Download a module (wasm + module.json + integrity)
npx gowm install benoitpetit/wasm-modules-repository math-wasm --dir ./wasm
```

## 🏗️ Type Generator

Generate TypeScript interfaces from `module.json`:

```javascript
const { generateTypes, generateTypesFromGitHub } = require("gowm");

// From a metadata object
const ts = generateTypes(metadata, { includeJSDoc: true });

// From GitHub
const ts = await generateTypesFromGitHub(
  "benoitpetit/wasm-modules-repository/math-wasm",
  { branch: "master" },
);
```

Generated output:

```typescript
import { WasmBridge } from "gowm";

/** math-wasm v0.2.0 - Mathematical functions */
export interface MathWasmBridge extends WasmBridge {
  /** Add two numbers */
  call(func: "add", a: number, b: number): number;
  /** Calculate factorial */
  call(func: "factorial", n: number): number;
  // ...
}
```

## 🏗️ Architecture

GoWM features a clean architecture:

```
src/
├── core/gowm.js              # Main GoWM class (events, logging)
├── loaders/unified-loader.js  # Universal loading system with metadata & integrity
├── bridges/unified-bridge.js  # Namespace-aware bridge with validation & describe()
├── react/index.js             # React hooks (useWasm, useWasmFromGitHub)
├── vue/index.js               # Vue 3 composables (useWasm, useWasmFromGitHub)
├── cli/gowm-cli.js            # CLI (list, info, types, verify, install)
├── tools/type-generator.js    # TypeScript type generation from module.json
├── index.js                   # Main entry point
└── browser.js                 # Browser-optimized entry
types/
├── index.d.ts                 # Core TypeScript definitions
├── react.d.ts                 # React hooks types
└── vue.d.ts                   # Vue composables types
```

## 📊 Examples

Check out the `/examples` directory for comprehensive examples:

- **Node.js examples**: Basic, crypto, text, and JSON/XML usage patterns
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

### Running Tests

```bash
# Run all unit tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run all tests (unit + integration + examples)
npm run test:all
```

### Testing Your Modules

```javascript
const { GoWM } = require("gowm");
const gowm = new GoWM({ logLevel: "debug" });

// Load and test a module
const module = await gowm.load("your-module.wasm");
const testResults = module.test();
console.log("Test results:", testResults);

// Get comprehensive statistics
const stats = gowm.getStats();
console.log("System stats:", stats);
```

### Custom Loading

```javascript
const { WasmLoader, WasmBridge } = require("gowm");

// Use components directly for advanced scenarios
const loader = new WasmLoader();
const module = await loader.loadModule("source");
const bridge = new WasmBridge(module, { moduleId: "my-module" });
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
