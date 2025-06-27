#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking GOWM project...');

// Check required files
const requiredFiles = [
    'src/index.js',
    'src/browser.js',
    'types/index.d.ts',
    'README.md',
    'LICENSE',
    'package.json'
];

let allGood = true;

// Check required files
requiredFiles.forEach(file => {
    if (fs.existsSync(path.join(__dirname, file))) {
        console.log(`✅ ${file} exists`);
    } else {
        console.log(`❌ ${file} missing`);
        allGood = false;
    }
});

// Check required directories
const requiredDirs = [
    'src/loaders',
    'src/core',
    'src/bridges',
    'examples',
    'runtime',
    'types'
];

requiredDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        console.log(`✅ ${dir}/ directory exists`);
    } else {
        console.log(`❌ ${dir}/ directory missing`);
        allGood = false;
    }
});

// Check if directories have content
const requireContentDirs = {
    'src/loaders': 1,  // At least 1 loader
    'src/bridges': 1,  // At least 1 bridge
    'src/core': 1,     // At least 1 core file
    'examples': 1      // At least 1 example
};

Object.entries(requireContentDirs).forEach(([dir, minFiles]) => {
    const dirPath = path.join(__dirname, dir);
    if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath).filter(f => !f.startsWith('.'));
        if (files.length >= minFiles) {
            console.log(`✅ ${dir}/ has required content (${files.length} files)`);
        } else {
            console.log(`❌ ${dir}/ needs at least ${minFiles} file(s), found ${files.length}`);
            allGood = false;
        }
    }
});

// Check package.json exports
try {
    const pkg = require('./package.json');
    const requiredExports = ['node', 'browser', 'import', 'require'];
    const hasAllExports = requiredExports.every(exp => pkg.exports?.['.']?.[exp]);
    
    if (hasAllExports) {
        console.log('✅ package.json exports configuration is valid');
    } else {
        console.log('❌ package.json missing required exports configuration');
        allGood = false;
    }
} catch (err) {
    console.log('❌ Error checking package.json exports');
    allGood = false;
}

if (allGood) {
    console.log('✨ All checks passed!');
    process.exit(0);
} else {
    console.log('❌ Some required files or directories are missing');
    process.exit(1);
}
