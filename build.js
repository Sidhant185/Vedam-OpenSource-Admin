/**
 * Build script to inject environment variables into static files
 * This replaces placeholders with actual values from environment variables
 * 
 * IMPORTANT: 
 * - For Netlify/CI: Modifies source files directly (they get deployed)
 * - For local dev: Use dev server (scripts/dev-server.js) which does on-the-fly replacement
 * - Source files should be restored to placeholders before committing
 */

const fs = require('fs');
const path = require('path');

// Check if running in CI/CD environment (Netlify, GitHub Actions, etc.)
const isCI = process.env.CI === 'true' || process.env.NETLIFY === 'true' || process.env.GITHUB_ACTIONS === 'true';

if (!isCI) {
  console.log('⚠️  WARNING: This script modifies source files!');
  console.log('💡 For local development, use: npm run dev');
  console.log('   (It uses a dev server with on-the-fly replacement)\n');
  console.log('📋 This script is intended for Netlify/CI deployment only.\n');
  process.exit(1);
}

// Load environment variables
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

// Optional environment variables (will use placeholder if not set)
const optionalEnvVars = [
  'VITE_ADMIN_EMAIL', // Admin email for authentication
  'VITE_GITHUB_TOKEN' // GitHub token (optional but recommended)
];

// Check for missing required environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName] || process.env[varName].trim() === '');

// Warn about missing optional vars but don't fail
const missingOptionalVars = optionalEnvVars.filter(varName => !process.env[varName] || process.env[varName].trim() === '');
if (missingOptionalVars.length > 0 && !isCI) {
  console.warn('\n⚠️  WARNING: Missing optional environment variables:');
  missingOptionalVars.forEach(varName => {
    console.warn(`   - ${varName} (will use placeholder)`);
  });
  console.warn('   These are optional but recommended for full functionality.\n');
}

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
    console.error('\n   🔗 Netlify Dashboard: https://app.netlify.com/');
  } else {
    console.error('   1. Create a .env file in the project root');
    console.error('   2. Add your Firebase credentials to .env');
    console.error('   3. Get Firebase credentials from: https://console.firebase.google.com/');
    console.error('   4. Run npm run build again');
    console.error('\n   📖 See SETUP.md or README.md for detailed instructions');
  }
  console.error('\n💡 Required variables:');
  requiredEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  process.exit(1);
}

// Files to copy and process
const filesToProcess = [
  {
    source: 'firebase-config.js',
    target: 'firebase-config.js',
    replacements: {
      '"VITE_FIREBASE_API_KEY"': `"${process.env.VITE_FIREBASE_API_KEY}"`,
      '"VITE_FIREBASE_AUTH_DOMAIN"': `"${process.env.VITE_FIREBASE_AUTH_DOMAIN}"`,
      '"VITE_FIREBASE_PROJECT_ID"': `"${process.env.VITE_FIREBASE_PROJECT_ID}"`,
      '"VITE_FIREBASE_STORAGE_BUCKET"': `"${process.env.VITE_FIREBASE_STORAGE_BUCKET}"`,
      '"VITE_FIREBASE_MESSAGING_SENDER_ID"': `"${process.env.VITE_FIREBASE_MESSAGING_SENDER_ID}"`,
      '"VITE_FIREBASE_APP_ID"': `"${process.env.VITE_FIREBASE_APP_ID}"`,
      '"VITE_FIREBASE_MEASUREMENT_ID"': `"${process.env.VITE_FIREBASE_MEASUREMENT_ID}"`,
    }
  },
  {
    source: 'js/github-api.js',
    target: 'js/github-api.js',
    replacements: {
      "const GITHUB_TOKEN = 'VITE_GITHUB_TOKEN'": process.env.VITE_GITHUB_TOKEN && process.env.VITE_GITHUB_TOKEN.trim() !== '' 
        ? `const GITHUB_TOKEN = '${process.env.VITE_GITHUB_TOKEN}'` 
        : "const GITHUB_TOKEN = 'VITE_GITHUB_TOKEN'", // Keep placeholder if not set
    }
  },
  {
    source: 'js/auth.js',
    target: 'js/auth.js',
    replacements: {
      "const ADMIN_EMAIL = 'VITE_ADMIN_EMAIL';": process.env.VITE_ADMIN_EMAIL && process.env.VITE_ADMIN_EMAIL.trim() !== ''
        ? `const ADMIN_EMAIL = '${process.env.VITE_ADMIN_EMAIL}';`
        : "const ADMIN_EMAIL = 'VITE_ADMIN_EMAIL';", // Keep placeholder if not set
    }
  }
];

// Process files that need environment variable replacement (modify source files directly)
console.log('📦 Injecting environment variables into source files...');
console.log('⚠️  This modifies source files - only run in CI/Netlify!\n');

filesToProcess.forEach(({ source, target, replacements }) => {
  const sourcePath = path.join(__dirname, source);
  
  if (!fs.existsSync(sourcePath)) {
    console.warn(`⚠️  Source file not found: ${source}`);
    return;
  }
  
  let content = fs.readFileSync(sourcePath, 'utf8');
  let modified = false;
  
  Object.entries(replacements).forEach(([key, value]) => {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedKey, 'g');
    
    if (content.includes(key)) {
      content = content.replace(regex, value);
      modified = true;
      console.log(`✅ Replaced ${key} in ${source}`);
    }
  });
  
  if (modified) {
    fs.writeFileSync(sourcePath, content);
    console.log(`✅ Updated ${source}`);
  } else {
    console.log(`ℹ️  No changes needed for ${source}`);
  }
});

console.log('\n✨ Build complete! Environment variables injected into source files.');
console.log('📦 Netlify will deploy these files directly.');

// Run validation if script exists (only in CI/CD)
if (isCI) {
  const validateScript = path.join(__dirname, 'scripts', 'validate-build.js');
  if (fs.existsSync(validateScript)) {
    try {
      console.log('\n🔍 Running build validation...');
      require('child_process').execSync(`node ${validateScript}`, { stdio: 'inherit', cwd: __dirname });
      console.log('✅ Build validation passed!');
    } catch (error) {
      console.warn('⚠️  Build validation script not available or failed');
    }
  }
}
