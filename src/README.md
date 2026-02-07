# GoWM Source Code Structure

This directory contains the unified GoWM source code with a clean, organized structure.

## 📁 Directory Structure

```
src/
├── core/                    # Core GoWM implementation
│   └── gowm.js             # Main GoWM class
├── loaders/                 # Unified loader system
│   └── unified-loader.js   # Handles file, HTTP, and GitHub loading
├── bridges/                 # Unified bridge system
│   └── unified-bridge.js   # WASM-JavaScript interface
├── legacy/                  # Legacy files (for reference)
│   ├── loader.js           # Original Node.js loader
│   ├── loader-browser.js   # Original browser loader
│   ├── loader-safe.js      # Original safe loader
│   ├── bridge.js           # Original Node.js bridge
│   └── bridge-browser.js   # Original browser bridge
├── index.js                # Main entry point (CommonJS)
├── browser.js              # Browser-specific entry point
└── README.md               # This file
```

## 🚀 Key Features

### Unified Loader System

- **Single loader** that handles all source types:
  - Local files (Node.js only)
  - HTTP/HTTPS URLs
  - GitHub repositories
- **Auto-detection** of source type
- **Fallback strategies** for GitHub repos
- **Cross-platform compatibility**

### Unified Bridge System

- **Enhanced memory management**
- **Multiple data type support**
- **Callback registration**
- **Comprehensive testing utilities**
- **Detailed statistics and monitoring**

### Backward Compatibility

- All existing APIs remain functional
- Legacy class names are still available
- Existing code will continue to work without changes

## 📖 Usage Examples

### Basic Loading

```javascript
const gowm = require("gowm");

// Auto-detect source type
await gowm.load("path/to/module.wasm"); // Local file
await gowm.load("https://example.com/module.wasm"); // HTTP URL
await gowm.load("owner/repo"); // GitHub repo
```

### Specific Loading Methods

```javascript
// Local file (Node.js only)
await gowm.loadFromFile("./module.wasm");

// HTTP URL
await gowm.loadFromUrl("https://example.com/module.wasm");

// GitHub repository
await gowm.loadFromGitHub("owner/repo", {
  branch: "main",
  path: "dist",
  filename: "module.wasm",
});
```

### Advanced Usage

```javascript
const { GoWM, UnifiedWasmLoader, UnifiedWasmBridge } = require("gowm");

// Create custom instance
const customGoWM = new GoWM();

// Use loader directly
const loader = new UnifiedWasmLoader();
const module = await loader.loadModule("owner/repo");

// Use bridge directly
const bridge = new UnifiedWasmBridge(module);
```

## 🔧 Configuration Options

### Loading Options

- `name`: Module name (string)
- `branch`: Git branch for GitHub (string)
- `tag`: Git tag for GitHub (string)
- `path`: Path within repository (string)
- `filename`: Specific filename (string)
- `preInit`: Pre-initialize module (boolean, default: true)
- `timeout`: Initialization timeout (number, default: 15000ms)
- `goRuntimePath`: Custom Go runtime path (string)

### Example with Options

```javascript
await gowm.loadFromGitHub("owner/repo", {
  name: "my-module",
  branch: "develop",
  path: "build",
  filename: "custom.wasm",
  timeout: 30000,
});
```

## 📊 Statistics and Monitoring

### Get System Statistics

```javascript
const stats = gowm.getStats();
console.log("Total modules:", stats.totalModules);
console.log("Memory usage:", stats.totalMemoryUsage);
console.log("Environment:", stats.environment);
```

### Test All Modules

```javascript
const testResults = gowm.testAll();
console.log("Test results:", testResults);
```

### Memory Usage

```javascript
const memoryUsage = gowm.getTotalMemoryUsage();
console.log("Total memory:", memoryUsage, "bytes");
```

## 🌐 Browser Usage

### ES6 Modules

```javascript
import gowm from "gowm/src/browser.js";

await gowm.loadFromGitHub("owner/repo");
```

### Global Usage

```html
<script src="path/to/gowm/src/browser.js"></script>
<script>
  GoWM.loadFromUrl("https://example.com/module.wasm");
</script>
```

## 🔄 Migration from Legacy System

The unified system is fully backward compatible. No changes are required for existing code:

```javascript
// These continue to work as before
const gowm = require("gowm");
await gowm.load("module.wasm");
const bridge = gowm.get();
```

### Legacy Class Access

```javascript
// Still available for backward compatibility
const { WasmLoader, WasmBridge } = require("gowm");
// These are aliases to UnifiedWasmLoader and UnifiedWasmBridge
```

## 🛠️ Development

### Adding New Source Types

To add a new source type to the unified loader:

1. Add detection method to `UnifiedWasmLoader`
2. Add loading method for the source type
3. Update `loadWasmBytes` method to handle the new type

### Extending Bridge Functionality

To extend the bridge functionality:

1. Add new methods to `UnifiedWasmBridge`
2. Update statistics collection
3. Add tests to the `test()` method

## 📋 API Reference

### Main Methods

- `load(source, options)` - Load from any source
- `loadFromFile(path, options)` - Load from local file
- `loadFromUrl(url, options)` - Load from HTTP URL
- `loadFromGitHub(repo, options)` - Load from GitHub
- `get(name)` - Get loaded module bridge
- `unload(name)` - Unload module
- `unloadAll()` - Unload all modules
- `listModules()` - List loaded modules
- `getStats()` - Get system statistics
- `testAll()` - Test all modules

### Utility Methods

- `isLoaded(name)` - Check if module is loaded
- `getTotalMemoryUsage()` - Get total memory usage
- `getHelp()` - Get help information

## 🔍 Troubleshooting

### Common Issues

1. **Module not found in GitHub repo**
   - Check if the repo has WASM files
   - Try specifying exact path and filename
   - Check branch/tag name

2. **Memory allocation errors**
   - Check if WASM module has malloc/free functions
   - Verify buffer size limits
   - Monitor memory usage with `getStats()`

3. **Browser compatibility**
   - Ensure fetch API is available
   - Check CORS policy for external URLs
   - Use browser.js entry point for browser environments

### Debug Information

Enable debug logging by checking module statistics:

```javascript
const stats = gowm.getStats();
console.log("Debug info:", JSON.stringify(stats, null, 2));
```

## 📜 Version History

- **v1.1.2**: Current version — Full feature set (loader, bridge, events, CLI, React/Vue hooks, type generator)
- **v1.1.0**: Initial release — Loader and bridge system

## 🤝 Contributing

When contributing to the unified system:

1. Maintain backward compatibility
2. Add comprehensive tests
3. Update documentation
4. Follow the unified architecture pattern
