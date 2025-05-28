# GoWM - Go WebAssembly Manager

![GoWM Logo](./logo.png)

**GoWM** simplifie l'intégration de modules WebAssembly écrits en Go dans vos projets JavaScript, que ce soit pour Node.js, React ou Vue.js.

## ✨ Fonctionnalités

- 🚀 **Interface unifiée** pour charger des modules WASM Go
- 🔧 **Support Node.js et navigateur** avec détection automatique
- ⚛️ **Hook React** intégré (`useWasm`, `useWasmFromNPM`)
- 🖖 **Composables Vue.js** pour Vue 3 (`useWasm`, `useWasmFromNPM`, `useMultipleWasm`)
- 📦 **Chargement depuis NPM** des packages WASM avec résolution automatique
- 🛡️ **Gestion d'erreurs robuste** et détection de fonctions
- 🧹 **Gestion automatique de la mémoire** et nettoyage des ressources
- 📊 **Statistiques et monitoring** des modules chargés
- 🔄 **Appels synchrones et asynchrones** avec `call()` et `callAsync()`
- 🎯 **API singleton** et classe GoWM pour différents usages

## 📥 Installation

```bash
npm install gowm
# ou
yarn add gowm
```

## 🚀 Utilisation Rapide

### Node.js

```javascript
const { load } = require('gowm');

async function example() {
  try {
    // Charger un module WASM
    const math = await load('./math.wasm', { name: 'math' });
    
    // Appeler des fonctions
    const result = math.call('add', 5, 3);
    console.log('5 + 3 =', result);
    
    // Appel asynchrone
    const asyncResult = await math.callAsync('multiply', 4, 7);
    console.log('4 * 7 =', asyncResult);
    
    // Vérifier si une fonction existe
    if (math.hasFunction('subtract')) {
      console.log('Function subtract is available');
    }
    
    // Obtenir les statistiques
    const stats = math.getStats();
    console.log('Functions:', stats.functions);
    
  } catch (error) {
    console.error('Erreur:', error);
  }
}

example();
```

### React

```jsx
import React, { useState } from 'react';
import { useWasm } from 'gowm/hooks/useWasm';

function CalculatorComponent() {
  const { wasm, loading, error } = useWasm('/math.wasm', { name: 'math' });
  const [result, setResult] = useState(null);

  const calculate = async () => {
    if (wasm) {
      try {
        const sum = await wasm.callAsync('add', 10, 20);
        setResult(sum);
      } catch (err) {
        console.error('Calculation error:', err);
      }
    }
  };

  if (loading) return <div>Chargement du module WASM...</div>;
  if (error) return <div>Erreur: {error.message}</div>;

  return (
    <div>
      <button onClick={calculate}>Calculer 10 + 20</button>
      {result !== null && <p>Résultat: {result}</p>}
    </div>
  );
}
```

### Vue.js

```vue
<template>
  <div class="calculator">
    <div v-if="loading">Chargement du module WASM...</div>
    <div v-else-if="error">Erreur: {{ error.message }}</div>
    <div v-else>
      <input v-model.number="num1" type="number" placeholder="Premier nombre" />
      <input v-model.number="num2" type="number" placeholder="Deuxième nombre" />
      <button @click="calculate">Calculer {{ num1 }} + {{ num2 }}</button>
      <div v-if="result !== null">Résultat: {{ result }}</div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useWasm } from 'gowm/composables/useWasm';

export default {
  name: 'CalculatorComponent',
  setup() {
    const { wasm, loading, error } = useWasm('/math.wasm', { name: 'math' });
    const num1 = ref(10);
    const num2 = ref(20);
    const result = ref(null);

    const calculate = async () => {
      if (wasm.value) {
        try {
          result.value = await wasm.value.callAsync('add', num1.value, num2.value);
        } catch (err) {
          console.error('Erreur de calcul:', err);
        }
      }
    };

    return { wasm, loading, error, num1, num2, result, calculate };
  }
};
</script>
```

### Chargement depuis NPM

```javascript
const { loadFromNPM } = require('gowm');

async function useLibrary() {
  try {
    // GoWM essaie automatiquement main.wasm, index.wasm, puis [package-name].wasm
    const math = await loadFromNPM('my-wasm-math');
    const result = math.call('add', 10, 20);
    console.log('Résultat:', result);
  } catch (error) {
    console.error('Erreur de chargement NPM:', error);
  }
}
```

## 📚 API Référence

### load(wasmPath, options)

Charge un module WASM depuis un fichier local.

**Paramètres:**
- `wasmPath` (string): Chemin vers le fichier .wasm
- `options` (object, optionnel):
  - `name` (string): Nom du module (par défaut: 'default')
  - `goRuntimePath` (string): Chemin personnalisé vers wasm_exec.js
  - `preInit` (boolean): Pré-initialiser le module (par défaut: true)

