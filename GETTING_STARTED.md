# 🚀 Instructions de démarrage GoWM

Ce guide vous aide à démarrer rapidement avec les exemples GoWM.

## ⚡ Démarrage en 3 minutes

### 1. Vérifiez les prérequis

```bash
# Vérifiez que Node.js est installé (>= 14.0.0)
node --version

# Vérifiez que Go est installé (>= 1.21)
go version
```

### 2. Compilez le module WASM d'exemple

```bash
# Depuis la racine du projet GoWM
npm run build:example

# Ou manuellement
cd examples/math-wasm
./build.sh
cd ../..
```

### 3. Testez l'installation

```bash
# Test complet
npm test

# Ou test basique seulement
npm run test:basic
```

## 🎯 Essayer les exemples

### Node.js

```bash
# Exemple basique
npm run test:basic

# Exemple avancé
npm run test:advanced

# Tests complets
npm run test:wasm
```

### Navigateur

```bash
# Démarrer un serveur local
npm run demo:serve

# Puis ouvrir http://localhost:3000/browser-demo.html
```

### React/Vue

Les composants React et Vue sont dans `examples/`, vous pouvez les copier dans votre projet.

## 📦 Intégration dans votre projet

### Installation

```bash
npm install gowm
```

### Utilisation basique

```javascript
const { load } = require('gowm');

async function main() {
  const wasm = await load('./your-module.wasm');
  const result = wasm.call('your_function', arg1, arg2);
  console.log(result);
}
```

### Avec React

```jsx
import { useWasm } from 'gowm/hooks/useWasm';

function MyComponent() {
  const { wasm, loading, error } = useWasm('./module.wasm');
  
  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;
  
  return <button onClick={() => wasm.call('func')}>Appeler WASM</button>;
}
```

### Avec Vue.js

```vue
<script setup>
import { useWasm } from 'gowm/composables/useWasm';

const { wasm, loading, error } = useWasm('./module.wasm');

const callWasm = () => {
  if (wasm.value) {
    const result = wasm.value.call('func');
    console.log(result);
  }
};
</script>
```

## 🔧 Créer votre propre module WASM Go

### 1. Créez le fichier Go

```go
//go:build js && wasm

package main

import "syscall/js"

func myFunction(this js.Value, args []js.Value) interface{} {
    // Votre logique ici
    return js.ValueOf("Hello from Go!")
}

func main() {
    js.Global().Set("myFunction", js.FuncOf(myFunction))
    js.Global().Set("__gowm_ready", js.ValueOf(true))
    select {} // Maintenir le programme en vie
}
```

### 2. Compilez

```bash
GOOS=js GOARCH=wasm go build -o module.wasm main.go
```

### 3. Utilisez avec GoWM

```javascript
const { load } = require('gowm');
const wasm = await load('./module.wasm');
console.log(wasm.call('myFunction'));
```

## 🐛 Résolution de problèmes

### "Module WASM non trouvé"

```bash
# Assurez-vous d'avoir compilé le module
cd examples/math-wasm && ./build.sh
```

### "Go runtime not found"

Le fichier `wasm_exec.js` est nécessaire. GoWM l'inclut automatiquement, mais vous pouvez le copier depuis :

```bash
cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" .
```

### Erreurs dans le navigateur

- Servez les fichiers via HTTP (pas `file://`)
- Vérifiez que les fichiers `.wasm` sont accessibles
- Consultez la console développeur pour plus de détails

### Performance

- Utilisez `-ldflags="-s -w"` pour optimiser la taille
- Préférez `callAsync()` pour les opérations longues
- Évitez les appels trop fréquents

## 📚 Ressources

- **Documentation complète** : README.md principal
- **Exemples** : dossier `examples/`
- **Types TypeScript** : dossier `types/`
- **Tests** : `examples/test-wasm.js`

## 🤝 Support

- **Issues** : Créez une issue sur GitHub
- **Documentation** : Consultez les exemples
- **Communauté** : Partagez vos expériences

---

Bon développement avec GoWM ! 🚀
