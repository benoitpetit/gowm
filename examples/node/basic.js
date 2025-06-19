/**
 * Basic GoWM Example - Math WASM Module
 * 
 * Demonstrates loading and using a Go Wasm module
 * from GitHub repository for mathematical operations.
 */

const { loadFromGitHub } = require('gowm');

async function main() {
    try {
        // Load math WASM module from GitHub repository
        console.log('Loading math WASM module...');
        const math = await loadFromGitHub('benoitpetit/wasm-modules-repository', {
            path: 'math-wasm',
            filename: 'main.wasm',
            name: 'math',
            branch: 'master'
        });

        console.log('✅ Math module loaded successfully\n');

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
        if (typeof divisionResult === 'string' && divisionResult.includes('Erreur')) {
            console.log('Division by zero handled:', divisionResult);
        }

        // Get available functions
        console.log('\n=== Available Functions ===');
        const functions = math.call('getAvailableFunctions');
        console.log('Functions:', functions);

        // Module statistics
        console.log('\n=== Module Info ===');
        const stats = math.getStats();
        console.log('Module name:', stats.name);
        console.log('Ready:', stats.ready);
        console.log('Function count:', stats.functions.length);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main(); 