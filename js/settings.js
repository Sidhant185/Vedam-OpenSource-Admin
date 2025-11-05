// Settings Page Module
import { getCurrentUser } from './auth.js';

/**
 * Load settings page
 */
export function loadSettings() {
    const user = getCurrentUser();
    
    const adminEmailInput = document.getElementById('adminEmailInput');
    const lastUpdated = document.getElementById('lastUpdated');
    
    if (adminEmailInput && user) {
        adminEmailInput.value = user.email;
    }
    
    if (lastUpdated) {
        lastUpdated.textContent = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

