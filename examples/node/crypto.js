/**
 * Crypto GoWM Example - Crypto WASM Module
 * 
 * Demonstrates cryptographic operations using
 * Go Wasm module from GitHub repository.
 */

const { loadFromGitHub } = require('gowm');

async function main() {
    try {
        // Load crypto WASM module from GitHub repository
        console.log('Loading crypto WASM module...');
        const crypto = await loadFromGitHub('benoitpetit/wasm-modules-repository', {
            path: 'crypto-wasm',
            filename: 'main.wasm',
            name: 'crypto',
            branch: 'master'
        });

        console.log('✅ Crypto module loaded successfully\n');

        // Hash operations
        console.log('=== Hash Operations ===');
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
        console.log('UUID 1:', uuid1);
        console.log('UUID 2:', uuid2);
        console.log('Unique:', uuid1 !== uuid2);

        // Module info
        console.log('\n=== Module Info ===');
        const stats = crypto.getStats();
        console.log('Module name:', stats.name);
        console.log('Available functions:', stats.functions.length);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main(); 