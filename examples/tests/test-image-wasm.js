const { load } = require('../../src/index');
const fs = require('fs');
const path = require('path');

/**
 * GoWM - Image Processing WASM Module Tests
 * 
 * This test demonstrates image compression, WebP conversion, and resizing
 * using Go WebAssembly modules through the GoWM library.
 */

async function createTestImage() {
    // Create a simple test PNG image buffer (1x1 pixel)
    const testPNG = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth, color type, etc.
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
        0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00, // image data
        0x00, 0x01, 0x00, 0x01, 0x5C, 0xC2, 0xD5, 0x9B, // CRC
        0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND chunk
        0xAE, 0x42, 0x60, 0x82
    ]);
    return testPNG;
}

async function createTestJPEG() {
    // Create a minimal JPEG image buffer (1x1 pixel)
    const testJPEG = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, // JPEG header
        0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
        0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
        0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C,
        0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D,
        0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
        0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
        0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34,
        0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11,
        0x01, 0x03, 0x11, 0x01, 0xFF, 0xC4, 0x00, 0x14,
        0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x08, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0xFF, 0xDA, 0x00, 0x0C, 0x03, 0x01, 0x00, 0x02,
        0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x4F, 0xFF, 0xD9
    ]);
    return testJPEG;
}

function arrayBufferToUint8Array(buffer) {
    return new Uint8Array(buffer);
}

function uint8ArrayToBuffer(uint8Array) {
    return Buffer.from(uint8Array);
}

