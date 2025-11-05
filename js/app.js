// Main Application Entry Point
import { initializeAuth, adminLogin, adminLogout, getCurrentUser } from './auth.js';
import { loadMembersData, getMembers, clearMembersCache } from './data-store.js';
import { loadDashboard } from './dashboard.js';
import { initializeMembersPage, loadMembers } from './members.js';
import { loadAnalytics } from './analytics.js';
import { loadSettings } from './settings.js';
import { clearGitHubCache, fetchGitHubUserInfo, getUserActivitySnapshot, fetchUserLanguages, fetchUserRepositories, fetchContributionCalendar } from './github-api.js';
import { showLoading, hideLoading, downloadCSV } from './utils.js';
import { doc, getDoc, setDoc, updateDoc, db } from '../firebase-config.js';

// DOM elements
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const adminEmail = document.getElementById('adminEmail');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');

// Navigation elements
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    
    // Initialize auth
    initializeAuth(
        (user) => {
            // On authenticated
            showDashboard();
            loadInitialData();
        },
        () => {
            // On unauthenticated
            showLoginScreen();
        }
    );
});

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Login form
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                showLoading();
                await adminLogin(email, password);
            } catch (error) {
                showError(error.message || 'Login failed. Please check your credentials.');
            } finally {
                hideLoading();
            }
        });
    }

    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await adminLogout();
                showLoginScreen();
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }

    // Sidebar toggle
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            if (sidebar && dashboard) {
                sidebar.classList.toggle('open');
                // Add/remove class to dashboard for easier CSS targeting
                if (sidebar.classList.contains('open')) {
                    dashboard.classList.add('sidebar-open');
                } else {
                    dashboard.classList.remove('sidebar-open');
                }
            }
        });
    }

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            showPage(page);
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Export and refresh buttons
    const exportMembers = document.getElementById('exportMembers');
    if (exportMembers) {
        exportMembers.addEventListener('click', showExportOptions);
    }

    const refreshGitHubData = document.getElementById('refreshGitHubData');
    if (refreshGitHubData) {
        refreshGitHubData.addEventListener('click', () => startBackgroundGitHubRefresh({ days: 365 }));
    }
}

/**
 * Load initial data when authenticated
 */
async function loadInitialData() {
    try {
        showLoading();
        // Load from cache first, only fetch from Firebase if cache is stale
        await loadMembersData(false);
        
        const user = getCurrentUser();
        if (user && adminEmail) {
            adminEmail.textContent = user.email;
        }
        
        // Load dashboard by default
        loadDashboard();
    } catch (error) {
        console.error('Error loading initial data:', error);
    } finally {
        hideLoading();
    }
}

/**
 * Show login screen
 */
function showLoginScreen() {
    if (loginScreen) loginScreen.style.display = 'flex';
    if (dashboard) dashboard.style.display = 'none';
    clearLoginForm();
}

/**
 * Show dashboard
 */
function showDashboard() {
    if (loginScreen) loginScreen.style.display = 'none';
    if (dashboard) dashboard.style.display = 'flex';
}

/**
 * Show error message
 */
function showError(message) {
    if (loginError) {
        loginError.textContent = message;
        loginError.style.display = 'block';
        setTimeout(() => {
            loginError.style.display = 'none';
        }, 5000);
    }
}

/**
 * Clear login form
 */
function clearLoginForm() {
    if (loginForm) loginForm.reset();
    if (loginError) loginError.style.display = 'none';
}

/**
 * Navigate to specific page
 * @param {string} pageId - Page ID to show
 */
