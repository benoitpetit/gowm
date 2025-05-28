#!/bin/bash

set -e

echo "🔨 Compilation du module WASM Math..."

# Vérifier que Go est installé
if ! command -v go &> /dev/null; then
    echo "❌ Go n'est pas installé ou n'est pas dans le PATH"
    exit 1
fi

echo "📍 Version de Go: $(go version)"

# Compiler le module WASM
echo "🚀 Compilation en cours..."
GOOS=js GOARCH=wasm go build \
    -ldflags="-s -w" \
    -o main.wasm \
    main.go

if [ $? -eq 0 ]; then
    echo "✅ Compilation réussie: main.wasm"
else
    echo "❌ Échec de la compilation"
    exit 1
fi

# Copier le runtime Go si nécessaire
GOROOT_WASM_EXEC="$(go env GOROOT)/lib/wasm/wasm_exec.js"
if [ -f "$GOROOT_WASM_EXEC" ]; then
    cp "$GOROOT_WASM_EXEC" .
    echo "📦 Runtime Go copié: wasm_exec.js"
else
    echo "⚠️  wasm_exec.js non trouvé dans GOROOT, utilisation du runtime inclus avec GoWM"
fi

echo "🎉 Build terminé!"
echo "📁 Fichiers générés:"
ls -la *.wasm *.js 2>/dev/null || echo "   - main.wasm"

echo ""
echo "💡 Pour tester: cd ../../ && npm run test:real"
