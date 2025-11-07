/**
 * Build script to inject environment variables into static files
 * This replaces import.meta.env references with actual values
 * 
 * IMPORTANT: This script modifies source files directly.
 * Only run this in CI/CD (Netlify) where files aren't committed.
 * For local development, use placeholders directly.
 * 
 * Run this before deploying: node build.js
 */

const fs = require('fs');
const path = require('path');

// Check if running in CI/CD environment
const isCI = process.env.CI === 'true' || process.env.NETLIFY === 'true' || process.env.GITHUB_ACTIONS === 'true';

if (!isCI) {
  console.warn('⚠️  WARNING: Build script modifies source files!');
  console.warn('⚠️  This should only run in CI/CD (Netlify/GitHub Actions).');
  console.warn('⚠️  For local development, use placeholders directly.');
  console.warn('⚠️  Continuing anyway (for testing purposes)...\n');
}

// Load environment variables (dotenv won't fail if .env doesn't exist)
// On Netlify, environment variables are set in the dashboard and available via process.env
require('dotenv').config();

// Required Firebase environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MEASUREMENT_ID'
];

// Check for missing required environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName] || process.env[varName].trim() === '');

if (missingVars.length > 0) {
  console.error('\n❌ ERROR: Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n📋 To fix this:');
  if (isCI) {
    console.error('   1. Go to Netlify Dashboard → Site Settings → Environment Variables');
    console.error('   2. Add all required Firebase environment variables');
    console.error('   3. Redeploy the site');
  } else {
    console.error('   1. Create a .env file in the project root');
    console.error('   2. Add all required Firebase environment variables');
    console.error('   3. See README.md or SETUP.md for details');
  }
  console.error('\n💡 Required variables:');
  requiredEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  process.exit(1);
}

// Files that need environment variable replacement
const filesToProcess = [
  {
    file: 'firebase-config.js',
    replacements: {
      '"VITE_FIREBASE_API_KEY"': process.env.VITE_FIREBASE_API_KEY,
      '"VITE_FIREBASE_AUTH_DOMAIN"': process.env.VITE_FIREBASE_AUTH_DOMAIN,
      '"VITE_FIREBASE_PROJECT_ID"': process.env.VITE_FIREBASE_PROJECT_ID,
      '"VITE_FIREBASE_STORAGE_BUCKET"': process.env.VITE_FIREBASE_STORAGE_BUCKET,
      '"VITE_FIREBASE_MESSAGING_SENDER_ID"': process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      '"VITE_FIREBASE_APP_ID"': process.env.VITE_FIREBASE_APP_ID,
      '"VITE_FIREBASE_MEASUREMENT_ID"': process.env.VITE_FIREBASE_MEASUREMENT_ID,
    }
  },
  {
    file: 'js/github-api.js',
    replacements: {
      // Only replace if token exists, otherwise keep placeholder so code can detect missing token
      "'VITE_GITHUB_TOKEN'": process.env.VITE_GITHUB_TOKEN && process.env.VITE_GITHUB_TOKEN.trim() !== '' 
        ? `'${process.env.VITE_GITHUB_TOKEN}'` 
        : "'VITE_GITHUB_TOKEN'", // Keep placeholder if not set
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
      // Replace with actual value
      if (value) {
        // Value already has quotes from the replacement definition, use as-is
        content = content.replace(regex, value);
        modified = true;
        console.log(`✅ Replaced ${key} in ${file}`);
      } else {
        // This shouldn't happen for required vars (we check above), but handle gracefully
        console.warn(`⚠️  ${key} not found in environment variables`);
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

