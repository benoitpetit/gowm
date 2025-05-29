#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification du projet GOWM...');

// Vérifier les fichiers requis
const requiredFiles = [
    'src/index.js',
    'types/index.d.ts',
    'README.md',
    'LICENSE',
    'CHANGELOG.md',
    'package.json'
];

let allGood = true;

requiredFiles.forEach(file => {
    if (fs.existsSync(path.join(__dirname, file))) {
        console.log(`✅ ${file} existe`);
    } else {
        console.log(`❌ ${file} manquant`);
        allGood = false;
    }
});

// Vérifier la structure src/
const srcFiles = ['index.js', 'loader.js', 'bridge.js'];
srcFiles.forEach(file => {
    const filePath = path.join(__dirname, 'src', file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ src/${file} existe`);
    } else {
        console.log(`❌ src/${file} manquant`);
        allGood = false;
    }
});

if (allGood) {
    console.log('✨ Toutes les vérifications sont passées !');
    process.exit(0);
} else {
    console.log('❌ Des fichiers requis sont manquants');
    process.exit(1);
}
