/**
 * @fileoverview Main Application Entry Point
 * Initializes authentication, navigation, and handles application-level events
 * @module app
 */

// Main Application Entry Point
import { initializeAuth, adminLogin, adminLogout, getCurrentUser } from './auth.js';
import { loadMembersData, getMembers, clearMembersCache } from './data-store.js';
import { loadDashboard } from './dashboard.js';
import { initializeMembersPage, loadMembers } from './members.js';
import { loadAnalytics } from './analytics.js';
import { loadSettings } from './settings.js';
import { clearGitHubCache, fetchGitHubUserInfo } from './github-api.js';
import { startBackgroundGitHubRefresh } from './github-refresh.js';
import { showLoading, hideLoading, downloadCSV, handleError } from './utils.js';
import { 
    initializeNavigation, 
    showLoginScreen, 
    showDashboard, 
    showPage,
    showLoginError,
    clearLoginForm,
    toggleSidebar
} from './navigation.js';
import { doc, getDoc, setDoc, updateDoc, db } from '../firebase-config.js';

// DOM elements
const logoutBtn = document.getElementById('logoutBtn');
const adminEmail = document.getElementById('adminEmail');
const sidebarToggle = document.getElementById('sidebarToggle');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Initialize navigation first
    initializeNavigation();
    
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
 * Setup all event listeners for the application
 * Handles login form, logout, sidebar toggle, and action buttons
 * @returns {void}
 */
function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                showLoading();
                await adminLogin(email, password);
            } catch (error) {
                showLoginError(error.message || 'Login failed. Please check your credentials.');
                handleError(error, { module: 'app', action: 'login' });
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
                handleError(error, { module: 'app', action: 'logout' });
            }
        });
    }

    // Sidebar toggle
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }

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
        handleError(error, { module: 'app', action: 'loadInitialData' });
    } finally {
        hideLoading();
    }
}

// Navigation functions are now imported from './navigation.js'

/**
 * Refresh all GitHub data for all members
 * This is a lightweight refresh that only updates profile info, not full activity
 * @returns {Promise<void>}
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
                    handleError(error, { 
                        module: 'app', 
                        action: 'refreshAllGitHubData',
                        username: member.githubUsername 
                    }, { showToast: false });
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

// GitHub refresh and club stats are now in separate modules
// startBackgroundGitHubRefresh is imported from './github-refresh.js'

/**
 * Show export options modal for member data
 * @returns {void}
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
 * Export members data in specified format
 * @param {string} format - Export format: 'csv' or 'pdf' (default: 'csv')
 * @returns {Promise<void>}
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
        handleError(error, { module: 'app', action: 'exportMembersData', format });
        showToast('Error exporting data. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Convert members array to CSV format
 * @param {Array<Object>} members - Array of member objects
 * @returns {Promise<string>} - CSV content as string
 */
async function convertToCSV(members) {
    const { getMemberDisplayName, getMemberEmail, getMemberPhone, formatDate } = await import('./utils.js');
    
    const headers = [
        'Name', 'Email', 'Phone Number', 'WhatsApp Number',
        'GitHub Username', 'GitHub Profile URL', 'GitHub Connected',
        'Public Repos', 'Followers', 'Following',
        'Total Stars', 'Total Commits', 'Joined Date', 'Last Updated'
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
        let totalCommits = 'N/A';
        
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
            totalCommits = member.githubActivity?.commits !== undefined ? member.githubActivity.commits : 'N/A';
        }
        
        return [
            name, email, phoneNumber, whatsappNumber,
            githubUsername, githubProfileUrl, member.githubConnected ? 'Yes' : 'No',
            publicRepos, followers, following,
            totalStars, totalCommits, joinedDate, lastUpdated
        ];
    }));
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

/**
 * Generate PDF report for members
 * Opens a new window with formatted table and triggers print dialog
 * @param {Array<Object>} members - Array of member objects
 * @returns {Promise<void>}
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

/**
 * Generate HTML table for members data
 * @param {Array<Object>} members - Array of member objects
 * @returns {Promise<string>} - HTML table string
 */
async function generateMembersTableHTML(members) {
    const { getMemberDisplayName, getMemberEmail, getMemberPhone, formatDate } = await import('./utils.js');
    
    const headers = [
        'Name', 'Email', 'Phone', 'GitHub Username', 'GitHub Profile',
        'Connected', 'Public Repos', 'Followers', 'Stars', 'Commits', 'Joined'
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
        let totalCommits = 'N/A';
        
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
            totalCommits = member.githubActivity?.commits !== undefined ? member.githubActivity.commits : 'N/A';
        }
        
        return [
            name, email, phone, githubUsername, githubProfileUrl,
            member.githubConnected ? 'Yes' : 'No',
            publicRepos, followers, totalStars, totalCommits, joinedDate
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

