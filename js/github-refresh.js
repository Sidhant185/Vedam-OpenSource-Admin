/**
 * @fileoverview GitHub Refresh Module
 * Handles background GitHub data refresh with batching and progress tracking
 * @module github-refresh
 */
import { getMembers, loadMembersData } from './data-store.js';
import { getUserActivitySnapshot, fetchUserRepositories, fetchUserLanguages } from './github-api.js';
import { doc, updateDoc, db } from '../firebase-config.js';
import { handleError, showLoading, hideLoading, showToast } from './utils.js';
import { calculateClubStats } from './services/stats-service.js';
import { loadDashboard } from './dashboard.js';
import { setLoadingState, updateLoadingProgress, clearAllLoadingStates } from './services/loading-service.js';

/**
 * Start background GitHub refresh with batching and progress UI
 * @param {Object} options - Refresh options
 * @param {number} options.days - Number of days (default: 365, unused in lifetime mode)
 * @returns {Promise<void>}
 */
export async function startBackgroundGitHubRefresh({ days = 365 } = {}) {
    try {
        // Use loading service for better state management
        setLoadingState('github-refresh', true, { message: 'Starting GitHub refresh...', progress: 0 });
        
        const progressBar = document.getElementById('refreshProgressBar');
        const progressText = document.getElementById('refreshProgressText');
        const progressWrap = document.getElementById('refreshProgressWrap');
        const members = getMembers().filter(m => m.githubConnected && m.githubUsername);
        
        if (!members.length) {
            clearAllLoadingStates();
            if (progressWrap) progressWrap.style.display = 'none';
            return;
        }

        let completed = 0;
        let errorCount = 0;
        // Optimized batch size and delay - faster processing
        // Without token: 60 requests/hour, with token: 5000 requests/hour
        // We now check fewer repos (5 instead of 10) and handle 409 errors gracefully
        const batchSize = 3; // Process 3 members at a time
        const delayBetween = 1000; // 1 second delay between batches

        if (progressWrap) progressWrap.style.display = 'block';
        
        const updateUI = () => {
            const pct = Math.round((completed / members.length) * 100);
            // Update loading service
            updateLoadingProgress('github-refresh', pct, `Refreshing ${completed}/${members.length} members...`);
            // Also update UI elements directly for backward compatibility
            if (progressBar) progressBar.style.width = pct + '%';
            if (progressText) progressText.textContent = `Refreshing ${completed}/${members.length} members...`;
        };
        updateUI();

        for (let i = 0; i < members.length; i += batchSize) {
            const batch = members.slice(i, i + batchSize);
            const batchNumber = Math.floor(i / batchSize) + 1;
            console.log(`Processing batch ${batchNumber} (members ${i} to ${i + batchSize - 1})`);
            
            // Process each member with timeout protection
            await Promise.all(batch.map(async (member) => {
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error(`Timeout: ${member.githubUsername} took too long`)), 60000); // 60 second timeout
                });
                
                const processPromise = (async () => {
                    try {
                        console.log(`Starting fetch for ${member.githubUsername}...`);
                        
                        // Fetch user info first (lightweight)
                        const snap = await getUserActivitySnapshot(member.githubUsername, { lifetime: true, prsFirst: 50 });
                        
                        // Fetch repos (moderate API usage)
                        const repos = await fetchUserRepositories(member.githubUsername, 100).catch((err) => {
                            handleError(err, { 
                                module: 'github-refresh', 
                                action: 'fetchRepositories',
                                username: member.githubUsername 
                            }, { showToast: false });
                            return [];
                        });
                        
                        // Skip language fetching if no token (requires many API calls)
                        // Only fetch languages if we have a valid token
                        let languages = {};
                        try {
                            languages = await fetchUserLanguages(member.githubUsername, 100);
                        } catch (err) {
                            handleError(err, { 
                                module: 'github-refresh', 
                                action: 'fetchLanguages',
                                username: member.githubUsername 
                            }, { showToast: false });
                        }
                        
                        // Calendar is not implemented, always null
                        const calendar = null;
                        
                        console.log(`Completed API calls for ${member.githubUsername}`);
                        
                        // Validate that we got commits
                        if (snap.commits === undefined) {
                            console.warn(`Missing commits for ${member.githubUsername}:`, {
                                commits: snap.commits
                            });
                        }
                        
                        // Calculate totalStars and totalForks from repositories
                        const totalStars = repos.reduce((sum, repo) => sum + (repo.stars || 0), 0);
                        const totalForks = repos.reduce((sum, repo) => sum + (repo.forks || 0), 0);
                        const privateRepos = repos.filter(repo => repo.is_private).length;
                        
                        // Ensure commits are valid numbers
                        const commits = Number.isFinite(snap.commits) && snap.commits >= 0 
                            ? snap.commits 
                            : (member.githubActivity?.commits || 0);
                        
                        console.log(`Updating Firebase for ${member.githubUsername}...`);
                        const memberRef = doc(db, 'Members', member.id);
                        await updateDoc(memberRef, {
                            githubActivity: {
                                ...(member.githubActivity || {}),
                                publicRepos: snap.publicRepos !== undefined ? snap.publicRepos : (member.githubActivity?.publicRepos || 0),
                                privateRepos: privateRepos,
                                followers: snap.followers !== undefined ? snap.followers : (member.githubActivity?.followers || 0),
                                following: snap.following !== undefined ? snap.following : (member.githubActivity?.following || 0),
                                commits: commits,
                                pullRequests: snap.pullRequests !== undefined ? snap.pullRequests : (member.githubActivity?.pullRequests || 0),
                                mergedPRs: snap.mergedPRs !== undefined ? snap.mergedPRs : (member.githubActivity?.mergedPRs || 0),
                                openPRs: snap.openPRs !== undefined ? snap.openPRs : (member.githubActivity?.openPRs || 0),
                                closedPRs: snap.closedPRs !== undefined ? snap.closedPRs : (member.githubActivity?.closedPRs || 0),
                                issues: snap.issues !== undefined ? snap.issues : (member.githubActivity?.issues || 0),
                                recentPRs: snap.recentPRs || (member.githubActivity?.recentPRs || []),
                                totalStars: totalStars,
                                totalForks: totalForks,
                                languages: languages, // Store language breakdown
                                contributionCalendar: calendar, // Store calendar data for heatmap
                                lastUpdated: new Date().toISOString()
                            },
                            lastUpdated: new Date().toISOString()
                        });
                        
                        console.log(`Updated ${member.githubUsername}: ${commits} commits, ${snap.pullRequests || 0} PRs`);
                    } catch (e) {
                        handleError(e, { 
                            module: 'github-refresh', 
                            action: 'updateMemberData',
                            username: member.githubUsername 
                        }, { showToast: false });
                        errorCount++;
                        throw e; // Re-throw to be caught by Promise.race
                    } finally {
                        completed++;
                        updateUI();
                        // Notify listeners to update UI rows
                        window.dispatchEvent(new CustomEvent('memberUpdated'));
                    }
                })();
                
                // Race between processing and timeout
                try {
                    await Promise.race([processPromise, timeoutPromise]);
                } catch (timeoutError) {
                    handleError(timeoutError, { 
                        module: 'github-refresh', 
                        action: 'processMember',
                        username: member.githubUsername 
                    }, { showToast: false });
                    completed++;
                    updateUI();
                    errorCount++;
                }
            }));
            
            console.log(`Batch ${batchNumber} completed. Waiting ${delayBetween}ms before next batch...`);
            await new Promise(r => setTimeout(r, delayBetween));
        }

        // Force refresh from Firebase after manual refresh
        await loadMembersData(true);
        
        // Update ClubStats after refresh
        await updateClubStats();
        
        if (progressWrap) progressWrap.style.display = 'none';
        
        // Show completion message
        // Clear loading state
        clearAllLoadingStates();
        
        showToast(
            `GitHub refresh complete. Updated: ${members.length - errorCount}, Errors: ${errorCount}`,
            errorCount > 0 ? 'warning' : 'success',
            5000
        );
        
        // Refresh dashboard analytics after completion
        loadDashboard();
    } catch (error) {
        clearAllLoadingStates();
        handleError(error, { module: 'github-refresh', action: 'startBackgroundGitHubRefresh' });
        showToast('Error refreshing GitHub data. Please try again.', 'error');
    }
}

