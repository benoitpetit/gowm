/**
 * Text Processing GoWM Example - Advanced Text WASM Module
 * 
 * Demonstrates loading and using a Go Wasm module
 * for advanced text processing operations from GitHub repository.
 */

const { loadFromGitHub } = require('../../src/index.js');

async function main() {
    try {
        // Load text-wasm module from GitHub repository
        console.log('Loading text processing WASM module...');
        const textProcessor = await loadFromGitHub('benoitpetit/wasm-modules-repository', {
            path: 'text-wasm',
            filename: 'main.wasm',
            name: 'text',
            branch: 'master'
        });

        console.log('✅ Text processing module loaded successfully\n');

        // Enable silent mode for cleaner output
        textProcessor.call('setSilentMode', true);

        // Text Analysis Operations
        console.log('=== Text Analysis Operations ===');

        const sampleText1 = "Hello world, this is a comprehensive test of text processing capabilities";
        const sampleText2 = "Hello earth, this is a comprehensive examination of text processing features";

        // 1. Text Similarity
        const similarity = textProcessor.call('textSimilarity', sampleText1, sampleText2);
        if (typeof similarity === 'number') {
            console.log('✅ Text similarity calculated');
            console.log(`Similarity between texts: ${(similarity * 100).toFixed(2)}%`);
        } else {
            console.log('Text similarity result:', similarity);
        }

        // 2. Levenshtein Distance
        const distance = textProcessor.call('levenshteinDistance', 'kitten', 'sitting');
        console.log(`Levenshtein distance between "kitten" and "sitting": ${distance}`);

        // 3. Word Count
        const wordCount = textProcessor.call('wordCount', sampleText1);
        console.log(`Word count in sample text: ${wordCount}`);

        // String Case Conversions
        console.log('\n=== String Case Conversions ===');

        const testString = "Hello World Test Example";

        // 1. camelCase
        const camelCase = textProcessor.call('camelCase', testString);
        console.log('✅ camelCase:', camelCase);

        // 2. kebab-case
        const kebabCase = textProcessor.call('kebabCase', testString);
        console.log('✅ kebab-case:', kebabCase);

        // 3. snake_case
        const snakeCase = textProcessor.call('snakeCase', testString);
        console.log('✅ snake_case:', snakeCase);

        // 4. slugify
        const slug = textProcessor.call('slugify', 'Hello World! This is a Test #123');
        console.log('✅ slugify:', slug);

        // Text Extraction
        console.log('\n=== Text Extraction ===');

        const textWithData = 'Contact us at support@example.com, admin@test.org or visit https://example.com and http://test.org for more info';

        // 1. Extract emails
        const emails = textProcessor.call('extractEmails', textWithData);
        console.log('✅ Extracted emails:', emails);

        // 2. Extract URLs
        const urls = textProcessor.call('extractURLs', textWithData);
        console.log('✅ Extracted URLs:', urls);

        // Advanced Text Processing
        console.log('\n=== Advanced Text Processing ===');

        // 1. Remove diacritics
        const textWithAccents = 'Café naïve résumé piñata';
        const withoutAccents = textProcessor.call('removeDiacritics', textWithAccents);
        console.log('✅ Text with accents:', textWithAccents);
        console.log('✅ Without diacritics:', withoutAccents);

        // 2. Soundex algorithm
        const soundex1 = textProcessor.call('soundex', 'Smith');
        const soundex2 = textProcessor.call('soundex', 'Smyth');
        console.log('✅ Soundex "Smith":', soundex1);
        console.log('✅ Soundex "Smyth":', soundex2);
        console.log('✅ Same pronunciation:', soundex1 === soundex2 ? 'Yes' : 'No');

        // 3. Reading time estimation
        const longText = `
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
        Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. 
        Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. 
        Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
        Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.
        `;

        const readingTime = textProcessor.call('readingTime', longText, 200); // 200 words per minute
        if (readingTime && readingTime.minutes !== undefined) {
            console.log('✅ Reading time estimation:');
            console.log(`   Minutes: ${readingTime.minutes}`);
            console.log(`   Seconds: ${readingTime.seconds}`);
            console.log(`   Words: ${readingTime.words}`);
        } else {
            console.log('Reading time result:', readingTime);
        }

        // Get available functions
        console.log('\n=== Available Functions ===');
        const functions = textProcessor.call('getAvailableFunctions');
        console.log('Text processing functions:', functions);

        // Performance test
        console.log('\n=== Performance Test ===');
        const startTime = Date.now();
        const iterations = 50;

        for (let i = 0; i < iterations; i++) {
            textProcessor.call('wordCount', sampleText1);
            textProcessor.call('camelCase', testString);
            textProcessor.call('slugify', 'Test String ' + i);
        }

        const endTime = Date.now();
        console.log(`Completed ${iterations * 3} operations in ${endTime - startTime}ms`);
        console.log(`Average: ${Math.round((endTime - startTime) / (iterations * 3))}ms per operation`);

        // Error handling demonstration
        console.log('\n=== Error Handling ===');

        // Test with empty string
        const emptyResult = textProcessor.call('wordCount', '');
        console.log('Word count for empty string:', emptyResult);

        // Test with null/undefined (handled gracefully by WASM)
        const nullResult = textProcessor.call('camelCase', '');
        console.log('camelCase for empty string:', nullResult);

        console.log('\n🎉 All text processing examples completed successfully!');

    } catch (error) {
        console.error('❌ Fatal error:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the example
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Main execution failed:', error);
        process.exit(1);
    });
}

module.exports = { main };
