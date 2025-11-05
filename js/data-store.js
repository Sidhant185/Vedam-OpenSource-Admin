// Shared Data Store for Members
import { collection, getDocs, db } from '../firebase-config.js';

const CACHE_KEY = 'members_cache';
const CACHE_TIMESTAMP_KEY = 'members_cache_timestamp';

let members = [];
let lastFetchTime = 0;

/**
 * Loads members from cache if available
 * @returns {Array|null} - Cached members or null if cache is missing
 */
function loadFromCache() {
    try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        
        if (!cachedData || !cachedTimestamp) {
            return null;
        }
        
        // Cache exists - use it (no expiration check)
        const parsed = JSON.parse(cachedData);
        members = parsed;
        lastFetchTime = parseInt(cachedTimestamp, 10);
        console.log('Loaded members from cache');
        return members;
    } catch (error) {
        console.error('Error loading from cache:', error);
        return null;
    }
}

/**
 * Saves members to cache
 * @param {Array} membersData - Members array to cache
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
 * Clears the cache
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
        console.error('Error loading members:', error);
        
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
 * Gets all members (from memory cache, no Firebase read)
 * @returns {Array} - Array of member objects
 */
export function getMembers() {
    return members;
}

/**
 * Updates the members array and cache
 * @param {Array} newMembers - New members array
 */
export function setMembers(newMembers) {
    members = newMembers;
    saveToCache(newMembers);
}

/**
 * Gets a member by ID (from memory cache, no Firebase read)
 * @param {string} memberId - Member ID
 * @returns {Object|undefined} - Member object or undefined
 */
export function getMemberById(memberId) {
    return members.find(m => m.id === memberId);
}

/**
 * Checks if cache exists (no expiration - cache is permanent until manual refresh)
 * @returns {boolean} - True if cache exists
 */
export function isCacheFresh() {
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    return !!(cachedData && cachedTimestamp);
}