/**
 * Update ClubStats in Firebase
 * Uses centralized stats service for consistent calculations
 */
async function updateClubStats() {
    try {
        const { getMembers } = await import('./data-store.js');
        const { doc, getDoc, setDoc, db } = await import('../firebase-config.js');
        const members = getMembers();
        const now = new Date().toISOString();
        
        // Use centralized stats calculation
        const stats = calculateClubStats(members);
        
        // Get existing ClubStats to preserve 'events' if it exists
        const statsRef = doc(db, 'ClubStats', 'main');
        let existingEvents = 10; // Default value
        
        try {
            const statsSnap = await getDoc(statsRef);
            if (statsSnap.exists()) {
                existingEvents = statsSnap.data().events || 10;
            }
        } catch (e) {
            console.warn('Could not fetch existing ClubStats, using default events value');
        }
        
        // Prepare stats object matching the format
        const clubStats = {
            calculatedAt: now,
            events: existingEvents, // Preserve existing events value
            lastUpdated: now,
            members: stats.members,
            membersWithGitHub: stats.membersWithGitHub,
            projects: stats.projects,
            stars: stats.stars,
            totalCommits: stats.totalCommits,
            totalForks: stats.totalForks,
            totalPullRequests: stats.totalPullRequests
        };
        
        // Update ClubStats document (create if doesn't exist, update if exists)
        await setDoc(statsRef, clubStats, { merge: true });
        
        console.log('ClubStats updated successfully:', clubStats);
    } catch (error) {
        handleError(error, { module: 'github-refresh', action: 'updateClubStats' }, { showToast: false });
        // Don't throw - allow refresh to complete even if stats update fails
    }
}

