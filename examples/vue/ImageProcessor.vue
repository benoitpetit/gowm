<template>
  <div class="container">
    <h1 class="title">🖼️ GoWM Image Processor</h1>
    <p class="subtitle">Vue 3 + Go Wasm Image Processing</p>
    
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading image WASM module...</p>
    </div>
    
    <div v-else-if="error" class="error">
      <h3>❌ Error Loading Module</h3>
      <p>{{ error.message }}</p>
    </div>
    
    <div v-else class="processor">
      <!-- File Upload -->
      <div class="input-group">
        <label class="label">Select Image:</label>
        <input 
          type="file" 
          @change="handleFileSelect" 
          accept="image/*"
          class="file-input"
        >
      </div>
      
      <!-- Processing Options -->
      <div v-if="selectedFile" class="options">
        <div class="input-group">
          <label class="label">Operation:</label>
          <select v-model="operation" class="select">
            <option value="compressJPEG">Compress JPEG</option>
            <option value="compressPNG">Compress PNG</option>
            <option value="convertToWebP">Convert to WebP</option>
            <option value="resizeImage">Resize Image</option>
          </select>
        </div>
        
        <!-- Quality for compression -->
        <div v-if="operation.includes('compress')" class="input-group">
          <label class="label">Quality (1-100):</label>
          <input 
            v-model.number="quality" 
            type="range" 
            min="1" 
            max="100" 
            class="slider"
          >
          <span class="quality-value">{{ quality }}%</span>
        </div>
        
        <!-- Dimensions for resize -->
        <div v-if="operation === 'resizeImage'" class="resize-options">
          <div class="input-group">
            <label class="label">Width:</label>
            <input v-model.number="width" type="number" class="input" min="1">
          </div>
          <div class="input-group">
            <label class="label">Height:</label>
            <input v-model.number="height" type="number" class="input" min="1">
          </div>
        </div>
        
        <button @click="processImage" :disabled="processing" class="button">
          {{ processing ? 'Processing...' : 'Process Image' }}
        </button>
      </div>
      
      <!-- Results -->
      <div v-if="processedImage" class="results">
        <h3>Results</h3>
        <div class="images">
          <div class="image-preview">
            <h4>Original</h4>
            <img :src="originalImageUrl" alt="Original" class="preview-image">
            <p>Size: {{ formatFileSize(originalSize) }}</p>
          </div>
          <div class="image-preview">
            <h4>Processed</h4>
            <img :src="processedImageUrl" alt="Processed" class="preview-image">
            <p>Size: {{ formatFileSize(processedSize) }}</p>
            <p class="savings" v-if="originalSize > processedSize">
              Saved: {{ Math.round((1 - processedSize/originalSize) * 100) }}%
            </p>
          </div>
        </div>
        <button @click="downloadImage" class="button download-btn">
          Download Processed Image
        </button>
      </div>
      
      <!-- Module Info -->
      <div v-if="wasm" class="info">
        <p><strong>Module:</strong> {{ wasm.getStats().name }}</p>
        <p><strong>Status:</strong> {{ wasm.getStats().ready ? 'Ready' : 'Loading' }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useWasmFromGitHub } from 'gowm/composables/useWasm';

export default {
  name: 'ImageProcessor',
  setup() {
    // WASM module loading
    const { wasm, loading, error } = useWasmFromGitHub('benoitpetit/wasm-modules-repository', {
      path: 'image-wasm',
      filename: 'main.wasm',
      name: 'image',
      branch: 'master'
    });

    // Component state
    const selectedFile = ref(null);
    const operation = ref('compressJPEG');
    const quality = ref(80);
    const width = ref(800);
    const height = ref(600);
    const processing = ref(false);
    const processedImage = ref(null);
    const originalImageUrl = ref('');
    const processedImageUrl = ref('');
    const originalSize = ref(0);
    const processedSize = ref(0);

    // Handle file selection
    const handleFileSelect = (event) => {
      const file = event.target.files[0];
      if (file) {
        selectedFile.value = file;
        originalSize.value = file.size;
        
        // Create preview URL
        const reader = new FileReader();
        reader.onload = (e) => {
          originalImageUrl.value = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    };

    // Process image using WASM
    const processImage = async () => {
      if (!wasm.value || !selectedFile.value) return;

      processing.value = true;
      
      try {
        // Convert file to base64
        const base64 = await fileToBase64(selectedFile.value);
        const imageData = base64.split(',')[1]; // Remove data:image prefix
        
        let result;
        
        // Call appropriate WASM function
        switch (operation.value) {
          case 'compressJPEG':
            result = wasm.value.call('compressJPEG', imageData, quality.value);
            break;
          case 'compressPNG':
            result = wasm.value.call('compressPNG', imageData, quality.value);
            break;
          case 'convertToWebP':
            result = wasm.value.call('convertToWebP', imageData, quality.value);
            break;
          case 'resizeImage':
            result = wasm.value.call('resizeImage', imageData, width.value, height.value);
            break;
        }
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        // Create processed image URL
        const mimeType = operation.value === 'convertToWebP' ? 'image/webp' : 
                         operation.value.includes('PNG') ? 'image/png' : 'image/jpeg';
        processedImageUrl.value = `data:${mimeType};base64,${result.imageData}`;
        processedImage.value = result.imageData;
        processedSize.value = Math.round(result.imageData.length * 0.75); // Approximate size
        
      } catch (err) {
        console.error('Processing error:', err);
        alert(`Processing failed: ${err.message}`);
      } finally {
        processing.value = false;
      }
    };

    // Download processed image
    const downloadImage = () => {
      if (!processedImage.value) return;
      
      const link = document.createElement('a');
      link.download = `processed_${selectedFile.value.name}`;
      link.href = processedImageUrl.value;
      link.click();
    };

    // Helper functions
    const fileToBase64 = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return {
      wasm,
      loading,
      error,
      selectedFile,
      operation,
      quality,
      width,
      height,
      processing,
      processedImage,
      originalImageUrl,
      processedImageUrl,
      originalSize,
      processedSize,
      handleFileSelect,
      processImage,
      downloadImage,
      formatFileSize
    };
  }
};
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.title {
  color: #1e293b;
  text-align: center;
  margin-bottom: 8px;
}

.subtitle {
  color: #64748b;
  text-align: center;
  margin-bottom: 30px;
}

.processor {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.input-group {
  margin-bottom: 20px;
}

.label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.file-input, .input, .select {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 16px;
  box-sizing: border-box;
}

.slider {
  width: 100%;
  margin-bottom: 10px;
}

.quality-value {
  font-weight: 500;
  color: #3b82f6;
}

.resize-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.button {
  width: 100%;
  background: #3b82f6;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  margin-bottom: 20px;
}

.button:hover {
  background: #2563eb;
}

.button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.download-btn {
  background: #059669;
  margin-top: 20px;
}

.download-btn:hover {
  background: #047857;
}

.results {
  margin-top: 30px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 8px;
}

.images {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin: 20px 0;
}

.image-preview {
  text-align: center;
}

.preview-image {
  max-width: 100%;
  max-height: 200px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin: 10px 0;
}

.savings {
  color: #059669;
  font-weight: 500;
}

.info {
  background: #f8fafc;
  padding: 15px;
  border-radius: 8px;
  font-size: 14px;
  color: #64748b;
  margin-top: 20px;
}

.loading {
  text-align: center;
  padding: 40px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  background: #fef2f2;
  color: #ef4444;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}
</style> 