**Retour:** Promise<WasmBridge>

### loadFromNPM(packageName, options)

Charge un module WASM depuis un package NPM avec résolution automatique des fichiers.

**Paramètres:**
- `packageName` (string): Nom du package NPM
- `options` (object, optionnel): Mêmes options que `load()`

**Résolution automatique:** Essaie `main.wasm`, `index.wasm`, puis `[packageName].wasm`

**Retour:** Promise<WasmBridge>

### get(name)

Récupère un module déjà chargé par son nom.

**Paramètres:**
- `name` (string, optionnel): Nom du module (par défaut: 'default')

**Retour:** WasmBridge | null

### Fonctions utilitaires

- `listModules()`: Liste tous les modules chargés
- `getStats()`: Obtient les statistiques de tous les modules
- `unload(name)`: Décharge un module spécifique
- `unloadAll()`: Décharge tous les modules

### WasmBridge

Interface principale pour interagir avec un module WASM chargé.

#### Méthodes

- `call(funcName, ...args)`: Appel synchrone d'une fonction Go WASM
- `callAsync(funcName, ...args)`: Appel asynchrone d'une fonction (retourne une Promise)
- `hasFunction(funcName)`: Vérifier si une fonction existe dans le module
- `getAvailableFunctions()`: Obtenir la liste des fonctions disponibles
- `registerCallback(name, callback)`: Enregistrer un callback JavaScript accessible depuis Go
- `unregisterCallback(name)`: Supprimer un callback JavaScript
- `createBuffer(data)`: Créer un buffer pour transfert de données (Float64Array, Uint8Array, string)
- `getStats()`: Obtenir les statistiques du module (fonctions, callbacks, mémoire)

### Composables Vue.js

#### useWasm(wasmPath, options)

Composable Vue 3 pour charger et utiliser un module WASM avec réactivité.

**Paramètres:**
- `wasmPath` (string|Ref<string>): Chemin vers le fichier .wasm
- `options` (object|Ref<object>, optionnel): Options de chargement

**Retour:**
```javascript
{
  wasm: Ref<WasmBridge | null>,
  loading: Ref<boolean>,
  error: Ref<Error | null>,
  reload: () => void
}
```

#### useWasmFromNPM(packageName, options)

Composable Vue 3 pour charger un module WASM depuis NPM.

**Paramètres:**
- `packageName` (string|Ref<string>): Nom du package NPM
- `options` (object|Ref<object>, optionnel): Options de chargement

**Retour:** Même interface que `useWasm`

#### useMultipleWasm(modules)

Composable pour charger et gérer plusieurs modules WASM simultanément.

**Paramètres:**
- `modules` (Array|Ref<Array>): Tableau de configuration des modules

**Configuration d'un module:**
```javascript
{
  name?: string,        // Nom du module
  path?: string,        // Chemin local vers le fichier WASM
  package?: string,     // Nom du package NPM
  options?: LoadOptions // Options de chargement
}
```

**Retour:**
```javascript
{
  modules: Ref<Record<string, WasmBridge>>, // Modules chargés par nom
  loading: Ref<boolean>,                    // État de chargement global
  errors: Ref<Record<string, Error>>,       // Erreurs par module
  reload: () => void                        // Recharger tous les modules
}
```

**Exemple:**
```javascript
const { modules, loading, errors } = useMultipleWasm([
  { name: 'math', path: './math.wasm' },
  { name: 'utils', package: 'my-utils-wasm' }
]);
```

## 🔧 Création de Modules WASM Go Compatibles

### Structure Recommandée

```
my-wasm-lib/
├── main.go          # Code source Go
├── go.mod           # Module Go
├── build.sh         # Script de compilation
├── package.json     # Configuration NPM
└── README.md        # Documentation
```

### Code Go Optimisé

```go
//go:build js && wasm

package main

import (
    "syscall/js"
)

func add(this js.Value, args []js.Value) interface{} {
    if len(args) != 2 {
        return js.ValueOf("Erreur: deux arguments requis")
    }
    
    a := args[0].Float()
    b := args[1].Float()
    return js.ValueOf(a + b)
}

func multiply(this js.Value, args []js.Value) interface{} {
    if len(args) != 2 {
        return js.ValueOf("Erreur: deux arguments requis")
    }
    
    a := args[0].Float()
    b := args[1].Float()
    return js.ValueOf(a * b)
}

func main() {
    // Enregistrer les fonctions globalement
    js.Global().Set("add", js.FuncOf(add))
    js.Global().Set("multiply", js.FuncOf(multiply))
    
    // Signal de prêt pour GoWM (important pour la détection)
    js.Global().Set("__gowm_ready", js.ValueOf(true))
    
    // Maintenir le programme en vie
    select {}
}
```

