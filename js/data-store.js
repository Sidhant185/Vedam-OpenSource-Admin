/**
 * @fileoverview Shared Data Store for Members
 * Manages member data caching, Firebase operations, and cache expiration
 * @module data-store
 */

// Shared Data Store for Members
import { collection, getDocs, db } from '../firebase-config.js';

const CACHE_KEY = 'members_cache';
const CACHE_TIMESTAMP_KEY = 'members_cache_timestamp';
const CACHE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes

let members = [];
let lastFetchTime = 0;

/**
 * Loads members from cache if available and not expired
 * @returns {Array|null} - Cached members or null if cache is missing or expired
 */
function loadFromCache() {
    try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        
        if (!cachedData || !cachedTimestamp) {
            return null;
        }
        
        // Check if cache is expired
        const timestamp = parseInt(cachedTimestamp, 10);
        const now = Date.now();
        const age = now - timestamp;
        
        if (age > CACHE_EXPIRATION_MS) {
            console.log('Cache expired, will fetch from Firebase');
            // Clear expired cache
            clearMembersCache();
            return null;
        }
        
        // Cache exists and is fresh - use it
        const parsed = JSON.parse(cachedData);
        members = parsed;
        lastFetchTime = timestamp;
        console.log(`Loaded members from cache (age: ${Math.round(age / 1000)}s)`);
        return members;
    } catch (error) {
        console.error('Error loading from cache:', error);
        return null;
    }
}

/**
 * Saves members array to localStorage cache
 * @param {Array<Object>} membersData - Members array to cache
 * @returns {void}
 */
function saveToCache(membersData) {
    try {
        const timestamp = Date.now();
        localStorage.setItem(CACHE_KEY, JSON.stringify(membersData));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp.toString());
        lastFetchTime = timestamp;
        console.log('Saved members to cache');
    } catch (error) {
        console.error('Error saving to cache:', error);
        // If localStorage is full, try to clear old cache
        try {
            localStorage.removeItem(CACHE_KEY);
            localStorage.removeItem(CACHE_TIMESTAMP_KEY);
        } catch (e) {
            console.error('Could not clear cache:', e);
        }
    }
}

/**
 * Clears the members cache from localStorage
 * @returns {void}
 */
export function clearMembersCache() {
    try {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIMESTAMP_KEY);
        console.log('Cleared members cache');
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
}

/**
 * Loads all members from Firebase (only if cache is missing)
 * @param {boolean} skipCache - If true, skip cache and force fetch from Firebase
 * @returns {Promise<Array>} - Array of member objects
 */
export async function loadMembersData(skipCache = false) {
    // Always try cache first if not forcing refresh
    if (!skipCache) {
        const cached = loadFromCache();
        if (cached) {
            console.log('Using cached members data (no Firebase read)');
            return cached;
        }
    }
    
    // Cache is missing or force refresh - fetch from Firebase
    try {
        console.log('Cache missing or force refresh - Fetching members from Firebase...');
        const membersRef = collection(db, 'Members');
        const snapshot = await getDocs(membersRef);
        members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Save to cache for future use
        saveToCache(members);
        
        return members;
    } catch (error) {
        // Use centralized error handler (lazy import to avoid circular dependency)
        import('./utils.js').then(({ handleError }) => {
            handleError(error, { module: 'data-store', action: 'loadMembersData' }, { showToast: false });
        }).catch(() => {
            // Fallback if error handler fails
            console.error('Error loading members:', error);
        });
        
        // On error, try to use existing cache if available
        const cached = loadFromCache();
        if (cached) {
            console.log('Using existing cache due to error');
            return cached;
        }
        
        members = [];
        return [];
    }
}

/**
 * Gets all members from memory cache (no Firebase read)
 * @returns {Array<Object>} - Array of member objects
 */
export function getMembers() {
    return members;
}

/**
 * Updates the members array in memory and saves to cache
 * @param {Array<Object>} newMembers - New members array
 * @returns {void}
 */
export function setMembers(newMembers) {
    members = newMembers;
    saveToCache(newMembers);
}

/**
 * Gets a member by ID from memory cache (no Firebase read)
 * @param {string} memberId - Member document ID
 * @returns {Object|undefined} - Member object or undefined if not found
 */
export function getMemberById(memberId) {
    return members.find(m => m.id === memberId);
}

/**
 * Checks if cache exists and is fresh (not expired)
 * @returns {boolean} - True if cache exists and is not expired
 */
export function isCacheFresh() {
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (!cachedData || !cachedTimestamp) {
        return false;
    }
    
    const timestamp = parseInt(cachedTimestamp, 10);
    const now = Date.now();
    const age = now - timestamp;
    
    return age <= CACHE_EXPIRATION_MS;
}

