# 📚 Exemples GoWM

Ce dossier contient des exemples complets d'utilisation de GoWM pour intégrer des modules WebAssembly Go dans différents environnements JavaScript.

## 🗂️ Structure des exemples

```
examples/
├── README.md              # Ce fichier
├── math-wasm/             # Module WASM Go simple
│   ├── main.go           # Code source Go
│   ├── go.mod            # Module Go
│   ├── build.sh          # Script de compilation
│   └── README.md         # Documentation du module
├── basic-usage.js         # Exemple Node.js basique
├── advanced-usage.js      # Exemple Node.js avancé
├── react-calculator.jsx   # Composant React
├── vue-calculator.vue     # Composant Vue.js
├── browser-demo.html      # Démonstration navigateur
└── test-wasm.js          # Tests automatisés
```

## 🚀 Démarrage rapide

### 1. Compiler le module WASM

```bash
cd examples/math-wasm
./build.sh
```

### 2. Tester avec Node.js

```bash
# Depuis la racine du projet
npm run test:basic
# ou
node examples/basic-usage.js
```

### 3. Tester dans le navigateur

```bash
# Servir les fichiers avec un serveur HTTP
npx serve examples/
# Ouvrir http://localhost:3000/browser-demo.html
```

## 📖 Exemples détaillés

### 🔧 Module WASM Go (`math-wasm/`)

Un module WebAssembly Go simple qui fournit des fonctions mathématiques de base :

- **Fonctions disponibles** : `add`, `subtract`, `multiply`, `divide`, `power`, `factorial`
- **Gestion d'erreurs** : Division par zéro, factorielle négative
- **Signal de prêt** : Compatible avec le système de détection GoWM

**Utilisation :**
```javascript
const { load } = require('gowm');
const math = await load('./examples/math-wasm/main.wasm');
console.log('5 + 3 =', math.call('add', 5, 3));
```

### 📱 Exemple Node.js basique (`basic-usage.js`)

Démontre l'utilisation fondamentale de GoWM :

- Chargement d'un module WASM
- Appels de fonctions synchrones et asynchrones
- Gestion d'erreurs
- Statistiques du module

**Exécution :**
```bash
node examples/basic-usage.js
```

### 🚀 Exemple Node.js avancé (`advanced-usage.js`)

Présente des fonctionnalités avancées :

- Gestion de plusieurs modules
- Appels parallèles
- Gestion de la mémoire
- Benchmark de performance
- Nettoyage des ressources

**Exécution :**
```bash
node examples/advanced-usage.js
```

### ⚛️ Composant React (`react-calculator.jsx`)

Calculatrice React utilisant le hook `useWasm` :

- **Hook** : `useWasm` pour charger automatiquement le module
- **État** : Gestion du loading, erreurs, et résultats
- **UI** : Interface moderne avec historique des calculs
- **Responsive** : Adapté mobile et desktop

**Fonctionnalités :**
- Calculs mathématiques en temps réel
- Historique des opérations (10 dernières)
- Gestion d'erreurs intégrée
- Informations sur le module WASM

### 🌟 Composant Vue.js (`vue-calculator.vue`)

Calculatrice Vue.js 3 utilisant les composables :

- **Composable** : `useWasm` pour Vue 3
- **Réactivité** : État réactif avec `ref` et `computed`
- **Fonctionnalités** : Calculs rapides, export d'historique
- **Persistance** : Sauvegarde localStorage

**Fonctionnalités avancées :**
- Calculs rapides prédéfinis
- Export JSON de l'historique
- Statistiques de performance
- Interface responsive complète

### 🌐 Démonstration navigateur (`browser-demo.html`)

Page HTML autonome pour démonstration :

- **Loader simple** : Implémentation basique du chargement WASM
- **Interface** : UI moderne sans dépendances
- **Responsive** : Mobile-first design
- **Fonctionnalités** : Tous les calculs + actions rapides

**Avantages :**
- Aucune dépendance externe
- Fonctionne hors ligne
- Démonstration complète des capacités
- Code source visible et éducatif

### 🧪 Tests automatisés (`test-wasm.js`)

Suite de tests complète pour validation :

- **Tests unitaires** : Chaque fonction mathématique
- **Tests d'erreurs** : Validation des cas d'erreur
- **Tests de performance** : Benchmark simple
- **Tests asynchrones** : Validation des appels async

**Utilisation :**
```bash
node examples/test-wasm.js
```

## 🛠️ Prérequis techniques

### Pour tous les exemples
- **Node.js** >= 14.0.0
- **Go** >= 1.21 (pour compiler le module WASM)

### Pour React
- **React** >= 16.8.0 (hooks)
- **Bundler** compatible WebAssembly (Webpack, Vite, etc.)

### Pour Vue.js
- **Vue.js** >= 3.0.0 (Composition API)
- **Bundler** compatible WebAssembly

### Pour le navigateur
- **Navigateur moderne** avec support WebAssembly
- **Serveur HTTP** pour servir les fichiers (CORS)

## 🔧 Configuration et déploiement

### Serveur de développement

Pour React/Vue, configurez votre bundler pour servir les fichiers `.wasm` :

**Webpack :**
```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.wasm$/,
        type: 'webassembly/async'
      }
    ]
  }
};
```

**Vite :**
```javascript
// vite.config.js
export default {
  server: {
    fs: {
      allow: ['..']
    }
  }
};
```

### Production

1. **Compilez le module WASM** avant le build
2. **Incluez `wasm_exec.js`** dans votre bundle
3. **Configurez MIME types** pour `.wasm` sur votre serveur
4. **Activez CORS** si nécessaire

### Headers serveur recommandés

```
Content-Type: application/wasm
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

## 🐛 Dépannage

### Module WASM non trouvé
```bash
# Vérifiez que Go est installé
go version

# Compilez le module
cd examples/math-wasm && ./build.sh

# Vérifiez que le fichier existe
ls -la examples/math-wasm/main.wasm
```

### Erreur de chargement dans le navigateur
- Servez les fichiers via HTTP (pas `file://`)
- Vérifiez les CORS
- Assurez-vous que `wasm_exec.js` est accessible

### Performance lente
- Activez les optimisations Go : `-ldflags="-s -w"`
- Utilisez `callAsync` pour les opérations longues
- Considérez le pre-loading des modules

### Erreurs TypeScript
```bash
# Installez les types
npm install @types/node

# Vérifiez la configuration tsconfig.json
```

## 📊 Métriques et monitoring

Les exemples incluent des fonctionnalités de monitoring :

- **Temps d'exécution** des fonctions
- **Nombre d'appels** effectués
- **Statistiques mémoire** (via `getStats()`)
- **Détection d'erreurs** automatique

## 🤝 Contribution

Pour ajouter de nouveaux exemples :

1. Créez un nouveau fichier dans `examples/`
2. Documentez l'exemple dans ce README
3. Ajoutez des tests dans `test-wasm.js`
4. Mettez à jour le `package.json` avec un script de test

## 📄 Licence

Ces exemples sont sous licence MIT, comme le projet GoWM principal.

---

**💡 Conseil :** Commencez par l'exemple basique, puis explorez les exemples plus avancés selon vos besoins !
