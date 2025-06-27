#!/usr/bin/env node

/**
 * Simple HTTP server for GoWM browser examples
 * This avoids CORS issues when loading files locally
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const ROOT_DIR = path.resolve(__dirname, '../..');

// MIME types mapping
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wasm': 'application/wasm'
};

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return mimeTypes[ext] || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
    let pathname = url.parse(req.url).pathname;

    // Default to index.html for root path
    if (pathname === '/' || pathname === '') {
        pathname = '/examples/browser/index.html';
    }

    // Resolve file path
    const filePath = path.join(ROOT_DIR, pathname);

    // Security check - ensure file is within root directory
    if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
        }

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // Set content type
        const mimeType = getMimeType(filePath);
        res.setHeader('Content-Type', mimeType);

        // Stream file
        const readStream = fs.createReadStream(filePath);
        readStream.pipe(res);

        readStream.on('error', (err) => {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Server error');
        });
    });
});

server.listen(PORT, () => {
    console.log(`🚀 GoWM Browser Example Server running at:`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`   http://localhost:${PORT}/examples/browser/`);
    console.log(`\n📁 Serving files from: ${ROOT_DIR}`);
    console.log(`\n🛑 Press Ctrl+C to stop`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Try a different port or stop the other server.`);
    } else {
        console.error('❌ Server error:', err);
    }
    process.exit(1);
});
