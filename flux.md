# GoWM Logical Flow

GoWM (Go WebAssembly Manager) is a powerful library designed to simplify the loading, management, and interaction with Go WebAssembly (WASM) modules in both Node.js and browser environments. It provides a unified interface for handling WASM modules from various sources, including local files, HTTP/HTTPS URLs, and GitHub repositories, along with robust memory management and a flexible bridging mechanism for JavaScript-WASM communication.

## Core Components

GoWM's architecture is built around three primary components:

1.  **`GoWM` (src/core/gowm.js)**: This is the central orchestrator. It provides the main API for users to load, retrieve, unload, and manage WASM modules. It delegates the actual loading process to the `UnifiedWasmLoader` and manages a collection of `UnifiedWasmBridge` instances for loaded modules.

2.  **`UnifiedWasmLoader` (src/loaders/unified-loader.js)**: This component is responsible for the intricate process of fetching and instantiating WASM modules from diverse sources. It handles source detection, Go runtime loading, WASM byte retrieval, and the WebAssembly instantiation process.

3.  **`UnifiedWasmBridge` (src/bridges/unified-bridge.js)**: This acts as the communication layer between JavaScript and the loaded WASM module. It provides methods to call WASM functions, manage data buffers for efficient transfer, register JavaScript callbacks callable from WASM, and retrieve module-specific statistics.

## High-Level Loading Process

The typical flow for loading a WASM module with GoWM is as follows:

1.  **User Initiation**: The user interacts with the `GoWM` instance, calling methods like `gowm.load()`, `gowm.loadFromGitHub()`, `gowm.loadFromUrl()`, or `gowm.loadFromFile()`.
2.  **Delegation to Loader**: The `GoWM` instance, upon receiving a load request, delegates the core loading logic to its internal `UnifiedWasmLoader` instance.
3.  **Module Instantiation & Bridging**: The `UnifiedWasmLoader` fetches and instantiates the WASM module. Once instantiated, a `UnifiedWasmBridge` is created for this module, providing the interface for future interactions.
4.  **Module Registration**: The `GoWM` instance then registers this new module (identified by a unique name) along with its `UnifiedWasmBridge` for later retrieval and management.

## Detailed `UnifiedWasmLoader` Flow

The `UnifiedWasmLoader` orchestrates the complex steps required to get a WASM module ready for use:

1.  **Environment Setup**:
    *   It first determines if it's running in a Node.js or browser environment to adapt its behavior (e.g., using `fs` for Node.js).
    *   It dynamically loads Node.js-specific modules (`fs`, `path`, `node-fetch`) if required, to avoid bundling issues in browser environments.

2.  **Go Runtime Loading (`wasm_exec.js`)**:
    *   Before instantiating any Go WASM module, the loader ensures that the Go WebAssembly runtime (`wasm_exec.js`) is loaded into the global scope. This script provides the `Go` class and the necessary `importObject` for WASM instantiation.
    *   It attempts to load `wasm_exec.js` from a default path or a custom path provided in options.

3.  **WASM Byte Fetching (`loadWasmBytes`)**:
    *   **Source Detection**: The loader intelligently detects the source type based on the input string:
        *   **GitHub Repository**: If the source matches a GitHub `owner/repo` format or a full GitHub URL, it parses the repository information and constructs a raw GitHub content URL. It includes a fallback strategy to try common WASM filenames (`main.wasm`, `index.wasm`, etc.) within the repository.
        *   **HTTP/HTTPS URL**: If the source is a valid HTTP/HTTPS URL, it uses the `fetch` API (or `node-fetch` in Node.js) to retrieve the WASM binary.
        *   **Local File (Node.js only)**: In a Node.js environment, if the source is a local file path, it uses Node.js's `fs.readFileSync` to read the WASM binary from the file system.
        *   **Relative URL (Browser)**: In a browser, any other source is treated as a relative URL and fetched via `fetch`.
    *   The fetched data is returned as an `ArrayBuffer` containing the WASM bytes.

4.  **Module Instantiation**:
    *   A new `globalThis.Go()` instance is created, which provides the `importObject` required by WebAssembly.
    *   `WebAssembly.instantiate(wasmBytes, go.importObject)` is called to compile and instantiate the WASM module. This links the Go runtime's imports (like `syscall/js`) with the WASM module.

5.  **Pre-initialization and Readiness Check**:
    *   By default (`preInit: true`), the loader immediately calls `go.run(result.instance)` to start the Go program within the WASM module in the background.
    *   It then enters a `waitForReady` loop, polling global flags (`__gowm_ready`, `Go._initialized`, `getAvailableFunctions`, etc.) to determine when the Go WASM module has fully initialized and its functions are ready to be called from JavaScript. This prevents race conditions and ensures the module is operational before the bridge is returned.

6.  **Module Storage**: The successfully loaded and initialized WASM module (including its `instance`, `Go` object, and `exports`) is stored internally in a `Map` using a generated or provided module ID.

## Detailed `UnifiedWasmBridge` Flow

The `UnifiedWasmBridge` provides the means for JavaScript to interact with the loaded WASM module:

1.  **Initialization**: The bridge is instantiated with the `wasmModule` object (containing the WASM instance, Go object, and exports) provided by the `UnifiedWasmLoader`. It also stores a `name` for the module and detects the environment (Node.js/Browser).