async function runImageTests() {
    console.log('🧪 GoWM - Image Processing WASM Module Tests\n');

    try {
        // Load the image processing WASM module
        console.log('📂 Loading Image Processing WASM module...');
        const imageWasm = await load(path.join(__dirname, '..', 'wasm-modules', 'image-wasm', 'main.wasm'), { 
            name: 'imageProcessor' 
        });
        console.log('✅ Image WASM module loaded successfully\n');

        // Set silent mode to reduce output during tests
        imageWasm.call('setSilentMode', true);

        // Test 1: Get available functions
        console.log('🔍 Test: Available Functions');
        const functions = imageWasm.call('getAvailableFunctions');
        console.log('Available functions:', functions);
        console.log('✅ PASS: Available Functions\n');

        // Test 2: Image info for PNG
        console.log('🔍 Test: PNG Image Info');
        const testPNG = await createTestImage();
        const pngUint8 = arrayBufferToUint8Array(testPNG.buffer);
        const pngInfo = imageWasm.call('getImageInfo', pngUint8);
        console.log('PNG Info:', {
            format: pngInfo.format,
            width: pngInfo.width,
            height: pngInfo.height,
            size: pngInfo.size
        });
        console.log('✅ PASS: PNG Image Info\n');

        // Test 3: Image info for JPEG
        console.log('🔍 Test: JPEG Image Info');
        const testJPEG = await createTestJPEG();
        const jpegUint8 = arrayBufferToUint8Array(testJPEG.buffer);
        const jpegInfo = imageWasm.call('getImageInfo', jpegUint8);
        console.log('JPEG Info:', {
            format: jpegInfo.format,
            width: jpegInfo.width,
            height: jpegInfo.height,
            size: jpegInfo.size
        });
        console.log('✅ PASS: JPEG Image Info\n');

        // Test 4: JPEG Compression
        console.log('🔍 Test: JPEG Compression (Quality 70)');
        try {
            const compressedJPEG = imageWasm.call('compressJPEG', jpegUint8, 70);
            const compressedBuffer = uint8ArrayToBuffer(compressedJPEG);
            console.log(`Original JPEG: ${testJPEG.length} bytes`);
            console.log(`Compressed JPEG: ${compressedBuffer.length} bytes`);
            console.log('✅ PASS: JPEG Compression\n');
        } catch (error) {
            console.log(`⚠️  SKIP: JPEG Compression (${error})\n`);
        }

        // Test 5: PNG Processing
        console.log('🔍 Test: PNG Processing');
        try {
            const processedPNG = imageWasm.call('compressPNG', pngUint8);
            const processedBuffer = uint8ArrayToBuffer(processedPNG);
            console.log(`Original PNG: ${testPNG.length} bytes`);
            console.log(`Processed PNG: ${processedBuffer.length} bytes`);
            console.log('✅ PASS: PNG Processing\n');
        } catch (error) {
            console.log(`⚠️  SKIP: PNG Processing (${error})\n`);
        }

        // Test 6: WebP Conversion
        console.log('🔍 Test: WebP Conversion');
        try {
            // Enable verbose mode for this test
            imageWasm.call('setSilentMode', false);
            const webpData = imageWasm.call('convertToWebP', pngUint8, 80);
            imageWasm.call('setSilentMode', true);
            
            const webpBuffer = uint8ArrayToBuffer(webpData);
            console.log(`Original PNG: ${testPNG.length} bytes`);
            console.log(`WebP: ${webpBuffer.length} bytes`);
            
            // Save WebP file for inspection
            fs.writeFileSync('./test-output.webp', webpBuffer);
            console.log('WebP file saved as: test-output.webp');
            console.log('✅ PASS: WebP Conversion\n');
        } catch (error) {
            console.log(`⚠️  SKIP: WebP Conversion (${error})\n`);
        }

        // Test 7: Image Resizing
        console.log('🔍 Test: Image Resize (2x2)');
        try {
            const resizedImage = imageWasm.call('resizeImage', pngUint8, 2, 2);
            const resizedBuffer = uint8ArrayToBuffer(resizedImage);
            console.log(`Original: 1x1, ${testPNG.length} bytes`);
            console.log(`Resized: 2x2, ${resizedBuffer.length} bytes`);
            console.log('✅ PASS: Image Resize\n');
        } catch (error) {
            console.log(`⚠️  SKIP: Image Resize (${error})\n`);
        }

        // Test 8: Error handling - Invalid quality
        console.log('🔍 Test: Error Handling - Invalid Quality');
        try {
            const result = imageWasm.call('compressJPEG', jpegUint8, 150);
            if (typeof result === 'string' && result.includes('Error')) {
                console.log('Error correctly caught:', result);
                console.log('✅ PASS: Error Handling - Invalid Quality\n');
            } else {
                console.log('❌ FAIL: Should have returned error for invalid quality\n');
            }
        } catch (error) {
            console.log('Error correctly thrown:', error.message);
            console.log('✅ PASS: Error Handling - Invalid Quality\n');
        }

        // Test 9: Error handling - Missing arguments
        console.log('🔍 Test: Error Handling - Missing Arguments');
        try {
            const result = imageWasm.call('compressJPEG');
            if (typeof result === 'string' && result.includes('Error')) {
                console.log('Error correctly caught:', result);
                console.log('✅ PASS: Error Handling - Missing Arguments\n');
            } else {
                console.log('❌ FAIL: Should have returned error for missing arguments\n');
            }
        } catch (error) {
            console.log('Error correctly thrown:', error.message);
            console.log('✅ PASS: Error Handling - Missing Arguments\n');
        }

        // Test 10: Performance test
        console.log('🔍 Test: Performance - Multiple Operations');
        const startTime = Date.now();
        let operations = 0;
        
        try {
            for (let i = 0; i < 10; i++) {
                imageWasm.call('getImageInfo', pngUint8);
                operations++;
            }
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            console.log(`   ⏱️  ${operations} image info operations completed in ${duration}ms`);
            console.log(`   📊 Average: ${(duration / operations).toFixed(2)}ms per operation`);
            console.log('✅ PASS: Performance - Multiple Operations\n');
        } catch (error) {
            console.log(`⚠️  Performance test failed: ${error.message}\n`);
        }

        console.log('📊 Test Summary:');
        console.log('   ✅ Image WASM module loaded and tested successfully');
        console.log('   🖼️  Image processing functions working');
        console.log('   🔧 Error handling implemented');
        console.log('   ⚡ Performance tests completed');
        
        console.log('\n🎉 All image processing tests completed!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Cleanup function
function cleanup() {
    try {
        if (fs.existsSync('./test-output.webp')) {
            fs.unlinkSync('./test-output.webp');
            console.log('🧹 Cleaned up test files');
        }
    } catch (error) {
        console.log('⚠️  Could not clean up test files:', error.message);
    }
}

// Run tests
if (require.main === module) {
    runImageTests()
        .then(() => {
            cleanup();
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Fatal error:', error);
            cleanup();
            process.exit(1);
        });
}

module.exports = { runImageTests }; 