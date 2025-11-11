#!/usr/bin/env node
/**
 * Build Validation Script
 * Validates that build output is correct and all placeholders are replaced
 * 
 * Usage: node scripts/validate-build.js
 */

const fs = require('fs');
const path = require('path');

// Get root directory (parent of scripts/)
const ROOT_DIR = path.join(__dirname, '..');

const errors = [];
const warnings = [];

// Files that should have placeholders replaced
const filesToCheck = [
    {
        file: 'firebase-config.js',
        placeholders: [
            'VITE_FIREBASE_API_KEY',
            'VITE_FIREBASE_AUTH_DOMAIN',
            'VITE_FIREBASE_PROJECT_ID',
            'VITE_FIREBASE_STORAGE_BUCKET',
            'VITE_FIREBASE_MESSAGING_SENDER_ID',
            'VITE_FIREBASE_APP_ID',
            'VITE_FIREBASE_MEASUREMENT_ID'
        ]
    },
    {
        file: 'js/github-api.js',
        placeholders: ['VITE_GITHUB_TOKEN']
    },
    {
        file: 'js/auth.js',
        placeholders: ['VITE_ADMIN_EMAIL']
    }
];

console.log('🔍 Validating build output...\n');

filesToCheck.forEach(({ file, placeholders }) => {
    const filePath = path.join(ROOT_DIR, file);
    
    if (!fs.existsSync(filePath)) {
        errors.push(`❌ File not found: ${file}`);
        return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    placeholders.forEach(placeholder => {
        // Check if placeholder still exists (should be replaced)
        if (content.includes(placeholder)) {
            // Check if it's in a comment or string (which is okay)
            const lines = content.split('\n');
            let foundInCode = false;
            
            lines.forEach((line, index) => {
                // Skip comments
                if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
                    return;
                }
                
                // Check if placeholder is in actual code (not in comments)
                if (line.includes(placeholder) && !line.includes('//')) {
                    foundInCode = true;
                    errors.push(`❌ ${file}:${index + 1} - Placeholder ${placeholder} not replaced in code`);
                }
            });
        }
    });
    
    // Check for common test values that shouldn't be in production
    const testPatterns = [
        /test_api_key/,
        /test_token/,
        /test-project/,
        /test\.firebaseapp\.com/
    ];
    
    testPatterns.forEach(pattern => {
        if (pattern.test(content)) {
            warnings.push(`⚠️  ${file} - Test value detected (may be intentional in CI)`);
        }
    });
});

// Summary
console.log('\n📊 Validation Summary:\n');

if (errors.length > 0) {
    console.error('❌ ERRORS FOUND:');
    errors.forEach(error => console.error(`  ${error}`));
    console.error('\n❌ Build validation failed!');
    process.exit(1);
}

if (warnings.length > 0) {
    console.warn('⚠️  WARNINGS:');
    warnings.forEach(warning => console.warn(`  ${warning}`));
}

if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All placeholders replaced correctly');
    console.log('✅ Build validation passed!');
    process.exit(0);
} else if (errors.length === 0) {
    console.log('✅ Build validation passed with warnings');
    process.exit(0);
}

