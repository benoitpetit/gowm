/**
 * Crypto GoWM Example - Cryptography WASM Module
 * 
 * Demonstrates loading and using a Go Wasm module
 * for cryptographic operations from GitHub repository.
 * 
 * v1.4.0: Metadata exploitation, SHA256 integrity, function validation
 * v1.3.0: Cache, retry, streaming, compression support
 */

const { GoWM } = require('../../src/index.js');

async function main() {
    const gowm = new GoWM({ logLevel: 'info' });

    try {
        // Load crypto WASM module from GitHub repository
        // v1.4.0: Integrity verified via .wasm.integrity, metadata loaded from module.json
        console.log('Loading crypto WASM module...');
        const crypto = await gowm.loadFromGitHub('benoitpetit/wasm-modules-repository', {
            path: 'crypto-wasm',
            filename: 'main.wasm',
            name: 'crypto',
            cache: { ttl: 7200000 } // 2h cache TTL
        });

        console.log('Crypto module loaded successfully\n');

        // v1.4.0: Describe a function before using it
        console.log('=== Function Documentation (v1.4.0) ===');
        const hashDesc = gowm.describeFunction('crypto', 'hashSHA256');
        if (hashDesc) {
            console.log(`${hashDesc.name}: ${hashDesc.description}`);
            console.log(`Parameters: ${hashDesc.parameters?.map(p => `${p.name} (${p.type})`).join(', ')}`);
        }

        // Hash operations
        console.log('\n=== Hash Operations ===');
        const message = 'Hello GoWM World!';
        const hashResult = crypto.call('hashSHA256', message);
        
        if (hashResult.error) {
            console.error('Hash error:', hashResult.error);
        } else {
            console.log('Original message:', message);
            console.log('SHA256 hash:', hashResult.hash);
            console.log('Algorithm:', hashResult.algorithm);
        }

        // AES Encryption
        console.log('\n=== AES Encryption ===');
        const keyResult = crypto.call('generateAESKey', 32); // 256-bit key
        
        if (keyResult.error) {
            console.error('Key generation failed:', keyResult.error);
        } else {
            console.log('AES key generated (length):', keyResult.key.length);
            
            const secretMessage = 'This is a secret message';
            const encryptResult = crypto.call('encryptAES', secretMessage, keyResult.key);
            
            if (encryptResult.error) {
                console.error('Encryption failed:', encryptResult.error);
            } else {
                console.log('Original:', secretMessage);
                console.log('Encrypted length:', encryptResult.encryptedData.length);
                
                // Decrypt back
                const decryptResult = crypto.call('decryptAES', encryptResult.encryptedData, keyResult.key);
                if (decryptResult.error) {
                    console.error('Decryption failed:', decryptResult.error);
                } else {
                    console.log('Decrypted:', decryptResult.decryptedData);
                    console.log('✅ Encryption/Decryption successful');
                }
            }
        }

        // UUID generation
        console.log('\n=== UUID Generation ===');
        const uuid1 = crypto.call('generateUUID');
        const uuid2 = crypto.call('generateUUID');
        console.log('UUID 1:', typeof uuid1 === 'object' ? uuid1.uuid : uuid1);
        console.log('UUID 2:', typeof uuid2 === 'object' ? uuid2.uuid : uuid2);
        console.log('Unique:', (typeof uuid1 === 'object' ? uuid1.uuid : uuid1) !== (typeof uuid2 === 'object' ? uuid2.uuid : uuid2));

        // v1.4.0: Module metadata and stats
        console.log('\n=== Module Info (v1.4.0) ===');
        const stats = crypto.getStats();
        console.log('Module name:', stats.name);
        console.log('Has metadata:', stats.hasMetadata);
        if (stats.metadata) {
            console.log('Version:', stats.metadata.version);
            console.log('Documented functions:', stats.metadata.functionsCount);
            if (stats.metadata.categories) {
                console.log('Categories:', stats.metadata.categories.join(', '));
            }
        }

        // v1.4.0: List all documented functions with details
        const detailed = crypto.getDetailedFunctions();
        if (detailed.length > 0) {
            console.log('\nDetailed functions:');
            for (const fn of detailed) {
                console.log(`  - ${fn.name}: ${fn.description || '(no desc)'}`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main(); 