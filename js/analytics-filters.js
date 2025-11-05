// Analytics Filters Module
import { getMembers } from './data-store.js';
import { formatNumber } from './utils.js';

let analyticsSearch, analyticsLanguageFilter, analyticsActivityFilter, analyticsDateRange, clearAnalyticsSearchBtn;
let filteredContributors = [];
let filteredLanguages = [];

/**
 * Initialize analytics filters
 */
export function initializeAnalyticsFilters() {
    analyticsSearch = document.getElementById('analyticsSearch');
    analyticsLanguageFilter = document.getElementById('analyticsLanguageFilter');
    analyticsActivityFilter = document.getElementById('analyticsActivityFilter');
    analyticsDateRange = document.getElementById('analyticsDateRange');
    clearAnalyticsSearchBtn = document.getElementById('clearAnalyticsSearch');

    // Set up event listeners
    if (analyticsSearch) {
        analyticsSearch.addEventListener('input', () => {
            applyAnalyticsFilters();
            if (clearAnalyticsSearchBtn) {
                clearAnalyticsSearchBtn.style.display = analyticsSearch.value ? 'block' : 'none';
            }
        });
    }

    if (clearAnalyticsSearchBtn) {
        clearAnalyticsSearchBtn.addEventListener('click', () => {
            if (analyticsSearch) {
                analyticsSearch.value = '';
                clearAnalyticsSearchBtn.style.display = 'none';
                applyAnalyticsFilters();
            }
        });
    }

    if (analyticsLanguageFilter) {
        analyticsLanguageFilter.addEventListener('change', applyAnalyticsFilters);
    }

    if (analyticsActivityFilter) {
        analyticsActivityFilter.addEventListener('change', applyAnalyticsFilters);
    }

    if (analyticsDateRange) {
        analyticsDateRange.addEventListener('change', async () => {
            if (window.loadAnalytics) {
                const analyticsModule = await import('./analytics.js');
                analyticsModule.loadAnalytics();
            }
        });
    }

    // Populate language filter
    populateLanguageFilter();
}

/**
 * Populate language filter dropdown
 */
function populateLanguageFilter() {
    if (!analyticsLanguageFilter) return;

    const members = getMembers();
    const languageSet = new Set();

    members.forEach(member => {
        if (member.githubActivity && member.githubActivity.languages) {
            const languages = member.githubActivity.languages;
            if (typeof languages === 'object' && !Array.isArray(languages)) {
                Object.keys(languages).forEach(lang => {
                    if (lang && lang.trim()) {
                        languageSet.add(lang.trim());
                    }
                });
            } else if (Array.isArray(languages)) {
                languages.forEach(lang => {
                    const langName = typeof lang === 'string' ? lang : (lang?.name || '');
                    if (langName && langName.trim()) {
                        languageSet.add(langName.trim());
                    }
                });
            }
        }
    });

    const sortedLanguages = Array.from(languageSet).sort();
    
    // Clear existing options except "All Languages"
    analyticsLanguageFilter.innerHTML = '<option value="">All Languages</option>';
    
    sortedLanguages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = lang;
        analyticsLanguageFilter.appendChild(option);
    });
}

/**
 * Apply analytics filters
 */
export function applyAnalyticsFilters() {
    const members = getMembers();
    let filtered = [...members];

    // Search filter
    if (analyticsSearch && analyticsSearch.value) {
        const searchTerm = analyticsSearch.value.toLowerCase();
        filtered = filtered.filter(member => {
            const name = (member.displayName || `${member.firstName || ''} ${member.lastName || ''}`).trim().toLowerCase();
            const github = (member.githubUsername || '').toLowerCase();
            const languages = member.githubActivity?.languages || {};
            let hasLanguage = false;
            
            if (typeof languages === 'object' && !Array.isArray(languages)) {
                hasLanguage = Object.keys(languages).some(lang => lang.toLowerCase().includes(searchTerm));
            }
            
            return name.includes(searchTerm) || github.includes(searchTerm) || hasLanguage;
        });
    }

    // Language filter
    if (analyticsLanguageFilter && analyticsLanguageFilter.value) {
        const selectedLanguage = analyticsLanguageFilter.value;
        filtered = filtered.filter(member => {
            if (!member.githubActivity || !member.githubActivity.languages) return false;
            const languages = member.githubActivity.languages;
            
            if (typeof languages === 'object' && !Array.isArray(languages)) {
                return Object.keys(languages).includes(selectedLanguage);
            } else if (Array.isArray(languages)) {
                return languages.some(lang => {
                    const langName = typeof lang === 'string' ? lang : (lang?.name || '');
                    return langName === selectedLanguage;
                });
            }
            return false;
        });
    }

    // Activity filter
    if (analyticsActivityFilter && analyticsActivityFilter.value) {
        filtered = filtered.filter(member => {
            const contributions = member.githubActivity ? (member.githubActivity.contributions || 0) : 0;
            const value = analyticsActivityFilter.value;
            
            if (value === 'high') return contributions >= 1000;
            if (value === 'medium') return contributions >= 100 && contributions < 1000;
            if (value === 'low') return contributions >= 1 && contributions < 100;
            if (value === 'inactive') return contributions === 0;
            return true;
        });
    }

    filteredContributors = filtered;
    return filtered;
}

/**
 * Get filtered contributors for analytics
 * @returns {Array} - Filtered contributors
 */
export function getFilteredContributors() {
    return filteredContributors.length > 0 ? filteredContributors : getMembers();
}

