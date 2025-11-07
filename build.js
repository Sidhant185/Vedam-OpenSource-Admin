/**
 * Build script to inject environment variables into static files
 * This replaces import.meta.env references with actual values
 * Run this before deploying: node build.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Files that need environment variable replacement
const filesToProcess = [
  {
    file: 'firebase-config.js',
    replacements: {
      '"VITE_FIREBASE_API_KEY"': process.env.VITE_FIREBASE_API_KEY || '',
      '"VITE_FIREBASE_AUTH_DOMAIN"': process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      '"VITE_FIREBASE_PROJECT_ID"': process.env.VITE_FIREBASE_PROJECT_ID || '',
      '"VITE_FIREBASE_STORAGE_BUCKET"': process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      '"VITE_FIREBASE_MESSAGING_SENDER_ID"': process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      '"VITE_FIREBASE_APP_ID"': process.env.VITE_FIREBASE_APP_ID || '',
      '"VITE_FIREBASE_MEASUREMENT_ID"': process.env.VITE_FIREBASE_MEASUREMENT_ID || '',
    }
  },
  {
    file: 'js/github-api.js',
    replacements: {
      "'VITE_GITHUB_TOKEN'": process.env.VITE_GITHUB_TOKEN ? `'${process.env.VITE_GITHUB_TOKEN}'` : "''",
    }
  }
];

// Process each file
filesToProcess.forEach(({ file, replacements }) => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  Object.entries(replacements).forEach(([key, value]) => {
    // Create regex to match the key (escape special characters)
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedKey, 'g');
    
    if (content.includes(key)) {
      // Replace with actual value or keep fallback
      if (value) {
        content = content.replace(regex, `"${value}"`);
        modified = true;
        console.log(`✅ Replaced ${key} in ${file}`);
      } else {
        console.warn(`⚠️  ${key} not found in environment variables, keeping fallback`);
      }
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${file}`);
  } else {
    console.log(`ℹ️  No changes needed for ${file}`);
  }
});

console.log('\n✨ Build complete!');

