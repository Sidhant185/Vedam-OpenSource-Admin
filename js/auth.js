// Authentication Module
import { 
    auth, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from '../firebase-config.js';

// Admin email from environment variable (injected at build time)
// Password is handled by Firebase Auth - not stored in code
const ADMIN_EMAIL = 'VITE_ADMIN_EMAIL'; // Placeholder - replaced at build time

let currentUser = null;
let authStateListeners = [];

/**
 * Initialize authentication
 * @param {Function} onAuthenticated - Callback when user is authenticated
 * @param {Function} onUnauthenticated - Callback when user is not authenticated
 */
export function initializeAuth(onAuthenticated, onUnauthenticated) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                if (await checkAdminStatus(user)) {
                    currentUser = user;
                    if (onAuthenticated) onAuthenticated(user);
                } else {
                    await signOut(auth);
                    if (onUnauthenticated) onUnauthenticated();
                }
            } catch (error) {
                console.error('Auth error:', error);
                await signOut(auth);
                if (onUnauthenticated) onUnauthenticated();
            }
        } else {
            currentUser = null;
            if (onUnauthenticated) onUnauthenticated();
        }
    });
}

/**
 * Check if user has admin privileges
 * @param {Object} user - Firebase user object
 * @returns {Promise<boolean>} - True if admin
 */
async function checkAdminStatus(user) {
    return user.email === ADMIN_EMAIL;
}

/**
 * Admin login
 * @param {string} email - Email address
 * @param {string} password - Password
 * @returns {Promise<Object>} - User object
 */
export async function adminLogin(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Check if user is admin
        if (user.email !== ADMIN_EMAIL) {
            await signOut(auth);
            throw new Error('Access denied. Admin privileges required.');
        }
        
        currentUser = user;
        return user;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

/**
 * Admin logout
 */
export async function adminLogout() {
    try {
        await signOut(auth);
        currentUser = null;
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

/**
 * Get current user
 * @returns {Object|null} - Current user or null
 */
export function getCurrentUser() {
    return currentUser;
}