function showPage(pageId) {
    // Hide all pages
    pages.forEach(page => {
        page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(pageId + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
        
        // Load page-specific data
        switch (pageId) {
            case 'dashboard':
                loadDashboard();
                break;
            case 'members':
                // Initialize members page if not already done
                if (window.membersPageInitialized !== true) {
                    initializeMembersPage();
                    window.membersPageInitialized = true;
                }
                loadMembers();
                break;
            case 'analytics':
                loadAnalytics();
                break;
            case 'settings':
                loadSettings();
                break;
        }
    }
}

/**
 * Refresh all GitHub data
 */
async function refreshAllGitHubData() {
    if (!confirm('This will refresh GitHub data for all members. This may take a while. Continue?')) {
        return;
    }

    try {
        showLoading();
        
        clearGitHubCache();
        
        const members = getMembers();
        let updatedCount = 0;
        let errorCount = 0;
        
        for (const member of members) {
            if (member.githubConnected && member.githubUsername) {
                try {
                    const githubInfo = await fetchGitHubUserInfo(member.githubUsername, false);
                    
                    if (githubInfo) {
                        const memberRef = doc(db, 'Members', member.id);

                        // Profile-only safe refresh; preserve existing activity details
                        const existingActivity = member.githubActivity || {};
                        const mergedActivity = {
                            ...existingActivity,
                            publicRepos: githubInfo.public_repos,
                            followers: githubInfo.followers,
                            following: githubInfo.following,
                            lastUpdated: new Date().toISOString()
                        };

                        await updateDoc(memberRef, {
                            githubActivity: mergedActivity,
                            lastUpdated: new Date().toISOString()
                        });
                        
                        updatedCount++;
                    } else {
                        errorCount++;
                    }
                    
                    await new Promise(r => setTimeout(r, 1000));
                } catch (error) {
                    console.error(`Error updating GitHub data for ${member.githubUsername}:`, error);
                    errorCount++;
                }
            }
        }
        
        // Clear cache and force refresh from Firebase after manual refresh
        clearMembersCache();
        await loadMembersData(true);
        
        alert(`GitHub data refreshed!\n\nUpdated: ${updatedCount} members\nErrors: ${errorCount} members`);
        
        if (window.loadMembersPage) {
            await loadMembers();
        }
        if (window.loadDashboard) {
            loadDashboard();
        }
        
    } catch (error) {
        console.error('Error refreshing GitHub data:', error);
        alert('Error refreshing GitHub data. Please try again.');
    } finally {
        hideLoading();
    }
}

/**
 * Background GraphQL-based refresh with batching and progress UI
 */
async function startBackgroundGitHubRefresh({ days = 365 } = {}) {
    const progressBar = document.getElementById('refreshProgressBar');
    const progressText = document.getElementById('refreshProgressText');
    const progressWrap = document.getElementById('refreshProgressWrap');
    const members = getMembers().filter(m => m.githubConnected && m.githubUsername);
    if (!members.length) return;

    // Lifetime contributions mode: don't build fixed window; we'll still fetch recent PRs internally

    let completed = 0;
    let errorCount = 0;
    const batchSize = 4;
    const delayBetween = 800;

    if (progressWrap) progressWrap.style.display = 'block';
    const updateUI = () => {
        const pct = Math.round((completed / members.length) * 100);
        if (progressBar) progressBar.style.width = pct + '%';
        if (progressText) progressText.textContent = `Refreshing ${completed}/${members.length}`;
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
                    const [snap, languages, repos, calendar] = await Promise.all([
                        getUserActivitySnapshot(member.githubUsername, { lifetime: true, prsFirst: 50 }).catch((err) => {
                            console.error(`Error in getUserActivitySnapshot for ${member.githubUsername}:`, err);
                            throw err;
                        }),
                        fetchUserLanguages(member.githubUsername, 100).catch((err) => {
                            console.warn(`Error fetching languages for ${member.githubUsername}:`, err);
                            return {};
                        }),
                        fetchUserRepositories(member.githubUsername, 100).catch((err) => {
                            console.warn(`Error fetching repos for ${member.githubUsername}:`, err);
                            return [];
                        }),
                        fetchContributionCalendar(member.githubUsername).catch((err) => {
                            console.warn(`Error fetching calendar for ${member.githubUsername}:`, err);
                            return null;
                        })
                    ]);
                    
                    console.log(`Completed API calls for ${member.githubUsername}`);
                    
                    // Validate that we got contributions and commits
                    if (snap.contributions === undefined || snap.commits === undefined) {
                        console.warn(`Missing contributions/commits for ${member.githubUsername}:`, {
                            contributions: snap.contributions,
                            commits: snap.commits
                        });
                    }
                    
                    // Calculate totalStars and totalForks from repositories
                    const totalStars = repos.reduce((sum, repo) => sum + (repo.stars || 0), 0);
                    const totalForks = repos.reduce((sum, repo) => sum + (repo.forks || 0), 0);
                    const privateRepos = repos.filter(repo => repo.is_private).length;
                    
                    // Ensure contributions and commits are valid numbers
                    const contributions = Number.isFinite(snap.contributions) && snap.contributions >= 0 
                        ? snap.contributions 
                        : (member.githubActivity?.contributions || 0);
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
                            contributions: contributions,
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
                    
                    console.log(`Updated ${member.githubUsername}: ${contributions} contributions, ${commits} commits`);
                } catch (e) {
                    console.error(`Error updating GitHub data for ${member.githubUsername}:`, e);
                    console.error(`Stack trace:`, e.stack);
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
                console.error(`Timeout or error for ${member.githubUsername}:`, timeoutError);
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
    alert(`GitHub refresh complete. Updated: ${members.length - errorCount}, Errors: ${errorCount}`);
    // Refresh dashboard analytics after completion
    loadDashboard();
}

/**
 * Calculate and update ClubStats in Firebase
 * This aggregates stats from all members
 */
async function updateClubStats() {
    try {
        const members = getMembers();
        const now = new Date().toISOString();
        
        // Calculate aggregated stats
        let totalMembers = members.length;
        let membersWithGitHub = 0;
        let totalProjects = 0; // Total repos (public + private)
        let totalStars = 0;
        let totalCommits = 0; // Total contributions
        let totalForks = 0;
        let totalPullRequests = 0;
        
        members.forEach(member => {
            if (member.githubConnected) {
                membersWithGitHub++;
                
                if (member.githubActivity) {
                    // Count total repos (public + private)
                    const publicRepos = member.githubActivity.publicRepos || 0;
                    const privateRepos = member.githubActivity.privateRepos || 0;
                    totalProjects += publicRepos + privateRepos;
                    
                    // Sum other stats
                    totalStars += member.githubActivity.totalStars || 0;
                    totalCommits += member.githubActivity.commits || 0; // Use commits, not contributions
                    totalForks += member.githubActivity.totalForks || 0;
                    totalPullRequests += member.githubActivity.pullRequests || 0;
                }
            }
        });
        
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
            members: totalMembers,
            membersWithGitHub: membersWithGitHub,
            projects: totalProjects,
            stars: totalStars,
            totalCommits: totalCommits,
            totalForks: totalForks,
            totalPullRequests: totalPullRequests
        };
        
        // Update ClubStats document (create if doesn't exist, update if exists)
        await setDoc(statsRef, clubStats, { merge: true });
        
        console.log('ClubStats updated successfully:', clubStats);
    } catch (error) {
        console.error('Error updating ClubStats:', error);
        // Don't throw - allow refresh to complete even if stats update fails
    }
}

/**
 * Show export options modal
 */
function showExportOptions() {
    const exportModal = document.createElement('div');
    exportModal.className = 'modal active';
    exportModal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Export Members</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="export-options">
                    <button class="btn btn-primary export-btn" data-format="csv">
                        <i class="fas fa-file-csv"></i> Export as CSV
                    </button>
                    <button class="btn btn-primary export-btn" data-format="pdf">
                        <i class="fas fa-file-pdf"></i> Export as PDF
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(exportModal);
    
    exportModal.querySelectorAll('.export-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const format = e.target.dataset.format;
            await exportMembersData(format);
            document.body.removeChild(exportModal);
        });
    });
    
    exportModal.querySelector('.modal-close').addEventListener('click', () => {
        document.body.removeChild(exportModal);
    });
    
    exportModal.addEventListener('click', (e) => {
        if (e.target === exportModal) {
            document.body.removeChild(exportModal);
        }
    });
}

