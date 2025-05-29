# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

## [1.0.2] - 2025-05-29

### Corrigé
- **Problème critique de bundling** : Correction de l'importation des modules Node.js `fs` et `path` qui causaient des erreurs avec Webpack 5 et autres bundlers modernes
- Importation dynamique sécurisée des modules Node.js pour éviter les erreurs de build
- Amélioration de la détection d'environnement (Node.js vs navigateur)
- Ajout de méthode `ensureNodeModules()` pour un chargement sûr des dépendances Node.js

### Ajouté
- Version sécurisée du loader (`loader-safe.js`) avec gestion d'erreurs améliorée
- Meilleure compatibilité avec les bundlers modernes (Webpack 5, Vite, etc.)

## [1.0.1] - 2025-05-29

### Corrigé
- **Compatibilité navigateur** : Résolution du problème avec les modules Node.js `fs` et `path` qui empêchaient l'utilisation dans React/Vue/navigateur
- Importation conditionnelle des modules Node.js uniquement en environnement serveur
- Ajout de points d'entrée séparés pour Node.js et navigateur dans `package.json`
- Création de versions navigateur dédiées (`loader-browser.js`, `bridge-browser.js`, `browser.js`)

### Ajouté
- Support ES modules pour les environnements navigateur
- Configuration `package.json` avec champs `browser`, `module`, et `exports`
- Documentation sur la résolution du problème de compatibilité (`BROWSER_SUPPORT.md`)

## [1.0.0] - 2025-05-28

### Ajouté
- Support complet pour l'intégration de modules WebAssembly Go
- Loader automatique pour les fichiers WASM
- Bridge JavaScript pour l'interaction avec les fonctions Go
- Hooks React pour une intégration facile
- Composables Vue.js pour les applications Vue
- Exemples d'utilisation basique et avancée
- Support du navigateur et de Node.js
- Calculatrice de démonstration en React et Vue
- Documentation complète avec README
- Types TypeScript pour un développement type-safe

### Fonctionnalités
- Chargement automatique des modules WASM
- Gestion d'erreurs robuste
- Support asynchrone complet
- API simple et intuitive
- Compatible avec les principaux frameworks
