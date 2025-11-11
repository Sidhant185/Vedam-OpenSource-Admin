/**
 * @fileoverview Calculation Utilities Module
 * Provides reusable calculation functions with proper error handling and validation
 * Includes safe division, averages, percentages, and aggregation functions
 * @module calculations
 */

/**
 * Safely divide two numbers, handling division by zero
 * @param {number} numerator - The numerator
 * @param {number} denominator - The denominator
 * @param {number} defaultValue - Value to return if division by zero (default: 0)
 * @returns {number} - Result of division or defaultValue
 */
export function safeDivide(numerator, denominator, defaultValue = 0) {
    if (denominator === 0 || denominator === null || denominator === undefined || isNaN(denominator)) {
        return defaultValue;
    }
    if (numerator === null || numerator === undefined || isNaN(numerator)) {
        return defaultValue;
    }
    return numerator / denominator;
}

/**
 * Calculate average of values in an array
 * @param {Array} array - Array of objects or numbers
 * @param {string} field - Field name to extract from objects (if array of objects)
 * @returns {number} - Average value
 */
export function calculateAverage(array, field = null) {
    if (!Array.isArray(array) || array.length === 0) {
        return 0;
    }

    let values;
    if (field) {
        values = array
            .map(item => item && item[field] !== undefined ? item[field] : null)
            .filter(val => val !== null && val !== undefined && !isNaN(val));
    } else {
        values = array.filter(val => val !== null && val !== undefined && !isNaN(val));
    }

    if (values.length === 0) {
        return 0;
    }

    const sum = values.reduce((acc, val) => acc + Number(val), 0);
    return sum / values.length;
}

/**
 * Calculate total of values in an array
 * @param {Array} array - Array of objects or numbers
 * @param {string} field - Field name to extract from objects (if array of objects)
 * @returns {number} - Total value
 */
export function calculateTotal(array, field = null) {
    if (!Array.isArray(array) || array.length === 0) {
        return 0;
    }

    let values;
    if (field) {
        values = array
            .map(item => item && item[field] !== undefined ? item[field] : null)
            .filter(val => val !== null && val !== undefined && !isNaN(val));
    } else {
        values = array.filter(val => val !== null && val !== undefined && !isNaN(val));
    }

    return values.reduce((acc, val) => acc + Number(val), 0);
}

/**
 * Calculate percentage
 * @param {number} value - The value
 * @param {number} total - The total
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {number} - Percentage value
 */
export function calculatePercentage(value, total, decimals = 1) {
    if (total === 0 || total === null || total === undefined || isNaN(total)) {
        return 0;
    }
    if (value === null || value === undefined || isNaN(value)) {
        return 0;
    }
    const percentage = (value / total) * 100;
    return roundToDecimal(percentage, decimals);
}

/**
 * Round number to specified decimal places
 * @param {number} value - Value to round
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {number} - Rounded value
 */