2.  **Function Invocation (`call`, `callAsync`)**:
    *   **`call(funcName, ...args)`**: This method allows synchronous execution of functions. It first checks if the function exists as an export of the WASM module (`module.exports[funcName]`). If not found there, it looks for a globally exposed JavaScript function (which is common for Go WASM, where Go functions are often exposed directly on `globalThis`).
    *   **`callAsync(funcName, ...args)`**: This is a wrapper around `call` that returns a Promise, allowing for asynchronous execution and handling of WASM functions that might return Promises themselves.

3.  **Memory Management (`createBuffer`, `allocateWasmMemory`, `freeBuffer`)**:
    *   **`createBuffer(data)`**: This crucial method prepares JavaScript data (strings, arrays, typed arrays) for transfer to WASM memory. It encodes strings to `Uint8Array` and converts arrays to `Float64Array` or `Uint8Array`.
    *   It then attempts to allocate memory within the WASM module using exported `malloc` or custom `__gowm_alloc` functions. If successful, it copies the data into the WASM module's memory buffer.
    *   **`allocateWasmMemory(size)` / `allocateGoMemory(size)`**: These internal methods handle the actual memory allocation within the WASM module's linear memory, attempting to use standard WASM allocation functions or Go-specific memory management.
    *   **`freeBuffer(ptr, size)`**: This method attempts to deallocate memory previously allocated by `createBuffer`, using `free` or `__gowm_free` functions if available. For Go WASM, it often relies on Go's garbage collector but provides a fallback for explicit freeing.

4.  **Callback Registration (`registerCallback`, `unregisterCallback`)**:
    *   **`registerCallback(name, callback)`**: This allows JavaScript functions to be registered by a `name`. These functions are then made available in the global scope (e.g., `globalThis.__gowm_callback_name` or `globalThis.name`), enabling the Go WASM module to call back into JavaScript.
    *   **`unregisterCallback(name)`**: Removes the registered callback from the global scope.

5.  **Module Information & Statistics**:
    *   **`getAvailableFunctions()`**: Returns a list of all functions that can be called on the WASM module, including both WASM exports and globally exposed Go functions.
    *   **`getStats()`**: Provides comprehensive statistics about the loaded module, including its name, readiness status, environment, available functions, registered callbacks, allocated buffers, and detailed memory usage.
    *   **`getMemoryUsage()`**: Breaks down memory usage into WASM memory, Go runtime memory, and memory used by explicitly allocated buffers.

## GoWM Module Management

Beyond loading, the `GoWM` instance provides a complete lifecycle management system for WASM modules:

*   **Retrieval (`get(name)`)**: Allows users to retrieve the `UnifiedWasmBridge` instance for a previously loaded module by its assigned name.
*   **Unloading (`unload(name)`, `unloadAll()`)**: These methods are crucial for resource management. They trigger the `cleanup()` method on the associated `UnifiedWasmBridge` to free allocated buffers and unregister callbacks. They also instruct the `UnifiedWasmLoader` to unload the module and attempt to exit the Go runtime, ensuring memory and other resources are released.
*   **Status & Statistics (`listModules()`, `getStats()`, `getTotalMemoryUsage()`)**: These methods provide real-time insights into the state of all loaded modules, their memory consumption, and overall system statistics.

## Environment Adaptation

GoWM is designed to be cross-platform, supporting both Node.js and browser environments. This is achieved through:

*   **Entry Points**: `src/index.js` serves as the Node.js entry point, while `src/browser.js` is optimized for browser environments. These files import the core `GoWM`, `UnifiedWasmLoader`, and `UnifiedWasmBridge` classes and adapt their exports and behaviors (e.g., `loadFromFile` is disabled in the browser, `fetch` is polyfilled in Node.js if needed).
*   **Conditional Logic**: Internal components like `UnifiedWasmLoader` use `typeof window === 'undefined'` checks to dynamically load Node.js-specific modules (`fs`, `path`) or use browser-specific APIs (`document.createElement('script')`).

## Logical Flow Diagram

```mermaid
%%{init: {'theme': 'dark'}}%%
graph TD
    A[User Application] --> B(GoWM Instance)
    B -- load(source, options) --> C(UnifiedWasmLoader)

    subgraph WASM Module Loading
        direction LR
        C -- Detect Source Type --> D{Source Type}
        D -- GitHub Repo --> E[Load from GitHub]
        D -- HTTP/HTTPS URL --> F[Load from HTTP]
        D -- Local File (Node.js) --> G[Load from File]
        D -- Relative URL (Browser) --> F
        E -- Build GitHub URL --> F
    end

    subgraph WASM Runtime
        direction TB
        F -- Fetch WASM Bytes --> H(WebAssembly.instantiate)
        G -- Read WASM Bytes --> H
        H -- Instantiates WASM Module --> I(UnifiedWasmBridge)
    end

    subgraph WASM Interaction
        direction LR
        I -- call(funcName, ...) --> J[WASM Module Exports / Global Go Functions]
        I -- createBuffer(data) --> K[WASM Memory Management]
        I -- registerCallback(name, func) --> L[Global JavaScript Callbacks]
    end

    J -- Returns Result --> I
    K -- Allocates/Frees Memory --> I
    L -- Callable from WASM --> J

    subgraph GoWM Core
        direction TB
        B -.-> C
        I -- Provides Interface --> B
        B -- get(name) --> I
        B -- unload(name) --> I
    end
