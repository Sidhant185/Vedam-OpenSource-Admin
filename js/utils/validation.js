/**
 * @fileoverview Data Validation Utilities
 * Provides validation functions for user inputs, API responses, and Firestore documents
 * @module validation
 */

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email
 */
export function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Validate GitHub username
 * @param {string} username - GitHub username to validate
 * @returns {boolean} - True if valid GitHub username
 */
export function isValidGitHubUsername(username) {
    if (!username || typeof username !== 'string') return false;
    // GitHub username: alphanumeric and hyphens, 1-39 chars, cannot start/end with hyphen
    const githubRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
    return githubRegex.test(username.trim());
}

/**
 * Validate phone number (basic validation)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid phone number
 */
export function isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    // Remove common formatting characters
    const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
    // Check if it's all digits and has reasonable length (7-15 digits)
    return /^\d{7,15}$/.test(cleaned);
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid URL
 */
export function isValidUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate member object structure
 * @param {Object} member - Member object to validate
 * @returns {{valid: boolean, errors: Array<string>}} - Validation result
 */
export function validateMember(member) {
    const errors = [];
    
    if (!member || typeof member !== 'object') {
        return { valid: false, errors: ['Member must be an object'] };
    }
    
    // Required fields
    if (!member.firstName && !member.displayName) {
        errors.push('Member must have firstName or displayName');
    }
    
    // Optional but validate if present
    if (member.email && !isValidEmail(member.email)) {
        errors.push('Invalid email format');
    }
    
    if (member.personalEmail && !isValidEmail(member.personalEmail)) {
        errors.push('Invalid personal email format');
    }
    
    if (member.githubUsername && !isValidGitHubUsername(member.githubUsername)) {
        errors.push('Invalid GitHub username format');
    }
    
    if (member.phoneNumber && !isValidPhone(member.phoneNumber)) {
        errors.push('Invalid phone number format');
    }
    
    // Validate GitHub activity structure if present
    if (member.githubActivity) {
        const activityErrors = validateGitHubActivity(member.githubActivity);
        errors.push(...activityErrors);
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate GitHub activity object structure
 * @param {Object} activity - GitHub activity object to validate
 * @returns {Array<string>} - Array of error messages
 */
export function validateGitHubActivity(activity) {
    const errors = [];
    
    if (!activity || typeof activity !== 'object') {
        return ['GitHub activity must be an object'];
    }
    
    // Validate numeric fields
    const numericFields = [
        'publicRepos', 'privateRepos', 'followers', 'following',
        'commits', 'pullRequests', 'mergedPRs', 'openPRs', 'closedPRs',
        'issues', 'totalStars', 'totalForks'
    ];
    
    numericFields.forEach(field => {
        if (activity[field] !== undefined && activity[field] !== null) {
            if (typeof activity[field] !== 'number' || isNaN(activity[field]) || activity[field] < 0) {
                errors.push(`${field} must be a non-negative number`);
            }
        }
    });
    
    // Validate languages object if present
    if (activity.languages && typeof activity.languages !== 'object') {
        errors.push('Languages must be an object');
    }
    
    // Validate recentPRs array if present
    if (activity.recentPRs) {
        if (!Array.isArray(activity.recentPRs)) {
            errors.push('recentPRs must be an array');
        }
    }
    
    return errors;
}

/**
 * Validate form object structure
 * @param {Object} form - Form object to validate
 * @returns {{valid: boolean, errors: Array<string>}} - Validation result
 */
export function validateForm(form) {
    const errors = [];
    
    if (!form || typeof form !== 'object') {
        return { valid: false, errors: ['Form must be an object'] };
    }
    
    if (!form.name || typeof form.name !== 'string' || form.name.trim().length === 0) {
        errors.push('Form must have a name');
    }
    
    if (form.name && form.name.length > 100) {
        errors.push('Form name must be 100 characters or less');
    }
    
    if (form.status && !['active', 'inactive', 'draft'].includes(form.status)) {
        errors.push('Form status must be active, inactive, or draft');
    }
    
    if (form.structure && typeof form.structure !== 'object') {
        errors.push('Form structure must be an object');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Sanitize string input (prevent XSS)
 * @param {string} input - String to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeString(input) {
    if (typeof input !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

/**
 * Validate and sanitize number
 * @param {any} value - Value to validate
 * @param {Object} options - Validation options
 * @param {number} options.min - Minimum value
 * @param {number} options.max - Maximum value
 * @param {number} options.defaultValue - Default value if invalid
 * @returns {number} - Validated number
 */
export function validateNumber(value, options = {}) {
    const { min, max, defaultValue = 0 } = options;
    
    let num = typeof value === 'number' ? value : parseFloat(value);
    
    if (isNaN(num)) {
        return defaultValue;
    }
    
    if (min !== undefined && num < min) {
        num = min;
    }
    
    if (max !== undefined && num > max) {
        num = max;
    }
    
    return num;
}

/**
 * Validate date string or Date object
 * @param {string|Date} date - Date to validate
 * @returns {Date|null} - Valid Date object or null
 */
export function validateDate(date) {
    if (!date) return null;
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
        return null;
    }
    
    return dateObj;
}

/**
 * Validate required fields in object
 * @param {Object} obj - Object to validate
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {{valid: boolean, missing: Array<string>}} - Validation result
 */
export function validateRequiredFields(obj, requiredFields) {
    const missing = [];
    
    if (!obj || typeof obj !== 'object') {
        return { valid: false, missing: requiredFields };
    }
    
    requiredFields.forEach(field => {
        if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
            missing.push(field);
        }
    });
    
    return {
        valid: missing.length === 0,
        missing
    };
}