export function roundToDecimal(value, decimals = 0) {
    if (value === null || value === undefined || isNaN(value)) {
        return 0;
    }
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

/**
 * Validate that a value is a valid number
 * @param {*} value - Value to validate
 * @returns {boolean} - True if valid number
 */
export function validateNumber(value) {
    return value !== null && value !== undefined && !isNaN(value) && isFinite(value);
}

/**
 * Aggregate statistics from members array
 * @param {Array} members - Array of member objects
 * @param {Object} options - Aggregation options
 * @returns {Object} - Aggregated statistics
 */
export function aggregateStats(members, options = {}) {
    const {
        includePrivateRepos = true,
        countOnlyConnected = true
    } = options;

    if (!Array.isArray(members) || members.length === 0) {
        return {
            totalMembers: 0,
            membersWithGitHub: 0,
            totalRepos: 0,
            totalStars: 0,
            totalCommits: 0,
            totalForks: 0,
            totalPullRequests: 0,
            avgRepos: 0,
            avgStars: 0,
            avgCommits: 0
        };
    }

    let totalMembers = members.length;
    let membersWithGitHub = 0;
    let totalRepos = 0;
    let totalStars = 0;
    let totalCommits = 0;
    let totalForks = 0;
    let totalPullRequests = 0;
    let membersWithActivity = 0;

    members.forEach(member => {
        const isConnected = member.githubConnected === true;
        
        if (countOnlyConnected && !isConnected) {
            return; // Skip members without GitHub connection
        }

        if (isConnected) {
            membersWithGitHub++;
        }

        if (member.githubActivity) {
            const publicRepos = validateNumber(member.githubActivity.publicRepos) 
                ? Number(member.githubActivity.publicRepos) : 0;
            const privateRepos = includePrivateRepos && validateNumber(member.githubActivity.privateRepos)
                ? Number(member.githubActivity.privateRepos) : 0;
            
            totalRepos += publicRepos + privateRepos;
            totalStars += validateNumber(member.githubActivity.totalStars) 
                ? Number(member.githubActivity.totalStars) : 0;
            totalCommits += validateNumber(member.githubActivity.commits) 
                ? Number(member.githubActivity.commits) : 0;
            totalForks += validateNumber(member.githubActivity.totalForks) 
                ? Number(member.githubActivity.totalForks) : 0;
            totalPullRequests += validateNumber(member.githubActivity.pullRequests) 
                ? Number(member.githubActivity.pullRequests) : 0;
            
            // Count members with any activity (repos, commits, PRs, etc.)
            if (publicRepos > 0 || privateRepos > 0 || 
                (validateNumber(member.githubActivity.commits) && member.githubActivity.commits > 0) ||
                (validateNumber(member.githubActivity.pullRequests) && member.githubActivity.pullRequests > 0)) {
                membersWithActivity++;
            }
        }
    });

    // Calculate averages using safe division
    const avgRepos = safeDivide(totalRepos, membersWithActivity, 0);
    const avgStars = safeDivide(totalStars, membersWithActivity, 0);
    const avgCommits = safeDivide(totalCommits, membersWithActivity, 0);

    return {
        totalMembers,
        membersWithGitHub,
        totalRepos: Math.round(totalRepos),
        totalStars: Math.round(totalStars),
        totalCommits: Math.round(totalCommits),
        totalForks: Math.round(totalForks),
        totalPullRequests: Math.round(totalPullRequests),
        avgRepos: Math.round(avgRepos),
        avgStars: Math.round(avgStars),
        avgCommits: Math.round(avgCommits),
        membersWithActivity
    };
}

/**
 * Calculate trend data from time series
 * @param {Array} data - Array of data points with timestamps
 * @param {string} period - Period: 'daily', 'weekly', 'monthly'
 * @param {string} valueField - Field name for value in data objects
 * @param {string} dateField - Field name for date in data objects
 * @returns {Array} - Aggregated trend data
 */
export function calculateTrend(data, period = 'daily', valueField = 'value', dateField = 'date') {
    if (!Array.isArray(data) || data.length === 0) {
        return [];
    }

    const buckets = {};
    const periodMap = {
        daily: (date) => date.toISOString().split('T')[0],
        weekly: (date) => {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            return weekStart.toISOString().split('T')[0];
        },
        monthly: (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    };

    const getPeriodKey = periodMap[period] || periodMap.daily;

    data.forEach(item => {
        const date = new Date(item[dateField]);
        if (isNaN(date.getTime())) {
            return; // Skip invalid dates
        }

        const key = getPeriodKey(date);
        const value = validateNumber(item[valueField]) ? Number(item[valueField]) : 0;

        if (!buckets[key]) {
            buckets[key] = { date: key, value: 0, count: 0 };
        }
        buckets[key].value += value;
        buckets[key].count++;
    });

    // Convert to array and sort by date
    return Object.values(buckets)
        .map(bucket => ({
            date: bucket.date,
            value: bucket.value,
            average: safeDivide(bucket.value, bucket.count, 0)
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Normalize percentages to ensure they sum to 100%
 * @param {Object} percentages - Object with percentage values
 * @returns {Object} - Normalized percentages
 */
export function normalizePercentages(percentages) {
    if (!percentages || typeof percentages !== 'object') {
        return {};
    }

    const values = Object.values(percentages).filter(v => validateNumber(v));
    const total = values.reduce((sum, v) => sum + v, 0);

    if (total === 0) {
        return percentages; // Return as-is if total is 0
    }

    const normalized = {};
    Object.keys(percentages).forEach(key => {
        const value = percentages[key];
        if (validateNumber(value)) {
            normalized[key] = roundToDecimal((value / total) * 100, 1);
        } else {
            normalized[key] = 0;
        }
    });

    return normalized;
}

