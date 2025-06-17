# GoWM Source Architecture

## Loader Files

### `loader.js` (Principal)
- **Role**: Main WASM loader used by `index.js`
- **Features**: 
  - Support for local files and HTTP URLs
  - Node.js and browser compatibility
  - Automatic node-fetch import for HTTP requests in Node.js
  - Module caching and cleanup
- **Usage**: Used by default in `index.js`

### `loader-browser.js` (Spécialisé)
- **Role**: Browser-specific optimized loader
- **Features**:
  - Lightweight version for browser environments
  - No Node.js dependencies
  - Optimized for web bundlers
- **Usage**: Can be used for browser-only builds

### `loader-safe.js` (Alternative)
- **Role**: Enhanced version with additional error handling
- **Features**:
  - Dynamic require loading to avoid bundling issues
  - Enhanced error checking and fallbacks
  - Better compatibility with various build systems
- **Usage**: Alternative for environments with strict security or bundling requirements

## Core Files

### `index.js`
- Main GoWM class with GitHub loading capabilities
- Uses `loader.js` by default

### `bridge.js` & `bridge-browser.js`
- WASM instance wrapper and Go communication bridge
- Browser-specific optimizations in `bridge-browser.js`

### `browser.js`
- Browser-specific utilities and optimizations

---

## File Usage

**Active files (used by package):**
- `index.js` ← imports `loader.js`
- `loader.js` (main)
- `loader-browser.js` (browser builds)
- `bridge.js` / `bridge-browser.js`

**Optional files:**
- `loader-safe.js` (alternative implementation) 