/**
 * @fileoverview Centralized Statistics Service
 * Provides consistent stats calculation across all modules
 * Ensures calculations are standardized and avoid duplication
 * @module stats-service
 */
import { 
    aggregateStats, 
    calculateAverage, 
    calculateTotal,
    safeDivide,
    validateNumber
} from '../utils/calculations.js';

/**
 * Calculate dashboard statistics
 * @param {Array} members - Array of member objects
 * @returns {Object} - Dashboard statistics
 */
export function calculateDashboardStats(members) {
    if (!Array.isArray(members) || members.length === 0) {
        return {
            totalMembers: 0,
            totalRepos: 0,
            totalStars: 0,
            totalPRs: 0,
            totalCommits: 0
        };
    }

    const stats = aggregateStats(members, {
        includePrivateRepos: true,
        countOnlyConnected: false // Count all members for dashboard
    });

    return {
        totalMembers: members.length,
        totalRepos: stats.totalRepos,
        totalStars: stats.totalStars,
        totalPRs: stats.totalPullRequests,
        totalCommits: stats.totalCommits
    };
}

/**
 * Calculate analytics statistics
 * @param {Array} members - Array of member objects
 * @returns {Object} - Analytics statistics
 */
export function calculateAnalyticsStats(members) {
    if (!Array.isArray(members) || members.length === 0) {
        return {
            totalRepos: 0,
            totalStars: 0,
            totalPRs: 0,
            totalCommits: 0,
            totalIssues: 0,
            totalForks: 0,
            avgRepos: 0,
            avgStars: 0,
            avgPRs: 0,
            connectedMembers: 0
        };
    }

    const stats = aggregateStats(members, {
        includePrivateRepos: true,
        countOnlyConnected: true // Only count connected members for analytics
    });

    // Calculate issues separately
    let totalIssues = 0;
    members.forEach(member => {
        if (member.githubConnected && member.githubActivity) {
            totalIssues += validateNumber(member.githubActivity.issues) 
                ? member.githubActivity.issues : 0;
        }
    });

    return {
        totalRepos: stats.totalRepos,
        totalStars: stats.totalStars,
        totalPRs: stats.totalPullRequests,
        totalCommits: stats.totalCommits,
        totalIssues: Math.round(totalIssues),
        totalForks: stats.totalForks,
        avgRepos: stats.avgRepos,
        avgStars: stats.avgStars,
        avgPRs: stats.membersWithActivity > 0 
            ? Math.round(safeDivide(stats.totalPullRequests, stats.membersWithActivity, 0))
            : 0,
        connectedMembers: stats.membersWithGitHub
    };
}

/**
 * Calculate club statistics for Firebase
 * @param {Array} members - Array of member objects
 * @returns {Object} - Club statistics
 */
export function calculateClubStats(members) {
    if (!Array.isArray(members) || members.length === 0) {
        return {
            members: 0,
            membersWithGitHub: 0,
            projects: 0,
            stars: 0,
            totalCommits: 0,
            totalForks: 0,
            totalPullRequests: 0
        };
    }

    const stats = aggregateStats(members, {
        includePrivateRepos: true,
        countOnlyConnected: false
    });

    return {
        members: members.length,
        membersWithGitHub: stats.membersWithGitHub,
        projects: stats.totalRepos,
        stars: stats.totalStars,
        totalCommits: stats.totalCommits,
        totalForks: stats.totalForks,
        totalPullRequests: stats.totalPullRequests
    };
}

/**
 * Calculate repository statistics
 * @param {Array} members - Array of member objects
 * @returns {Object} - Repository statistics
 */
export function calculateRepositoryStats(members) {
    if (!Array.isArray(members) || members.length === 0) {
        return {
            public: 0,
            private: 0,
            stars: 0,
            forks: 0,
            prs: 0,
            commits: 0
        };
    }

    let publicRepos = 0;
    let privateRepos = 0;
    let totalStars = 0;
    let totalForks = 0;
    let totalPRs = 0;
    let totalCommits = 0;

    members.forEach(member => {
        if (member.githubConnected && member.githubActivity) {
            publicRepos += validateNumber(member.githubActivity.publicRepos) 
                ? Number(member.githubActivity.publicRepos) : 0;
            privateRepos += validateNumber(member.githubActivity.privateRepos) 
                ? Number(member.githubActivity.privateRepos) : 0;
            totalStars += validateNumber(member.githubActivity.totalStars) 
                ? Number(member.githubActivity.totalStars) : 0;
            totalForks += validateNumber(member.githubActivity.totalForks) 
                ? Number(member.githubActivity.totalForks) : 0;
            totalPRs += validateNumber(member.githubActivity.pullRequests) 
                ? Number(member.githubActivity.pullRequests) : 0;
            totalCommits += validateNumber(member.githubActivity.commits) 
                ? Number(member.githubActivity.commits) : 0;
        }
    });

    return {
        public: Math.round(publicRepos),
        private: Math.round(privateRepos),
        stars: Math.round(totalStars),
        forks: Math.round(totalForks),
        prs: Math.round(totalPRs),
        commits: Math.round(totalCommits)
    };
}

/**
 * Get top contributors by commits
 * @param {Array} members - Array of member objects
 * @param {number} limit - Number of top contributors to return (default: 10)
 * @returns {Array} - Top contributors array
 */
export function getTopCommitters(members, limit = 10) {
    if (!Array.isArray(members) || members.length === 0) {
        return [];
    }

    return members
        .filter(member => 
            member.githubActivity &&
            validateNumber(member.githubActivity.commits) &&
            member.githubActivity.commits > 0
        )
        .map(member => ({
            name: member.displayName ||
                  `${member.firstName || ''} ${member.lastName || ''}`.trim() ||
                  member.githubUsername ||
                  'Unknown',
            commits: member.githubActivity.commits || 0,
            username: member.githubUsername || null
        }))
        .sort((a, b) => b.commits - a.commits)
        .slice(0, limit);
}

/**
 * Get top PR creators
 * @param {Array} members - Array of member objects
 * @param {number} limit - Number of top PR creators to return (default: 10)
 * @returns {Array} - Top PR creators array
 */
export function getTopPRCreators(members, limit = 10) {
    if (!Array.isArray(members) || members.length === 0) {
        return [];
    }

    return members
        .filter(member =>
            member.githubActivity &&
            validateNumber(member.githubActivity.pullRequests) &&
            member.githubActivity.pullRequests > 0
        )
        .map(member => ({
            name: member.displayName ||
                  `${member.firstName || ''} ${member.lastName || ''}`.trim() ||
                  member.githubUsername ||
                  'Unknown',
            prs: member.githubActivity.pullRequests || 0,
            merged: member.githubActivity.mergedPRs || 0,
            open: member.githubActivity.openPRs || 0,
            closed: member.githubActivity.closedPRs || 0,
            username: member.githubUsername || null
        }))
        .sort((a, b) => b.prs - a.prs)
        .slice(0, limit);
}

