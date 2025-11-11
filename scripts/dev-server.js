#!/usr/bin/env node
/**
 * Development Server with On-the-Fly Environment Variable Replacement
 * Serves files from root directory and replaces placeholders on-the-fly
 * No source files are modified - all replacements happen in memory
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
require('dotenv').config();

const PORT = process.env.PORT || 8001; // Default to 8001 to avoid conflict with common Python servers
const ROOT_DIR = path.join(__dirname, '..');

// Files that need environment variable replacement
const FILES_TO_PROCESS = {
  'firebase-config.js': {
    replacements: {
      '"VITE_FIREBASE_API_KEY"': `"${process.env.VITE_FIREBASE_API_KEY || 'VITE_FIREBASE_API_KEY'}"`,
      '"VITE_FIREBASE_AUTH_DOMAIN"': `"${process.env.VITE_FIREBASE_AUTH_DOMAIN || 'VITE_FIREBASE_AUTH_DOMAIN'}"`,
      '"VITE_FIREBASE_PROJECT_ID"': `"${process.env.VITE_FIREBASE_PROJECT_ID || 'VITE_FIREBASE_PROJECT_ID'}"`,
      '"VITE_FIREBASE_STORAGE_BUCKET"': `"${process.env.VITE_FIREBASE_STORAGE_BUCKET || 'VITE_FIREBASE_STORAGE_BUCKET'}"`,
      '"VITE_FIREBASE_MESSAGING_SENDER_ID"': `"${process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'VITE_FIREBASE_MESSAGING_SENDER_ID'}"`,
      '"VITE_FIREBASE_APP_ID"': `"${process.env.VITE_FIREBASE_APP_ID || 'VITE_FIREBASE_APP_ID'}"`,
      '"VITE_FIREBASE_MEASUREMENT_ID"': `"${process.env.VITE_FIREBASE_MEASUREMENT_ID || 'VITE_FIREBASE_MEASUREMENT_ID'}"`,
    }
  },
  'js/github-api.js': {
    replacements: {
      "const GITHUB_TOKEN = 'VITE_GITHUB_TOKEN'": process.env.VITE_GITHUB_TOKEN && process.env.VITE_GITHUB_TOKEN.trim() !== ''
        ? `const GITHUB_TOKEN = '${process.env.VITE_GITHUB_TOKEN}'`
        : "const GITHUB_TOKEN = 'VITE_GITHUB_TOKEN'",
    }
  },
  'js/auth.js': {
    replacements: {
      "const ADMIN_EMAIL = 'VITE_ADMIN_EMAIL';": process.env.VITE_ADMIN_EMAIL && process.env.VITE_ADMIN_EMAIL.trim() !== ''
        ? `const ADMIN_EMAIL = '${process.env.VITE_ADMIN_EMAIL}';`
        : "const ADMIN_EMAIL = 'VITE_ADMIN_EMAIL';",
    }
  }
};

// MIME types
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function processFileContent(filePath, content) {
  const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
  
  if (FILES_TO_PROCESS[relativePath]) {
    let processedContent = content;
    const { replacements } = FILES_TO_PROCESS[relativePath];
    
    Object.entries(replacements).forEach(([key, value]) => {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedKey, 'g');
      processedContent = processedContent.replace(regex, value);
    });
    
    return processedContent;
  }
  
  return content;
}

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    
    let content = data.toString();
    const mimeType = getMimeType(filePath);
    
    // Process file if it needs env replacement
    content = processFileContent(filePath, content);
    
    res.writeHead(200, { 
      'Content-Type': mimeType,
      'Cache-Control': 'no-cache'
    });
    res.end(content);
  });
}

function getFilePath(urlPath) {
  // Remove query string
  const pathname = url.parse(urlPath).pathname;
  
  // Default to index.html for root
  if (pathname === '/') {
    return path.join(ROOT_DIR, 'index.html');
  }
  
  // Remove leading slash and resolve path
  const filePath = path.join(ROOT_DIR, pathname.replace(/^\//, ''));
  
  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT_DIR)) {
    return null;
  }
  
  return filePath;
}

const server = http.createServer((req, res) => {
  const filePath = getFilePath(req.url);
  
  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }
  
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Try with .html extension
      const htmlPath = filePath + '.html';
      fs.stat(htmlPath, (err2, stats2) => {
        if (!err2 && stats2.isFile()) {
          serveFile(htmlPath, res);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        }
      });
      return;
    }
    
    serveFile(filePath, res);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Dev server running at http://localhost:${PORT}`);
  console.log(`📁 Serving from: ${ROOT_DIR}`);
  console.log(`🔧 Environment variables loaded from .env`);
  console.log(`\n💡 Press Ctrl+C to stop\n`);
});

// Handle errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Try a different port.`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});

