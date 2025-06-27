# GoWM Node.js Examples

This directory contains Node.js examples demonstrating how to use various WASM modules with GoWM (Go Wasm Manager).

## Available Examples

### 1. Basic Math Operations (`basic.js`)
Demonstrates mathematical calculations using the `math-wasm` module.

**Features:**
- Basic arithmetic (add, subtract, multiply, divide)
- Advanced operations (power, factorial)
- Error handling for invalid operations
- Function discovery

**Usage:**
```bash
npm run node:basic
```

### 2. Cryptographic Operations (`crypto.js`)
Shows cryptographic functions using the `crypto-wasm` module.

**Features:**
- SHA256 hashing
- AES encryption/decryption
- RSA key generation
- JWT token operations
- BCrypt password hashing
- UUID generation

**Usage:**
```bash
npm run node:crypto
```

### 3. Advanced Text Processing (`text.js`)
Demonstrates advanced text processing and analysis using the `text-wasm` module.

**Features:**
- Text similarity analysis and Levenshtein distance
- String case conversions (camelCase, kebab-case, snake_case, slugify)
- Email and URL extraction from text
- Text analysis (word count, reading time estimation)
- Diacritics removal and phonetic matching (Soundex)
- Advanced text manipulation and processing

**Usage:**
```bash
npm run node:text
```

## Running All Examples

To run all Node.js examples in sequence:

```bash
npm run node:all
```

## Prerequisites

- Node.js (v14 or higher)
- Internet connection (for loading WASM modules from GitHub)

## Module Source

All WASM modules are loaded from the [wasm-modules-repository](https://github.com/benoitpetit/wasm-modules-repository) which contains optimized Go WASM modules for various operations:

- **math-wasm**: Mathematical calculations and operations
- **crypto-wasm**: Cryptographic functions (hashing, encryption, JWT, etc.)
- **text-wasm**: Advanced text processing and analysis

## Error Handling

Each example includes comprehensive error handling to demonstrate:
- Network connectivity issues
- Invalid parameters
- Module loading failures
- Function execution errors

## Performance Notes

- Modules are loaded once and cached for the session
- WASM execution is typically faster than equivalent JavaScript
- Network latency affects initial module loading time
- Subsequent function calls are optimized for performance

## Adding New Examples

To add a new example:

1. Create a new `.js` file in this directory
2. Follow the existing pattern for module loading and function calls
3. Add error handling and logging
4. Update the `package.json` scripts section
5. Document the new example in this README

## Troubleshooting

### Module Loading Issues
- Ensure internet connectivity
- Check GitHub repository availability
- Verify module names and paths

### Function Call Errors
- Check function names and parameters
- Review error messages in console output
- Ensure modules are fully loaded before calling functions

### Performance Issues
- Monitor network latency for module loading
- Check system resources during execution
- Consider module caching strategies
