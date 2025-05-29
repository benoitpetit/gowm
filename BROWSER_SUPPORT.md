# GOWM - Support Navigateur

## Problème résolu

Ce package était incompatible avec les environnements navigateur (React, Vue, etc.) car il utilisait directement les modules Node.js `fs` et `path`. Cette nouvelle version résout ce problème en :

1. **Importation conditionnelle** : Les modules Node.js ne sont importés que dans un environnement Node.js
2. **Points d'entrée séparés** : Utilisation de `package.json` exports pour router vers la bonne version
3. **Version navigateur dédiée** : Fichiers spécifiques pour l'environnement navigateur

## Utilisation

### En Node.js
```javascript
const { load } = require('gowm');
// ou
import { load } from 'gowm';
```

### Dans un navigateur/React/Vue
```javascript
import { load } from 'gowm';
// Le bundler utilisera automatiquement la version navigateur
```

## Configuration webpack (si nécessaire)

Si vous rencontrez encore des problèmes, ajoutez cette configuration à votre `webpack.config.js` :

```javascript
module.exports = {
  resolve: {
    fallback: {
      "fs": false,
      "path": false
    }
  }
};
```

## Points d'entrée

- **Node.js** : `src/index.js` (utilise CommonJS et les modules Node.js)
- **Navigateur** : `src/browser.js` (utilise ES modules, pas de dépendances Node.js)
- **React hooks** : `hooks/useWasm.js`
- **Vue composables** : `composables/useWasm.js`
