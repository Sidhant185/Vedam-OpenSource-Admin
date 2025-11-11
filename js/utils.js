// Utility Functions

/**
 * Shows loading overlay
 */
export function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
    }
}

/**
 * Hides loading overlay
 */
export function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
    }
}

/**
 * Toast Notification System
 */
let toastContainer = null;

function initToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        toastContainer.id = 'toastContainer';
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - Type of toast: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds (default: 4000)
 */
export function showToast(message, type = 'info', duration = 4000) {
    showToastNotification(message, type, duration);
}

/**
 * Internal toast notification function
 * @param {string} message - The message to display
 * @param {string} type - Type of toast: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds (default: 4000)
 */
function showToastNotification(message, type = 'info', duration = 4000) {
    initToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${icons[type] || icons.info}"></i>
            <span class="toast-message">${escapeHtml(message)}</span>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto dismiss
    if (duration > 0) {
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
    
    return toast;
}

/**
 * Helper to escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Formats a date to a readable string
 * @param {string|Date} date - The date to format
 * @returns {string} - Formatted date string
 */
export function formatDate(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

/**
 * Formats a date with time
 * @param {string|Date} date - The date to format
 * @returns {string} - Formatted date string with time
 */
export function formatDateTime(date) {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Gets the last N days as an array
 * @param {number} days - Number of days to get (default: 7)
 * @returns {Array<string>} - Array of formatted date strings
 */
export function getLastNDays(days = 7) {
    const dayArray = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dayArray.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    return dayArray;
}

/**
 * Gets member display name
 * @param {Object} member - Member object
 * @returns {string} - Display name
 */
export function getMemberDisplayName(member) {
    if (member.displayName) return member.displayName;
    const firstName = member.firstName || '';
    const lastName = member.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || 'N/A';
}

/**
 * Gets member email
 * @param {Object} member - Member object
 * @returns {string} - Email address
 */
export function getMemberEmail(member) {
    return member.email || member.personalEmail || 'N/A';
}

/**
 * Gets member phone number
 * @param {Object} member - Member object
 * @returns {string} - Phone number
 */
export function getMemberPhone(member) {
    return member.phoneNumber || member.whatsappNumber || 'N/A';
}

/**
 * Downloads content as CSV file
 * @param {string} content - CSV content
 * @param {string} filename - Filename for download
 */
export function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

/**
 * Formats number with commas
 * @param {number} num - Number to format
 * @returns {string} - Formatted number
 */
export function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return num.toLocaleString();
}

/**
 * Centralized Error Handler
 * Provides consistent error handling across the application
 */
class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 100; // Keep last 100 errors
    }

    /**
     * Handle an error with context
     * @param {Error|string} error - Error object or error message
     * @param {Object} context - Additional context (user, action, etc.)
     * @param {Object} options - Options for error handling
     * @param {boolean} options.showToast - Show toast notification (default: true)
     * @param {boolean} options.logToConsole - Log to console (default: true)
     * @param {string} options.userMessage - Custom user-facing message
     * @param {boolean} options.showRecovery - Show recovery suggestions (default: false)
     */
    handle(error, context = {}, options = {}) {
        const {
            showToast = true,
            logToConsole = true,
            userMessage = null,
            showRecovery = false
        } = options;

        // Extract error information
        const errorInfo = {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : null,
            timestamp: new Date().toISOString(),
            context: {
                user: context.user || 'unknown',
                action: context.action || 'unknown',
                module: context.module || 'unknown',
                ...context
            }
        };

        // Add to error log
        this.errorLog.push(errorInfo);
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog.shift(); // Remove oldest
        }

        // Log to console if enabled
        if (logToConsole) {
            console.error('Error:', errorInfo.message, {
                context: errorInfo.context,
                stack: errorInfo.stack
            });
        }

        // Show user-friendly message
        if (showToast) {
            const message = userMessage || this.getUserFriendlyMessage(errorInfo.message, errorInfo.context);
            // Call the showToast function defined in this module
            showToastNotification(message, 'error', 6000);
            
            // Show recovery suggestions if enabled
            if (showRecovery) {
                const recovery = this.getRecoverySuggestion(errorInfo.message, errorInfo.context);
                if (recovery) {
                    setTimeout(() => {
                        showToastNotification(recovery, 'info', 8000);
                    }, 1000);
                }
            }
        }

        return errorInfo;
    }

    /**
     * Get user-friendly error message
     * @param {string} errorMessage - Original error message
     * @param {Object} context - Error context
     * @returns {string} - User-friendly message
     */
    getUserFriendlyMessage(errorMessage, context) {
        // Network errors
        if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
            return 'Network error. Please check your internet connection and try again.';
        }

        // Firebase errors
        if (errorMessage.includes('Firebase') || errorMessage.includes('firebase')) {
            if (errorMessage.includes('permission')) {
                return 'Permission denied. You may not have access to perform this action.';
            }
            if (errorMessage.includes('not-found') || errorMessage.includes('404')) {
                return 'The requested data was not found.';
            }
            return 'Database error. Please try again later.';
        }

        // GitHub API errors
        if (errorMessage.includes('GitHub') || errorMessage.includes('github')) {
            if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
                return 'GitHub API rate limit reached. Please wait a few minutes and try again.';
            }
            if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
                return 'GitHub API access denied. Please check your token permissions.';
            }
            if (errorMessage.includes('409') || errorMessage.includes('Conflict')) {
                return 'GitHub API conflict. The request could not be completed.';
            }
            return 'GitHub API error. Please try again later.';
        }

        // Authentication errors
        if (errorMessage.includes('auth') || errorMessage.includes('login') || errorMessage.includes('password')) {
            if (errorMessage.includes('user-not-found')) {
                return 'User not found. Please check your email address.';
            }
            if (errorMessage.includes('wrong-password') || errorMessage.includes('invalid-credential')) {
                return 'Incorrect email or password. Please try again.';
            }
            if (errorMessage.includes('too-many-requests')) {
                return 'Too many login attempts. Please wait a few minutes before trying again.';
            }
            return 'Authentication error. Please check your credentials and try again.';
        }

        // Generic errors
        return errorMessage || 'An unexpected error occurred. Please try again.';
    }

    /**
     * Get recovery suggestion for error
     * @param {string} errorMessage - Error message
     * @param {Object} context - Error context
     * @returns {string|null} - Recovery suggestion or null
     */
    getRecoverySuggestion(errorMessage, context) {
        if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            return '💡 Tip: Check your internet connection. If the problem persists, try refreshing the page.';
        }
        
        if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
            return '💡 Tip: GitHub API has rate limits. Wait 1 hour or add a GitHub token for higher limits.';
        }

        if (errorMessage.includes('permission') || errorMessage.includes('403')) {
            return '💡 Tip: You may need admin privileges or valid API tokens to perform this action.';
        }

        return null;
    }

    /**
     * Get error log
     * @returns {Array} - Array of error information
     */
    getErrorLog() {
        return [...this.errorLog];
    }

    /**
     * Clear error log
     */
    clearErrorLog() {
        this.errorLog = [];
    }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

/**
 * Centralized error handling function
 * @param {Error|string} error - Error object or error message
 * @param {Object} context - Additional context
 * @param {Object} options - Options for error handling
 * @returns {Object} - Error information
 */
export function handleError(error, context = {}, options = {}) {
    return errorHandler.handle(error, context, options);
}

/**
 * Get error log for debugging
 * @returns {Array} - Array of error information
 */
export function getErrorLog() {
    return errorHandler.getErrorLog();
}

/**
 * Clear error log
 */
export function clearErrorLog() {
    errorHandler.clearErrorLog();
}

/**
 * Debounce function - delays execution until after wait time has passed
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds (default: 300)
 * @param {boolean} immediate - If true, trigger on leading edge instead of trailing (default: false)
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait = 300, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

/**
 * Throttle function - limits execution to at most once per wait time
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds (default: 300)
 * @returns {Function} - Throttled function
 */
export function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

