#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking GOWM project...');

// Check required files
const requiredFiles = [
    'src/index.js',
    'types/index.d.ts',
    'README.md',
    'LICENSE',
    'package.json'
];

let allGood = true;

requiredFiles.forEach(file => {
    if (fs.existsSync(path.join(__dirname, file))) {
        console.log(`✅ ${file} exists`);
    } else {
        console.log(`❌ ${file} missing`);
        allGood = false;
    }
});

// Check src/ structure
const srcFiles = ['index.js', 'loader.js', 'bridge.js'];
srcFiles.forEach(file => {
    const filePath = path.join(__dirname, 'src', file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ src/${file} exists`);
    } else {
        console.log(`❌ src/${file} missing`);
        allGood = false;
    }
});

// Check examples directory
const examplesPath = path.join(__dirname, 'examples');
if (fs.existsSync(examplesPath)) {
    console.log('✅ examples/ directory exists');
} else {
    console.log('❌ examples/ directory missing');
    allGood = false;
}

if (allGood) {
    console.log('✨ All checks passed!');
    process.exit(0);
} else {
    console.log('❌ Some required files are missing');
    process.exit(1);
}