### Script de Build

```bash
#!/bin/bash
# build.sh

set -e

echo "🔨 Compilation du module WASM..."

# Compilation optimisée pour la taille et les performances
GOOS=js GOARCH=wasm go build \
    -ldflags="-s -w" \
    -o main.wasm \
    main.go

echo "📦 Copie du runtime Go..."
cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" .

echo "✅ Build terminé!"
echo "📊 Taille du fichier WASM: $(du -h main.wasm | cut -f1)"
```

### Package.json pour Distribution

```json
{
  "name": "my-wasm-math",
  "version": "1.0.0",
  "description": "Bibliothèque mathématique en WebAssembly Go",
  "main": "main.wasm",
  "files": [
    "main.wasm",
    "wasm_exec.js",
    "README.md"
  ],
  "scripts": {
    "build": "./build.sh"
  },
  "keywords": ["wasm", "webassembly", "go", "math"],
  "peerDependencies": {
    "gowm": "^1.0.0"
  }
}
```

## 🧪 Tests et Exemples

Le dossier `examples/` contient des exemples complets d'utilisation.

### Tests disponibles

```bash
# Test basique Node.js
npm run test:basic

# Test avancé avec gestion d'erreurs
npm run test:advanced

# Tests complets des fonctionnalités WASM
npm run test:wasm

# Tests complets (tous les tests)
npm test
```

### Démo navigateur

```bash
# Démarrer un serveur local
npm run demo:serve

# Puis ouvrir http://localhost:3000/browser-demo.html
```

### Compiler l'exemple math-wasm

```bash
# Compiler le module d'exemple
npm run build:example
```

## 🤝 Support TypeScript

GoWM inclut des types TypeScript complets. Importez simplement:

```typescript
import { load, WasmBridge, LoadOptions, GoWM } from 'gowm';

// Exemple d'utilisation typée
async function example(): Promise<void> {
  const bridge: WasmBridge = await load('./math.wasm');
  const result: number = bridge.call('add', 10, 20);
  
  const stats = bridge.getStats();
  console.log('Functions:', stats.functions);
}
```

### Types disponibles

- `WasmBridge`: Interface principale pour les modules WASM
- `LoadOptions`: Options de chargement des modules
- `ModuleStats`: Statistiques des modules
- `BufferInfo`: Information sur les buffers mémoire
- `GoWM`: Classe principale pour la gestion avancée
- `UseWasmResult`: Résultat du hook React
- `VueWasmResult`: Résultat des composables Vue

## 📋 Prérequis

- **Node.js** >= 14.0.0
- **Navigateurs** modernes supportant WebAssembly
- **React** >= 16.8.0 (pour les hooks React, optionnel)
- **Vue.js** >= 3.0.0 (pour les composables Vue, optionnel)
- **Go** >= 1.21 (pour compiler vos propres modules WASM)

## 🔍 Débogage et Monitoring

### Obtenir des statistiques

```javascript
const bridge = await load('./module.wasm');
const stats = bridge.getStats();

console.log('Module prêt:', stats.ready);
console.log('Fonctions disponibles:', stats.functions);
console.log('Callbacks enregistrés:', stats.callbacks);
console.log('Utilisation mémoire:', stats.memoryUsage, 'bytes');
```

### Gestion d'erreurs

```javascript
try {
  const result = bridge.call('nonExistentFunction');
} catch (error) {
  console.error('Erreur d\'appel WASM:', error.message);
}

// Vérifier avant d'appeler
if (bridge.hasFunction('myFunction')) {
  const result = bridge.call('myFunction', args);
}
```

### Callbacks JavaScript

```javascript
// Enregistrer un callback accessible depuis Go
bridge.registerCallback('logMessage', (message) => {
  console.log('Message depuis Go:', message);
});

// Dans votre code Go :
// js.Global().Call("__gowm_callback_logMessage", "Hello from Go!")
```

## 📝 Licence

MIT - voir le fichier LICENSE pour plus de détails.

## 🤝 Contribution

Les contributions sont les bienvenues ! Voir CONTRIBUTING.md pour les guidelines.

## 📚 Ressources Supplémentaires

- **Documentation détaillée** : Voir `GETTING_STARTED.md`
- **Exemples pratiques** : Dossier `examples/`
- **Types TypeScript** : Dossier `types/`
- **Support React** : `hooks/useWasm.js`
- **Support Vue.js** : `composables/useWasm.js`

## 🆘 Support et Communauté

- **Issues GitHub** : Rapportez les bugs et demandes de fonctionnalités
- **Discussions** : Partagez vos expériences et posez des questions
- **Exemples** : Consultez les exemples pour des cas d'usage concrets

---

Créé avec ❤️ pour simplifier l'utilisation de WebAssembly Go dans JavaScript.
