#!/bin/bash

set -e

echo "🖼️  Building Image Processing WASM module..."

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed or not in PATH"
    exit 1
fi

echo "📍 Go version: $(go version)"

# Initialize Go module if needed
if [ ! -f "go.sum" ]; then
    echo "📦 Installing dependencies..."
    go mod tidy
fi

# Compile WASM module
echo "🚀 Compiling..."
GOOS=js GOARCH=wasm go build \
    -ldflags="-s -w" \
    -o main.wasm \
    main.go

if [ $? -eq 0 ]; then
    echo "✅ Compilation successful: main.wasm"
else
    echo "❌ Compilation failed"
    exit 1
fi

# Copy Go runtime if necessary
GOROOT_WASM_EXEC="$(go env GOROOT)/lib/wasm/wasm_exec.js"
if [ -f "$GOROOT_WASM_EXEC" ]; then
    cp "$GOROOT_WASM_EXEC" .
    echo "📦 Go runtime copied: wasm_exec.js"
else
    echo "⚠️  wasm_exec.js not found in GOROOT, using runtime included with GoWM"
fi

echo "🎉 Build completed!"
echo "📁 Generated files:"
ls -la *.wasm *.js 2>/dev/null || echo "   - main.wasm"

echo ""
echo "💡 To test: cd ../../ && npm run test:image" 