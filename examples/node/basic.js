/**
 * Basic GoWM Example - Math WASM Module
 * 
 * Demonstrates loading and using a Go Wasm module
 * from GitHub repository for mathematical operations.
 * 
 * v1.4.0: Module metadata exploitation, SHA256 integrity, function validation
 * v1.3.0: Cache multi-niveaux, retry avec backoff, streaming, compression
 */

const { GoWM } = require('../../src/index.js');

async function main() {
    // Create a GoWM instance with configurable logging
    const gowm = new GoWM({ logLevel: 'info' });

    try {
        // Load math WASM module from GitHub repository
        // v1.4.0: module.json metadata is fetched in parallel with WASM bytes
        //         SHA256 integrity is verified from .wasm.integrity file
        //         readySignal auto-discovered from gowmConfig
        //         Function calls are validated against metadata
        console.log('Loading math WASM module...');
        const math = await gowm.loadFromGitHub('benoitpetit/wasm-modules-repository', {
            path: 'math-wasm',
            filename: 'main.wasm',
            name: 'math',
            retries: 3,          // retry on network failure
            retryDelay: 1000,    // 1s base delay with exponential backoff
            // v1.4.0 options:
            // metadata: true,   // fetch module.json (default: true)
            // integrity: true,  // verify SHA256 hash (default: true)
            // validateCalls: true // validate function parameters (default: true)
        });

        console.log('Math module loaded successfully\n');

        // Enable silent mode for cleaner output
        math.call('setSilentMode', true);

        // Basic arithmetic operations
        console.log('=== Basic Operations ===');
        console.log('5 + 3 =', math.call('add', 5, 3));
        console.log('10 - 4 =', math.call('subtract', 10, 4));
        console.log('6 × 7 =', math.call('multiply', 6, 7));
        console.log('15 ÷ 3 =', math.call('divide', 15, 3));

        // Advanced operations
        console.log('\n=== Advanced Operations ===');
        console.log('2^8 =', math.call('power', 2, 8));
        console.log('5! =', math.call('factorial', 5));

        // Error handling example
        console.log('\n=== Error Handling ===');
        const divisionResult = math.call('divide', 10, 0);
        if (typeof divisionResult === 'string' && divisionResult.includes('Error')) {
            console.log('Division by zero handled:', divisionResult);
        } else {
            console.log('Unexpected result for division by zero:', divisionResult);
        }

        // v1.4.0: Describe a function using module.json metadata
        console.log('\n=== Function Description (v1.4.0) ===');
        const addDesc = gowm.describeFunction('math', 'add');
        if (addDesc) {
            console.log(`Function: ${addDesc.name}`);
            console.log(`Description: ${addDesc.description}`);
            console.log(`Category: ${addDesc.category}`);
            console.log(`Parameters:`, addDesc.parameters?.map(p => `${p.name}: ${p.type}`).join(', '));
            console.log(`Return type: ${addDesc.returnType}`);
            if (addDesc.example) console.log(`Example: ${addDesc.example}`);
        } else {
            console.log('No metadata available for add()');
        }

        // v1.4.0: Get detailed functions with metadata
        console.log('\n=== Detailed Functions (v1.4.0) ===');
        const detailed = math.getDetailedFunctions();
        console.log(`Total documented functions: ${detailed.length}`);
        for (const fn of detailed.slice(0, 5)) {
            console.log(`  - ${fn.name}: ${fn.description || '(no description)'}`);
        }

        // v1.4.0: Get function categories
        console.log('\n=== Function Categories (v1.4.0) ===');
        const categories = math.getFunctionCategories();
        if (categories) {
            for (const [cat, funcs] of Object.entries(categories)) {
                console.log(`  ${cat}: ${funcs.join(', ')}`);
            }
        }

        // v1.4.0: Get module metadata
        console.log('\n=== Module Metadata (v1.4.0) ===');
        const metadata = gowm.getModuleMetadata('math');
        if (metadata) {
            console.log(`Module: ${metadata.name} v${metadata.version}`);
            console.log(`Description: ${metadata.description}`);
            console.log(`Functions: ${metadata.functions?.length || 0}`);
        }

        // Module statistics (now includes metadata info)
        console.log('\n=== Module Info ===');
        const stats = math.getStats();
        console.log('Module name:', stats.name);
        console.log('Ready:', stats.ready);
        console.log('Has metadata:', stats.hasMetadata);
        if (stats.metadata) {
            console.log('Metadata version:', stats.metadata.version);
            console.log('Documented functions:', stats.metadata.functionsCount);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main(); 