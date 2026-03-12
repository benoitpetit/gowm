#!/usr/bin/env node
/**
 * Script to bump version across all GoWM files
 * Usage: node bump-version.js 1.1.6
 */

const fs = require('fs');
const path = require('path');

const NEW_VERSION = process.argv[2];

if (!NEW_VERSION || !/^\d+\.\d+\.\d+$/.test(NEW_VERSION)) {
    console.error('Usage: node bump-version.js <version>');
    console.error('Example: node bump-version.js 1.1.6');
    process.exit(1);
}

const OLD_VERSION = require('./package.json').version;
console.log(`Bumping version: ${OLD_VERSION} → ${NEW_VERSION}\n`);

// Escape special regex characters in version string
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const oldVersionEscaped = escapeRegex(OLD_VERSION);

const filesToUpdate = [
    // JSON
    { path: 'package.json', pattern: new RegExp(`"version":\\s*"[^"]+"`), replacement: `"version": "${NEW_VERSION}"` },
    
    // TypeScript definitions (header + JSDoc)
    { path: 'types/index.d.ts', pattern: new RegExp(`v${oldVersionEscaped}`, 'g'), replacement: `v${NEW_VERSION}` },
    { path: 'types/vue.d.ts', pattern: /@version\s+\S+/, replacement: `@version ${NEW_VERSION}` },
    { path: 'types/react.d.ts', pattern: /@version\s+\S+/, replacement: `@version ${NEW_VERSION}` },
    
    // Source files with JSDoc @version
    { path: 'src/core/gowm.js', pattern: /@version\s+\S+/, replacement: `@version ${NEW_VERSION}` },
    { path: 'src/core/gowm.js', pattern: new RegExp(`'${oldVersionEscaped}'`), replacement: `'${NEW_VERSION}'` },
    { path: 'src/core/wasm-worker.js', pattern: /@version\s+\S+/, replacement: `@version ${NEW_VERSION}` },
    { path: 'src/bridges/unified-bridge.js', pattern: /@version\s+\S+/, replacement: `@version ${NEW_VERSION}` },
    { path: 'src/loaders/unified-loader.js', pattern: /@version\s+\S+/, replacement: `@version ${NEW_VERSION}` },
    { path: 'src/react/index.js', pattern: /@version\s+\S+/, replacement: `@version ${NEW_VERSION}` },
    { path: 'src/react/hooks.js', pattern: /@version\s+\S+/, replacement: `@version ${NEW_VERSION}` },
    { path: 'src/vue/index.js', pattern: /@version\s+\S+/, replacement: `@version ${NEW_VERSION}` },
    { path: 'src/browser.js', pattern: /@version\s+\S+/, replacement: `@version ${NEW_VERSION}` },
    { path: 'src/browser.js', pattern: new RegExp(`'${oldVersionEscaped}'`, 'g'), replacement: `'${NEW_VERSION}'` },
    { path: 'src/cli/gowm-cli.js', pattern: /@version\s+\S+/, replacement: `@version ${NEW_VERSION}` },
    { path: 'src/tools/type-generator.js', pattern: /@version\s+\S+/, replacement: `@version ${NEW_VERSION}` },
    
    // Tests
    { path: 'tests/unit/web-workers.test.js', pattern: /@version\s+\S+/, replacement: `@version ${NEW_VERSION}` },
    { path: 'tests/unit/shared-buffer.test.js', pattern: /@version\s+\S+/, replacement: `@version ${NEW_VERSION}` },
];

let updatedCount = 0;
let errorCount = 0;

filesToUpdate.forEach(({ path: filePath, pattern, replacement }) => {
    const fullPath = path.join(__dirname, filePath);
    
    try {
        if (!fs.existsSync(fullPath)) {
            console.warn(`⚠️  Skipping (not found): ${filePath}`);
            return;
        }
        
        let content = fs.readFileSync(fullPath, 'utf8');
        const originalContent = content;
        
        content = content.replace(pattern, replacement);
        
        if (content !== originalContent) {
            fs.writeFileSync(fullPath, content, 'utf8');
            console.log(`✅ Updated: ${filePath}`);
            updatedCount++;
        } else {
            console.log(`⏭️  No changes: ${filePath}`);
        }
    } catch (error) {
        console.error(`❌ Error updating ${filePath}:`, error.message);
        errorCount++;
    }
});

console.log(`\n${'='.repeat(50)}`);
console.log(`Version bump complete: ${OLD_VERSION} → ${NEW_VERSION}`);
console.log(`Files updated: ${updatedCount}`);
if (errorCount > 0) {
    console.log(`Errors: ${errorCount}`);
    process.exit(1);
}

// Update package-lock.json if it exists
const packageLockPath = path.join(__dirname, 'package-lock.json');
if (fs.existsSync(packageLockPath)) {
    console.log('\n⚠️  Remember to run: npm install');
    console.log('   (to update package-lock.json)');
}
