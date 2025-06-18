# 📚 GoWM Examples

Clean, simple examples demonstrating GoWM integration with Go WebAssembly modules from the [wasm-projects](https://github.com/benoitpetit/wasm-projects) repository.

## 🗂️ Structure

```
examples/
├── README.md           # This documentation
├── node/              # Node.js Examples
│   ├── basic.js       # Math WASM module basics
│   └── crypto.js      # Crypto operations
├── browser/           # Browser Examples  
│   └── index.html     # QR code generator
├── react/             # React Integration
│   └── Calculator.jsx # Math calculator component
└── vue/               # Vue 3 Integration
    └── ImageProcessor.vue # Image processing component
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 14.0.0
- Modern browser with WebAssembly support
- For React/Vue: Framework dependencies

### Running Examples

**Node.js Examples:**
```bash
# Basic math operations
node examples/node/basic.js

# Crypto operations
node examples/node/crypto.js
```

**Browser Example:**
```bash
# Serve with any HTTP server
npx serve examples/browser/
# Open http://localhost:3000
```

**React Example:**
```bash
# In your React project
import Calculator from './examples/react/Calculator.jsx';
// Use <Calculator /> component
```

**Vue Example:**
```bash
# In your Vue 3 project
import ImageProcessor from './examples/vue/ImageProcessor.vue';
// Use <ImageProcessor /> component
```

## 📖 Examples Overview

### 🎯 Node.js Examples

#### `basic.js` - Math Operations
Demonstrates loading and using the math WASM module for arithmetic operations:
- Basic operations: add, subtract, multiply, divide
- Advanced operations: power, factorial
- Error handling for division by zero
- Module statistics and function listing

#### `crypto.js` - Cryptographic Operations
Shows cryptographic functions using the crypto WASM module:
- SHA256 hashing
- AES encryption/decryption with key generation
- UUID generation
- Proper error handling for crypto operations

### 🌐 Browser Example

#### `index.html` - QR Code Generator
Interactive QR code generator using the qr-wasm module:
- Text to QR code conversion
- Adjustable size and error correction levels
- Real-time preview and download functionality
- Clean, responsive UI with error handling

### ⚛️ React Integration

#### `Calculator.jsx` - Interactive Calculator
React component using the `useWasmFromGitHub` hook:
- Real-time calculations with math WASM module
- Loading states and error handling
- Dynamic function selection
- Modern component architecture with hooks

### 🖖 Vue 3 Integration

#### `ImageProcessor.vue` - Image Processing Tool
Vue 3 component with Composition API:
- Image upload and processing with image-wasm module
- Multiple operations: compress, resize, format conversion
- Before/after comparison with file size metrics
- Download processed images

## 🔧 WASM Modules Used

All examples use modules from [wasm-projects](https://github.com/benoitpetit/wasm-projects):

| Module | Repository Path | Functions |
|--------|----------------|-----------|
| **math-wasm** | `math-wasm/main.wasm` | add, subtract, multiply, divide, power, factorial |
| **crypto-wasm** | `crypto-wasm/main.wasm` | hashSHA256, encryptAES, decryptAES, generateAESKey, generateUUID |
| **qr-wasm** | `qr-wasm/main.wasm` | generateQRCode, with size and error correction options |
| **image-wasm** | `image-wasm/main.wasm` | compressJPEG, compressPNG, convertToWebP, resizeImage |

## 💡 Key Features Demonstrated

### GitHub Loading
All examples use `loadFromGitHub()` to load WASM modules directly from repositories:
```javascript
const wasm = await loadFromGitHub('benoitpetit/wasm-projects', {
    path: 'math-wasm',
    filename: 'main.wasm',
    name: 'math'
});
```

### Error Handling
Proper error handling patterns for WASM operations:
```javascript
const result = wasm.call('divide', 10, 0);
if (typeof result === 'string' && result.includes('Erreur')) {
    console.log('Division by zero handled:', result);
}
```

### Framework Integration
- **React**: Custom hooks with loading/error states
- **Vue 3**: Composition API with reactive WASM state
- **Browser**: ES6 modules with clean async/await patterns

### Performance Optimization
- Silent mode for production: `wasm.call('setSilentMode', true)`
- Module statistics: `wasm.getStats()`
- Memory usage monitoring

## 🎨 Design Principles

### Simplicity
- Minimal code, maximum clarity
- Essential features only
- Clean, readable structure

### Consistency
- Unified error handling patterns
- Consistent naming conventions
- Standardized UI/UX across examples

### Real-world Usage
- Practical use cases for each WASM module
- Production-ready error handling
- Modern JavaScript/framework patterns

## 🔍 Testing Examples

### Manual Testing
1. **Node.js**: Run scripts and verify console output
2. **Browser**: Test QR generation with different inputs
3. **React**: Verify calculator operations and error states
4. **Vue**: Test image processing with various file types

### Expected Behavior
- ✅ Modules load successfully from GitHub
- ✅ All WASM functions execute correctly
- ✅ Error conditions are handled gracefully
- ✅ UI remains responsive during operations
- ✅ Results are accurate and properly formatted

## 🚨 Troubleshooting

**Common Issues:**

1. **CORS Errors**: Use HTTP server, not `file://` protocol
2. **Module Loading Fails**: Check internet connection and GitHub repository access
3. **WASM Execution Errors**: Verify function names and parameter types
4. **Framework Issues**: Ensure proper import paths and dependencies

**Debug Tips:**
- Check browser console for detailed error messages
- Verify WASM module availability at GitHub URLs
- Test with simple examples before complex ones

## 🤝 Contributing

When adding new examples:
1. Keep them simple and focused
2. Use consistent error handling patterns
3. Include comprehensive comments
4. Test across different environments
5. Update this README accordingly

## 📝 License

MIT License - Use these examples freely in your projects.
