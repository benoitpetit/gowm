# 📚 GoWM Examples

This folder contains comprehensive examples of using GoWM to integrate Go WebAssembly modules in different JavaScript environments.

## 🗂️ Organized Structure

```
examples/
├── README.md                    # This documentation
│
├── 🎯 node/                    # Node.js Examples
│   ├── basic-usage.js          # Simple Node.js introduction
│   ├── advanced-usage.js       # Advanced Node.js features
│   └── github-usage.js         # Loading from GitHub
│
├── 🌐 browser/                 # Browser Examples
│   ├── browser-demo.html       # Standalone browser demo
│   └── assets/                 # Browser demo assets
│       └── styles.css
│
├── ⚛️ frameworks/              # Frontend Framework Examples
│   ├── react/
│   │   └── react-calculator.jsx
│   └── vue/
│       ├── vue-calculator.vue
│       └── vue-github-calculator.vue
│
├── 🧪 tests/                   # Automated Tests
│   ├── test-wasm.js           # Basic WASM tests
│   └── test-image-wasm.js     # Image processing tests
│
├── 🛠️ tools/                   # Utility Scripts
│   ├── convert-to-webp.js     # Image conversion utility
│   └── assets/                # Test assets
│       └── photo.png
│
└── 📦 wasm-modules/            # WASM Source Code
    ├── math-wasm/             # Mathematical functions
    │   ├── main.go
    │   ├── build.sh
    │   ├── main.wasm
    │   └── README.md
    └── image-wasm/            # Image processing
        ├── main.go
        ├── build.sh
        ├── main.wasm
        └── README.md
```

## 🚀 Quick Start

### 1. Build WASM Modules

```bash
# Build math module
cd examples/wasm-modules/math-wasm
./build.sh

# Build image processing module
cd ../image-wasm
./build.sh
```

### 2. Run Node.js Examples

```bash
# Basic usage
node examples/node/basic-usage.js

# Advanced features
node examples/node/advanced-usage.js

# GitHub loading
node examples/node/github-usage.js
```

### 3. Run Browser Demo

```bash
# Serve with any HTTP server
npx serve examples/browser/
# Open http://localhost:3000/browser-demo.html
```

### 4. Run Tests

```bash
# Run all tests
npm test

# Run specific tests
node examples/tests/test-wasm.js
node examples/tests/test-image-wasm.js
```

## 📖 Example Categories

### 🎯 Node.js Examples (`node/`)

Learn GoWM fundamentals in Node.js environment:

- **`basic-usage.js`** - Essential GoWM concepts and simple function calls
- **`advanced-usage.js`** - Multiple modules, performance monitoring, memory management
- **`github-usage.js`** - Loading WASM modules directly from GitHub repositories

### 🌐 Browser Examples (`browser/`)

Web browser integration and usage:

- **`browser-demo.html`** - Complete standalone browser demonstration
- Modern UI with responsive design
- No external dependencies required

### ⚛️ Framework Examples (`frameworks/`)

Integration with popular frontend frameworks:

**React** (`frameworks/react/`):
- Interactive calculator using `useWasm` hooks
- Real-time calculations with WASM backend
- Error handling and loading states

**Vue.js** (`frameworks/vue/`):
- Calculator with Vue 3 Composition API
- GitHub repository loading example
- Reactive state management with WASM

### 🧪 Tests (`tests/`)

Automated testing and validation:

- **`test-wasm.js`** - Core functionality validation
- **`test-image-wasm.js`** - Image processing pipeline tests
- Performance benchmarks
- Error handling verification

### 🛠️ Tools (`tools/`)

Utility scripts and practical applications:

- **`convert-to-webp.js`** - CLI tool for image format conversion
- Demonstrates real-world WASM usage
- Production-ready script example

### 📦 WASM Modules (`wasm-modules/`)

Source code for Go WebAssembly modules:

- **`math-wasm/`** - Mathematical operations (add, multiply, factorial, etc.)
- **`image-wasm/`** - Image processing (resize, compress, format conversion)
- Complete Go source code with build scripts
- Ready-to-use compiled WASM files

## 🔧 Technical Requirements

### Core Requirements
- **Node.js** >= 14.0.0
- **Go** >= 1.21 (for building WASM modules)
- **Modern browser** with WebAssembly support

### Framework-Specific
- **React** >= 16.8.0 (for hooks)
- **Vue.js** >= 3.0.0 (for Composition API)
- **Bundler** with WebAssembly support (Webpack, Vite, etc.)

## 📚 Learning Path

1. **Start with Node.js basics** (`node/basic-usage.js`)
2. **Explore advanced features** (`node/advanced-usage.js`)
3. **Try browser integration** (`browser/browser-demo.html`)
4. **Learn framework integration** (`frameworks/react/` or `frameworks/vue/`)
5. **Use GitHub loading** (`node/github-usage.js`)
6. **Build your own tools** (inspired by `tools/convert-to-webp.js`)

## 🤝 Contributing

When adding new examples:

1. Place in the appropriate category folder
2. Include comprehensive comments
3. Add error handling
4. Update this README
5. Test across different environments

## 🆘 Troubleshooting

**Common Issues:**

1. **WASM module not found**: Build modules first with `./build.sh`
2. **Go not installed**: Install Go from https://golang.org/
3. **Browser CORS errors**: Use a local HTTP server, not `file://`
4. **Module loading fails**: Check file paths and permissions

**Getting Help:**

- Check example comments for detailed explanations
- Review test files for usage patterns
- Consult the main project README
- Open an issue for bugs or questions