/**
 * Export members data
 */
async function exportMembersData(format = 'csv') {
    try {
        showLoading();
        const members = getMembers();
        
        if (format === 'csv') {
            const csvContent = await convertToCSV(members);
            downloadCSV(csvContent, 'members.csv');
        } else if (format === 'pdf') {
            await generatePDF(members);
        }
    } catch (error) {
        console.error('Export error:', error);
        alert('Error exporting data. Please try again.');
    } finally {
        hideLoading();
    }
}

/**
 * Convert members to CSV
 */
async function convertToCSV(members) {
    const { getMemberDisplayName, getMemberEmail, getMemberPhone, formatDate } = await import('./utils.js');
    
    const headers = [
        'Name', 'Email', 'Phone Number', 'WhatsApp Number',
        'GitHub Username', 'GitHub Profile URL', 'GitHub Connected',
        'Public Repos', 'Followers', 'Following',
        'Total Stars', 'Total Contributions', 'Joined Date', 'Last Updated'
    ];
    
    const rows = await Promise.all(members.map(async (member) => {
        const name = getMemberDisplayName(member);
        const email = getMemberEmail(member);
        const phoneNumber = member.phoneNumber || 'N/A';
        const whatsappNumber = member.whatsappNumber || 'N/A';
        const joinedDate = formatDate(member.joinedAt);
        const lastUpdated = formatDate(member.lastUpdated);
        
        let githubUsername = 'N/A';
        let githubProfileUrl = 'N/A';
        let publicRepos = 'N/A';
        let followers = 'N/A';
        let following = 'N/A';
        let totalStars = 'N/A';
        let totalContributions = 'N/A';
        
        if (member.githubConnected && member.githubUsername) {
            const githubInfo = await fetchGitHubUserInfo(member.githubUsername);
            
            if (githubInfo) {
                githubUsername = githubInfo.username;
                githubProfileUrl = githubInfo.html_url;
                publicRepos = githubInfo.public_repos;
                followers = githubInfo.followers;
                following = githubInfo.following;
            }
        }
        
        if (member.githubActivity) {
            totalStars = member.githubActivity.totalStars || 'N/A';
            totalContributions = member.githubActivity.contributions || 'N/A';
        }
        
        return [
            name, email, phoneNumber, whatsappNumber,
            githubUsername, githubProfileUrl, member.githubConnected ? 'Yes' : 'No',
            publicRepos, followers, following,
            totalStars, totalContributions, joinedDate, lastUpdated
        ];
    }));
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

/**
 * Generate PDF
 */
async function generatePDF(members) {
    const { getMemberDisplayName, getMemberEmail, getMemberPhone, formatDate } = await import('./utils.js');
    
    const tableHTML = await generateMembersTableHTML(members);
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Vedam Open Source - Members Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .header { text-align: center; margin-bottom: 30px; }
                .header h1 { color: #667eea; }
                .header p { color: #666; }
                @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Vedam Open Source Club</h1>
                <p>Members Report - Generated on ${new Date().toLocaleDateString()}</p>
            </div>
            ${tableHTML}
            <script>
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

async function generateMembersTableHTML(members) {
    const { getMemberDisplayName, getMemberEmail, getMemberPhone, formatDate } = await import('./utils.js');
    
    const headers = [
        'Name', 'Email', 'Phone', 'GitHub Username', 'GitHub Profile',
        'Connected', 'Public Repos', 'Followers', 'Stars', 'Contributions', 'Joined'
    ];
    
    const rows = await Promise.all(members.map(async (member) => {
        const name = getMemberDisplayName(member);
        const email = getMemberEmail(member);
        const phone = getMemberPhone(member);
        const joinedDate = formatDate(member.joinedAt);
        
        let githubUsername = 'N/A';
        let githubProfileUrl = 'N/A';
        let publicRepos = 'N/A';
        let followers = 'N/A';
        let totalStars = 'N/A';
        let totalContributions = 'N/A';
        
        if (member.githubConnected && member.githubUsername) {
            const githubInfo = await fetchGitHubUserInfo(member.githubUsername);
            
            if (githubInfo) {
                githubUsername = githubInfo.username;
                githubProfileUrl = githubInfo.html_url;
                publicRepos = githubInfo.public_repos;
                followers = githubInfo.followers;
            }
        }
        
        if (member.githubActivity) {
            totalStars = member.githubActivity.totalStars || 'N/A';
            totalContributions = member.githubActivity.contributions || 'N/A';
        }
        
        return [
            name, email, phone, githubUsername, githubProfileUrl,
            member.githubConnected ? 'Yes' : 'No',
            publicRepos, followers, totalStars, totalContributions, joinedDate
        ];
    }));
    
    let tableHTML = '<table><thead><tr>';
    headers.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    rows.forEach(row => {
        tableHTML += '<tr>';
        row.forEach(cell => {
            tableHTML += `<td>${cell}</td>`;
        });
        tableHTML += '</tr>';
    });
    
    tableHTML += '</tbody></table>';
    return tableHTML;
}

