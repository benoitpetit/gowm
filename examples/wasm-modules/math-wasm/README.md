# Module WASM Math - Démonstration GoWM

Ce module WASM Go démontre l'utilisation de GoWM pour intégrer des fonctions mathématiques WebAssembly dans JavaScript.

## 🔧 Compilation

```bash
# Depuis ce dossier
./build.sh

# Ou depuis la racine du projet
npm run build:example
```

## 📋 Prérequis

- Go 1.21 ou plus récent
- Support WebAssembly (GOOS=js GOARCH=wasm)

## 🚀 Fonctions Disponibles

- `add(a, b)` - Addition de deux nombres
- `subtract(a, b)` - Soustraction de deux nombres  
- `multiply(a, b)` - Multiplication de deux nombres
- `divide(a, b)` - Division de deux nombres
- `power(base, exp)` - Calcul de puissance (exposants entiers positifs)
- `factorial(n)` - Calcul de factorielle
- `getAvailableFunctions()` - Liste des fonctions disponibles

## 📝 Utilisation avec GoWM

```javascript
const { load } = require('gowm');

async function example() {
  const math = await load('./examples/math-wasm/main.wasm');
  
  console.log('5 + 3 =', math.call('add', 5, 3));
  console.log('10 * 4 =', math.call('multiply', 10, 4));
  console.log('5! =', math.call('factorial', 5));
}
```

## 🏗️ Structure

- `main.go` - Code source Go avec les fonctions mathématiques
- `go.mod` - Fichier de module Go
- `build.sh` - Script de compilation
- `main.wasm` - Module compilé (généré)
- `wasm_exec.js` - Runtime Go (copié si disponible)
