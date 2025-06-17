# Image Processing WASM Module

This module provides image compression and processing capabilities using Go WebAssembly.

## Features

- ✅ **JPEG Compression** with quality control (1-100)
- ✅ **PNG Processing** with optimization
- ✅ **Image Resizing** with custom dimensions
- ✅ **WebP-like Optimization** (using high-quality JPEG compression)
- ✅ **Image Information** extraction (format, dimensions, size)
- ✅ **Error Handling** for invalid inputs
- ✅ **Performance Optimized** for web use

## Building

```bash
# Build the WASM module
./build.sh
```

This will create:
- `main.wasm` - The WebAssembly module
- `wasm_exec.js` - Go WASM runtime

## Available Functions

### `compressJPEG(imageData: Uint8Array, quality: number): Uint8Array`
Compresses any image to JPEG format with specified quality.

**Parameters:**
- `imageData`: Image data as Uint8Array
- `quality`: Compression quality (1-100)

**Returns:** Compressed JPEG data as Uint8Array

### `compressPNG(imageData: Uint8Array): Uint8Array`
Processes and optimizes PNG images.

**Parameters:**
- `imageData`: PNG image data as Uint8Array

**Returns:** Optimized PNG data as Uint8Array

### `convertToWebP(imageData: Uint8Array, quality?: number): Uint8Array`
Converts images to an optimized format (simulated WebP using high-quality JPEG).

**Parameters:**
- `imageData`: Image data as Uint8Array
- `quality`: Optional quality (default: 75)

**Returns:** Optimized image data as Uint8Array

### `resizeImage(imageData: Uint8Array, width: number, height: number): Uint8Array`
Resizes images to specified dimensions.

**Parameters:**
- `imageData`: Image data as Uint8Array
- `width`: New width in pixels
- `height`: New height in pixels

**Returns:** Resized image data as Uint8Array

### `getImageInfo(imageData: Uint8Array): Object`
Gets information about an image.

**Parameters:**
- `imageData`: Image data as Uint8Array

**Returns:** Object with properties:
- `format`: Image format (jpeg, png, etc.)
- `width`: Image width in pixels
- `height`: Image height in pixels
- `size`: File size in bytes

### `setSilentMode(silent: boolean): boolean`
Controls console output from the module.

### `getAvailableFunctions(): Array<string>`
Returns list of available functions.

## Usage Example

```javascript
const { load } = require('gowm');

async function processImage() {
    // Load the image processing module
    const imageWasm = await load('./examples/image-wasm/main.wasm');
    
    // Read an image file
    const imageBuffer = fs.readFileSync('input.jpg');
    const imageData = new Uint8Array(imageBuffer);
    
    // Get image information
    const info = imageWasm.call('getImageInfo', imageData);
    console.log('Image info:', info);
    
    // Compress to JPEG with 80% quality
    const compressed = imageWasm.call('compressJPEG', imageData, 80);
    fs.writeFileSync('compressed.jpg', Buffer.from(compressed));
    
    // Resize to 200x200
    const resized = imageWasm.call('resizeImage', imageData, 200, 200);
    fs.writeFileSync('resized.jpg', Buffer.from(resized));
    
    // Convert to optimized format
    const optimized = imageWasm.call('convertToWebP', imageData, 75);
    fs.writeFileSync('optimized.jpg', Buffer.from(optimized));
}
```

## Browser Usage

```html
<!DOCTYPE html>
<html>
<head>
    <script src="wasm_exec.js"></script>
    <script type="module">
        import { load } from 'gowm/browser';
        
        async function processImageInBrowser() {
            const imageWasm = await load('./main.wasm');
            
            // Handle file input
            const input = document.getElementById('imageInput');
            input.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                const arrayBuffer = await file.arrayBuffer();
                const imageData = new Uint8Array(arrayBuffer);
                
                // Process the image
                const compressed = imageWasm.call('compressJPEG', imageData, 70);
                
                // Create download link
                const blob = new Blob([compressed], { type: 'image/jpeg' });
                const url = URL.createObjectURL(blob);
                // ... handle download
            });
        }
        
        processImageInBrowser();
    </script>
</head>
<body>
    <input type="file" id="imageInput" accept="image/*">
</body>
</html>
```

## Technical Details

- **Implementation**: Pure Go using standard library image packages
- **Supported Formats**: JPEG, PNG (input), JPEG (output)
- **Resizing Algorithm**: Simple bilinear interpolation
- **Memory Management**: Automatic garbage collection
- **Performance**: Optimized for web workloads

## Limitations

- WebP support is simulated using high-quality JPEG compression
- Resizing uses a simple algorithm (not advanced like Lanczos)
- Limited to formats supported by Go standard library
- Memory usage depends on image size

## Testing

Run the test suite:

```bash
cd ../../
npm run test:image
```

The tests cover:
- Function availability
- Image information extraction
- Compression with different qualities
- Resizing functionality
- Error handling
- Performance benchmarks 