#!/usr/bin/env node

/**
 * GoWM GitHub Loading Example
 * 
 * This example demonstrates how to load WASM modules directly from GitHub repositories
 * using the new loadFromGitHub function instead of NPM packages.
 */

const { loadFromGitHub, GoWM } = require('../../src/index');

async function basicGitHubExample() {
    console.log('🚀 GoWM - GitHub Loading Example\n');

    try {
        // Example 1: Load from GitHub repository using simple format
        console.log('📦 Example 1: Basic GitHub loading');
        console.log('Loading WASM from: username/wasm-math-lib');
        
        // This would load from a hypothetical repository
        // const math = await loadFromGitHub('username/wasm-math-lib');
        
        console.log('✅ Would load from main branch, trying common filenames');
        console.log('   Tries: main.wasm, index.wasm, wasm-math-lib.wasm, etc.\n');

        // Example 2: Load with specific options
        console.log('📦 Example 2: GitHub loading with options');
        
        const options = {
            branch: 'develop',
            path: 'dist',
            filename: 'calculator.wasm',
            name: 'advanced-math'
        };
        
        console.log('Options:', JSON.stringify(options, null, 2));
        // const advancedMath = await loadFromGitHub('company/advanced-math', options);
        console.log('✅ Would load from develop branch, dist/calculator.wasm\n');

        // Example 3: Load from full GitHub URL
        console.log('📦 Example 3: Loading from full GitHub URL');
        const fullUrl = 'https://github.com/golang/go/blob/master/misc/wasm/wasm_exec.js';
        console.log(`URL: ${fullUrl}`);
        // const goRuntime = await loadFromGitHub(fullUrl, { filename: 'wasm_exec.js' });
        console.log('✅ Would parse URL and load from repository\n');

        // Example 4: Load from specific tag/release
        console.log('📦 Example 4: Loading from specific tag');
        const tagOptions = {
            tag: 'v1.2.0',
            name: 'stable-version'
        };
        
        console.log('Tag options:', JSON.stringify(tagOptions, null, 2));
        // const stableVersion = await loadFromGitHub('myorg/wasm-lib', tagOptions);
        console.log('✅ Would load from v1.2.0 tag or release\n');

    } catch (error) {
        console.error('❌ Error in GitHub loading example:', error.message);
    }
}

async function multipleGitHubExample() {
    console.log('🔗 Multiple GitHub Repositories Example\n');
    
    const gowm = new GoWM();
    
    try {
        // Configuration for multiple repositories
        const repositories = [
            {
                name: 'math',
                repo: 'awesome-org/wasm-math',
                branch: 'main',
                path: 'dist'
            },
            {
                name: 'utils', 
                repo: 'utility-company/wasm-utils',
                tag: 'v2.1.0'
            },
            {
                name: 'image-processor',
                repo: 'https://github.com/image-corp/wasm-image-lib',
                filename: 'image.wasm',
                path: 'build'
            }
        ];

        console.log('📦 Loading multiple repositories:');
        repositories.forEach(repo => {
            console.log(`   - ${repo.name}: ${repo.repo}`);
        });

        // Simulate loading (commented out as repositories don't exist)
        /*
        const loadPromises = repositories.map(async (repoConfig) => {
            const { name, repo, ...options } = repoConfig;
            try {
                const wasmModule = await gowm.loadFromGitHub(repo, { ...options, name });
                console.log(`✅ ${name} loaded successfully`);
                return { name, module: wasmModule, success: true };
            } catch (error) {
                console.error(`❌ Failed to load ${name}: ${error.message}`);
                return { name, error, success: false };
            }
        });

        const results = await Promise.allSettled(loadPromises);
        
        console.log('\n📊 Loading Results:');
        results.forEach((result, index) => {
            const repo = repositories[index];
            if (result.status === 'fulfilled' && result.value.success) {
                console.log(`✅ ${repo.name}: Successfully loaded`);
            } else {
                console.log(`❌ ${repo.name}: Failed to load`);
            }
        });
        */

        console.log('✅ Multiple repository loading configured\n');

    } catch (error) {
        console.error('❌ Error in multiple GitHub example:', error.message);
    }
}

async function errorHandlingExample() {
    console.log('🛡️ Error Handling Examples\n');

    // Example of various error scenarios
    const errorCases = [
        {
            description: 'Invalid repository format',
            repo: 'invalid-repo-format',
            expectedError: 'GitHub repository must be in format "owner/repo"'
        },
        {
            description: 'Non-existent repository',
            repo: 'nonexistent/repo-that-does-not-exist',
            expectedError: 'Could not find WASM file'
        },
        {
            description: 'Invalid GitHub URL',
            repo: 'https://invalid-github-url.com/user/repo',
            expectedError: 'Invalid GitHub URL format'
        }
    ];

    for (const errorCase of errorCases) {
        console.log(`🧪 Testing: ${errorCase.description}`);
        console.log(`   Repository: ${errorCase.repo}`);
        
        try {
            // This would throw an error
            // await loadFromGitHub(errorCase.repo);
            console.log(`   Expected error: ${errorCase.expectedError}`);
        } catch (error) {
            console.log(`   ✅ Caught expected error: ${error.message}`);
        }
        console.log();
    }
}

async function migrationExample() {
    console.log('🔄 Migration from NPM to GitHub Example\n');

    console.log('❌ Old NPM approach (deprecated):');
    console.log('   const math = await loadFromNPM("my-wasm-math");');
    console.log('   // Limited to NPM packages only\n');

    console.log('✅ New GitHub approach:');
    console.log('   const math = await loadFromGitHub("myorg/wasm-math");');
    console.log('   // Direct access to GitHub repositories');
    console.log('   // Support for branches, tags, and specific paths');
    console.log('   // No need to publish to NPM\n');

    console.log('🎯 Benefits of GitHub loading:');
    console.log('   ✓ Direct repository access');
    console.log('   ✓ Branch and tag support');
    console.log('   ✓ Custom file paths');
    console.log('   ✓ Release asset support');
    console.log('   ✓ No NPM publishing required');
    console.log('   ✓ Automatic file discovery\n');
}

async function main() {
    try {
        await basicGitHubExample();
        await multipleGitHubExample();
        await errorHandlingExample();
        await migrationExample();
        
        console.log('✨ GitHub loading examples completed successfully!');
        console.log('\n💡 To use with real repositories, uncomment the actual loading calls');
        console.log('   and replace with valid GitHub repository URLs.');
        
    } catch (error) {
        console.error('❌ Example failed:', error.message);
        process.exit(1);
    }
}

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
});

if (require.main === module) {
    main();
} 