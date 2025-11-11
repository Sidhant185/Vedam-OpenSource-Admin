// Member Details Page Module
import { fetchGitHubUserInfo, fetchUserRepositories, fetchUserPullRequests, fetchRecentCommits, fetchContributionCalendar } from './github-api.js';
import { getMemberById } from './data-store.js';
import { formatDate, formatDateTime, getMemberDisplayName, getMemberEmail, getMemberPhone, formatNumber } from './utils.js';

let currentMember = null;

/**
 * Navigate to member details page
 * @param {string} memberId - Member ID
 */
function viewMember(memberId) {
    const member = getMemberById(memberId);
    if (member) {
        currentMember = member;
        showMemberDetailsPage();
        loadMemberDetails(member);
    }
}

/**
 * Show member details page
 */
function showMemberDetailsPage() {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show member details page
    const memberDetailsPage = document.getElementById('memberDetailsPage');
    if (memberDetailsPage) {
        memberDetailsPage.classList.add('active');
        
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.classList.remove('active');
        });
    }
}

/**
 * Load and display member details
 * @param {Object} member - Member object
 */
async function loadMemberDetails(member) {
    const detailsContainer = document.getElementById('memberDetailsContent');
    if (!detailsContainer) return;

    detailsContainer.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading member details...</div>';

    const name = getMemberDisplayName(member);
    const email = getMemberEmail(member);
    const phone = member.phoneNumber || 'N/A';
    const whatsapp = member.whatsappNumber || 'N/A';
    const joinedDate = formatDate(member.joinedAt);
    const lastUpdated = formatDateTime(member.lastUpdated);
    
    // Get GitHub info
    let githubInfo = null;
    let repositories = [];
    let pullRequests = [];
    let recentCommits = [];
    
    if (member.githubConnected && member.githubUsername) {
        githubInfo = await fetchGitHubUserInfo(member.githubUsername);
        
        // Fetch repositories, PRs, and commits in parallel
        if (githubInfo) {
            try {
            [repositories, pullRequests, recentCommits] = await Promise.all([
                fetchUserRepositories(member.githubUsername, 50),
                    fetchUserPullRequests(member.githubUsername, 'all', 50).catch(err => {
                        console.error('Error fetching PRs:', err);
                        // Fallback to cached PRs if available
                        const cachedPRs = member.githubActivity?.recentPRs || [];
                        return cachedPRs.map(pr => ({
                            title: pr.title,
                            url: pr.url,
                            html_url: pr.url,
                            state: pr.state,
                            created_at: pr.createdAt,
                            updated_at: pr.createdAt,
                            createdAt: pr.createdAt,
                            updatedAt: pr.createdAt,
                            repository_full_name: '',
                            repository: '',
                            merged: pr.merged || false
                        }));
                    }),
                fetchRecentCommits(member.githubUsername, 30).catch(() => [])
            ]);
                
                console.log(`Fetched ${pullRequests.length} pull requests for ${member.githubUsername}`);
                if (pullRequests.length > 0) {
                    console.log('Sample PR:', pullRequests[0]);
                }
            } catch (error) {
                console.error('Error fetching GitHub data:', error);
                // Use empty arrays if fetch fails
                repositories = [];
                pullRequests = [];
                recentCommits = [];
            }
        }
    }
    
    // Debug: Log PR data
    console.log('PRs to display:', pullRequests.length);
    console.log('PRs data:', pullRequests);
    
    const githubUsername = githubInfo ? githubInfo.username : 'N/A';
    const githubProfileUrl = githubInfo ? githubInfo.html_url : '#';
    const publicRepos = githubInfo ? formatNumber(githubInfo.public_repos) : 'N/A';
    const privateRepos = member.githubActivity ? formatNumber(member.githubActivity.privateRepos || 0) : '0';
    const followers = githubInfo ? formatNumber(githubInfo.followers) : 'N/A';
    const following = githubInfo ? formatNumber(githubInfo.following) : 'N/A';
    const bio = githubInfo ? githubInfo.bio : 'N/A';
    const location = githubInfo ? githubInfo.location : 'N/A';
    const company = githubInfo ? githubInfo.company : 'N/A';
    const blog = githubInfo ? githubInfo.blog : 'N/A';
    
    // Activity stats - use only stored data from cache
    // Do NOT fetch on-demand - rely only on cached data from manual refresh
    // This ensures no unnecessary API calls - only manual refresh populates data
    let activitySnapshot = null;
    
    const totalStars = member.githubActivity ? formatNumber(member.githubActivity.totalStars || 0) : '0';
    const totalPRs = member.githubActivity ? formatNumber(member.githubActivity.pullRequests || 0) : '0';
    const openPRs = member.githubActivity ? formatNumber(member.githubActivity.openPRs || 0) : '0';
    const mergedPRs = member.githubActivity ? formatNumber(member.githubActivity.mergedPRs || 0) : '0';
    const closedPRs = member.githubActivity ? formatNumber(member.githubActivity.closedPRs || 0) : '0';
    const totalCommits = formatNumber(
        activitySnapshot?.commits !== undefined ? activitySnapshot.commits :
        (member.githubActivity?.commits !== undefined ? member.githubActivity.commits : 0)
    );
    const totalIssues = member.githubActivity ? formatNumber(member.githubActivity.issues || 0) : '0';
    const totalForks = member.githubActivity ? formatNumber(member.githubActivity.totalForks || 0) : '0';
    
    // Calculate PR stats from fetched data
    const fetchedOpenPRs = pullRequests.filter(pr => pr.state === 'open').length;
    const fetchedMergedPRs = pullRequests.filter(pr => pr.merged || pr.state === 'merged').length;
    const fetchedClosedPRs = pullRequests.filter(pr => pr.state === 'closed' && !pr.merged && pr.state !== 'merged').length;
    
    const memberAvatar = githubInfo?.avatar_url || '';
    
    // Calculate repo stats
    const totalReposFromList = repositories.length;
    const totalStarsFromRepos = repositories.reduce((sum, repo) => sum + repo.stars, 0);
    const totalForksFromRepos = repositories.reduce((sum, repo) => sum + repo.forks, 0);

    detailsContainer.innerHTML = `
        <div class="member-details-container">
            <div class="member-header">
                <div class="member-avatar-section">
                    ${memberAvatar ? `<img src="${memberAvatar}" alt="${name}" class="member-avatar">` : 
                      `<div class="member-avatar-placeholder">${name.charAt(0).toUpperCase()}</div>`}
                    <div class="member-header-info">
                        <h1>${name}</h1>
                        <p class="member-email"><i class="fas fa-envelope"></i> ${email}</p>
                        ${member.githubConnected && githubInfo ? 
                            `<a href="${githubProfileUrl}" target="_blank" class="github-profile-link">
                                <i class="fab fa-github"></i> @${githubUsername}
                            </a>` : 
                            '<span class="github-not-badge">GitHub Not Connected</span>'
                        }
                    </div>
                </div>
                <button class="btn btn-secondary back-btn" onclick="goBackToMembers()">
                    <i class="fas fa-arrow-left"></i> Back to Members
                </button>
            </div>

            <div class="member-details-grid">
                <!-- Basic Information Card -->
                <div class="detail-card card-large">
                    <div class="detail-card-header">
                        <i class="fas fa-user"></i>
                        <h3>Basic Information</h3>
                    </div>
                    <div class="detail-card-body">
                        <div class="detail-row">
                            <span class="detail-label">Full Name</span>
                            <span class="detail-value">${name}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Email Address</span>
                            <span class="detail-value">${email}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Phone Number</span>
                            <span class="detail-value">${phone}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">WhatsApp Number</span>
                            <span class="detail-value">${whatsapp}</span>
                        </div>
                    </div>
                </div>

                <!-- GitHub Information Card -->
                <div class="detail-card card-large">
                    <div class="detail-card-header">
                        <i class="fab fa-github"></i>
                        <h3>GitHub Profile</h3>
                    </div>
                    <div class="detail-card-body">
                        ${member.githubConnected && githubInfo ? `
                            <div class="detail-row">
                                <span class="detail-label">Username</span>
                                <span class="detail-value">@${githubUsername}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Profile</span>
                                <span class="detail-value">
                                    <a href="${githubProfileUrl}" target="_blank" class="github-link">
                                        <i class="fab fa-github"></i> Visit Profile
                                    </a>
                                </span>
                            </div>
                            ${bio !== 'N/A' && bio ? `
                                <div class="detail-row">
                                    <span class="detail-label">Bio</span>
                                    <span class="detail-value">${bio}</span>
                                </div>
                            ` : ''}
                            ${location !== 'N/A' && location ? `
                                <div class="detail-row">
                                    <span class="detail-label">Location</span>
                                    <span class="detail-value">${location}</span>
                                </div>
                            ` : ''}
                            ${company !== 'N/A' && company ? `
                                <div class="detail-row">
                                    <span class="detail-label">Company</span>
                                    <span class="detail-value">${company}</span>
                                </div>
                            ` : ''}
                        ` : `
                            <div class="empty-state">
                                <i class="fab fa-github"></i>
                                <p>GitHub profile not connected</p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- GitHub Statistics Card -->
                <div class="detail-card card-large">
                    <div class="detail-card-header">
                        <i class="fas fa-chart-line"></i>
                        <h3>GitHub Statistics</h3>
                    </div>
                    <div class="detail-card-body">
                        ${member.githubConnected ? `
                            <div class="stats-grid-mini">
                                <div class="stat-mini">
                                    <div class="stat-mini-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                        <i class="fas fa-code-branch"></i>
                                    </div>
                                    <div class="stat-mini-content">
                                        <div class="stat-mini-value">${publicRepos}</div>
                                        <div class="stat-mini-label">Public Repos</div>
                                    </div>
                                </div>
                                <div class="stat-mini">
                                    <div class="stat-mini-icon" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                                        <i class="fas fa-users"></i>
                                    </div>
                                    <div class="stat-mini-content">
                                        <div class="stat-mini-value">${followers}</div>
                                        <div class="stat-mini-label">Followers</div>
                                    </div>
                                </div>
                                <div class="stat-mini">
                                    <div class="stat-mini-icon" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                                        <i class="fas fa-user-plus"></i>
                                    </div>
                                    <div class="stat-mini-content">
                                        <div class="stat-mini-value">${following}</div>
                                        <div class="stat-mini-label">Following</div>
                                    </div>
                                </div>
                                <div class="stat-mini">
                                    <div class="stat-mini-icon" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                                        <i class="fas fa-star"></i>
                                    </div>
                                    <div class="stat-mini-content">
                                        <div class="stat-mini-value">${totalStars}</div>
                                        <div class="stat-mini-label">Total Stars</div>
                                    </div>
                                </div>
                                <div class="stat-mini">
                                    <div class="stat-mini-icon" style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);">
                                        <i class="fas fa-code-commit"></i>
                                    </div>
                                    <div class="stat-mini-content">
                                        <div class="stat-mini-value">${totalCommits}</div>
                                        <div class="stat-mini-label">Commits</div>
                                    </div>
                                </div>
                                <div class="stat-mini">
                                    <div class="stat-mini-icon" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                                        <i class="fas fa-code-pull-request"></i>
                                    </div>
                                    <div class="stat-mini-content">
                                        <div class="stat-mini-value">${totalPRs}</div>
                                        <div class="stat-mini-label">Pull Requests</div>
                                    </div>
                                </div>
                            </div>
                        ` : `
                            <div class="empty-state">
                                <i class="fas fa-chart-line"></i>
                                <p>No GitHub statistics available</p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Activity Timeline Card -->
                <div class="detail-card card-large">
                    <div class="detail-card-header">
                        <i class="fas fa-clock"></i>
                        <h3>Activity Timeline</h3>
                    </div>
                    <div class="detail-card-body">
                        <div class="detail-row">
                            <span class="detail-label">Joined Date</span>
                            <span class="detail-value">${joinedDate}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Last Updated</span>
                            <span class="detail-value">${lastUpdated}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Member Status</span>
                            <span class="detail-value">
                                <span class="status-badge ${member.githubConnected ? 'status-active' : 'status-inactive'}">
                                    ${member.githubConnected ? 'Active' : 'Inactive'}
                                </span>
                            </span>
                        </div>
                        ${blog && blog !== 'N/A' ? `
                            <div class="detail-row">
                                <span class="detail-label">Website/Blog</span>
                                <span class="detail-value">
                                    <a href="${blog}" target="_blank" class="github-link">${blog}</a>
                                </span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Pull Request Details Card -->
                ${member.githubConnected ? `
                <div class="detail-card card-large">
                    <div class="detail-card-header">
                        <i class="fas fa-code-pull-request"></i>
                        <h3>Pull Requests</h3>
                        <span class="detail-card-badge">${pullRequests.length} PRs</span>
                    </div>
                    <div class="detail-card-body">
                        ${pullRequests.length > 0 ? `
                        <div class="pr-list-container">
                            <div class="tab-container">
                                <div class="tab-header">
                                    <button class="tab-button active" onclick="switchPRTab('all')">All PRs (${pullRequests.length})</button>
                                    <button class="tab-button" onclick="switchPRTab('open')">Open (${fetchedOpenPRs})</button>
                                    <button class="tab-button" onclick="switchPRTab('merged')">Merged (${fetchedMergedPRs})</button>
                                    <button class="tab-button" onclick="switchPRTab('closed')">Closed (${fetchedClosedPRs})</button>
                                </div>
                                <div class="tab-content">
                                    <div class="tab-pane active" id="pr-tab-all">
                                        <div class="pr-list" style="max-height: 100%;">
                                            ${pullRequests.length > 0 ? pullRequests.map(pr => {
                                                const isMerged = pr.merged || pr.state === 'merged';
                                                const displayState = isMerged ? 'merged' : (pr.state === 'open' ? 'open' : 'closed');
                                                const displayLabel = isMerged ? 'Merged' : (pr.state === 'open' ? 'Open' : 'Closed');
                                                return `
                                                <div class="pr-item ${displayState}">
                                                    <div class="pr-header">
                                                        <a href="${pr.url || pr.html_url}" target="_blank" class="pr-title-link">
                                                            <i class="fas fa-code-pull-request"></i> ${pr.title || 'Untitled PR'}
                                                        </a>
                                                        <span class="pr-status-badge ${displayState}">
                                                            ${displayLabel}
                                                        </span>
                                                    </div>
                                                    ${pr.repository_full_name || pr.repository ? `
                                                        <div class="pr-repo">
                                                            <i class="fas fa-folder"></i> ${pr.repository_full_name || pr.repository.full_name || pr.repository}
                                                        </div>
                                                    ` : ''}
                                                    <div class="pr-meta">
                                                        <span><i class="fas fa-calendar"></i> ${formatDate(pr.created_at || pr.createdAt)}</span>
                                                        ${(pr.updated_at || pr.updatedAt) && (pr.updated_at !== pr.created_at || pr.updatedAt !== pr.createdAt) ? `
                                                            <span><i class="fas fa-sync"></i> Updated ${formatDate(pr.updated_at || pr.updatedAt)}</span>
                                                        ` : ''}
                                                    </div>
                                                </div>
                                            `;
                                            }).join('') : '<p style="text-align: center; color: #64748b; padding: 2rem;">No pull requests found.</p>'}
                                        </div>
                                    </div>
                                    <div class="tab-pane" id="pr-tab-open">
                                        <div class="pr-list" style="max-height: 100%;">
                                            ${pullRequests.filter(pr => pr.state === 'open' && !pr.merged).length > 0 ? pullRequests.filter(pr => pr.state === 'open' && !pr.merged).map(pr => {
                                                return `
                                                <div class="pr-item open">
                                                    <div class="pr-header">
                                                        <a href="${pr.url || pr.html_url}" target="_blank" class="pr-title-link">
                                                            <i class="fas fa-code-pull-request"></i> ${pr.title || 'Untitled PR'}
                                                        </a>
                                                        <span class="pr-status-badge open">Open</span>
                                                    </div>
                                                    ${pr.repository_full_name || pr.repository ? `
                                                        <div class="pr-repo">
                                                            <i class="fas fa-folder"></i> ${pr.repository_full_name || pr.repository.full_name || pr.repository}
                                                        </div>
                                                    ` : ''}
                                                    <div class="pr-meta">
                                                        <span><i class="fas fa-calendar"></i> ${formatDate(pr.created_at || pr.createdAt)}</span>
                                                    </div>
                                                </div>
                                            `;
                                            }).join('') : '<p style="text-align: center; color: #64748b; padding: 2rem;">No open pull requests.</p>'}
                                        </div>
                                    </div>
                                    <div class="tab-pane" id="pr-tab-merged">
                                        <div class="pr-list" style="max-height: 100%;">
                                            ${pullRequests.filter(pr => pr.merged || pr.state === 'merged').length > 0 ? pullRequests.filter(pr => pr.merged || pr.state === 'merged').map(pr => {
                                                return `
                                                <div class="pr-item merged">
                                                    <div class="pr-header">
                                                        <a href="${pr.url || pr.html_url}" target="_blank" class="pr-title-link">
                                                            <i class="fas fa-code-pull-request"></i> ${pr.title || 'Untitled PR'}
                                                        </a>
                                                        <span class="pr-status-badge merged">Merged</span>
                                                    </div>
                                                    ${pr.repository_full_name || pr.repository ? `
                                                        <div class="pr-repo">
                                                            <i class="fas fa-folder"></i> ${pr.repository_full_name || pr.repository.full_name || pr.repository}
                                                        </div>
                                                    ` : ''}
                                                    <div class="pr-meta">
                                                        <span><i class="fas fa-calendar"></i> ${formatDate(pr.created_at || pr.createdAt)}</span>
                                                    </div>
                                                </div>
                                            `;
                                            }).join('') : '<p style="text-align: center; color: #64748b; padding: 2rem;">No merged pull requests.</p>'}
                                        </div>
                                    </div>
                                    <div class="tab-pane" id="pr-tab-closed">
                                        <div class="pr-list" style="max-height: 100%;">
                                            ${pullRequests.filter(pr => pr.state === 'closed' && !pr.merged).length > 0 ? pullRequests.filter(pr => pr.state === 'closed' && !pr.merged).map(pr => {
                                                return `
                                                <div class="pr-item closed">
                                                    <div class="pr-header">
                                                        <a href="${pr.url || pr.html_url}" target="_blank" class="pr-title-link">
                                                            <i class="fas fa-code-pull-request"></i> ${pr.title || 'Untitled PR'}
                                                        </a>
                                                        <span class="pr-status-badge closed">Closed</span>
                                                    </div>
                                                    ${pr.repository_full_name || pr.repository ? `
                                                        <div class="pr-repo">
                                                            <i class="fas fa-folder"></i> ${pr.repository_full_name || pr.repository.full_name || pr.repository}
                                                        </div>
                                                    ` : ''}
                                                    <div class="pr-meta">
                                                        <span><i class="fas fa-calendar"></i> ${formatDate(pr.created_at || pr.createdAt)}</span>
                                                    </div>
                                                </div>
                                            `;
                                            }).join('') : '<p style="text-align: center; color: #64748b; padding: 2rem;">No closed pull requests.</p>'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        ` : `
                        <div class="empty-state">
                            <i class="fas fa-code-pull-request"></i>
                            <p>No pull requests found</p>
                            <a href="${githubProfileUrl}?tab=pullrequests" target="_blank" class="btn btn-secondary" style="margin-top: 1rem;">
                                <i class="fas fa-external-link-alt"></i> View PRs on GitHub
                            </a>
                        </div>
                        `}
                    </div>
                </div>
                ` : ''}

                <!-- Recent Commits Card -->
                ${member.githubConnected && recentCommits.length > 0 ? `
                <div class="detail-card card-large">
                    <div class="detail-card-header">
                        <i class="fas fa-code-commit"></i>
                        <h3>Recent Commits</h3>
                        <span class="detail-card-badge">${recentCommits.length} commits</span>
                    </div>
                    <div class="detail-card-body">
                        <div class="commits-list-container">
                            <div class="commits-list">
                                ${recentCommits.slice(0, 20).map(commit => `
                                    <div class="commit-item">
                                        <div class="commit-header">
                                            <a href="${commit.url}" target="_blank" class="commit-message-link">
                                                <i class="fas fa-code-commit"></i> ${commit.message || 'No message'}
                                            </a>
                                        </div>
                                        <div class="commit-meta">
                                            <a href="${commit.repositoryUrl}" target="_blank" class="commit-repo-link">
                                                <i class="fas fa-folder"></i> ${commit.repository}
                                            </a>
                                            <span class="commit-date">
                                                <i class="fas fa-calendar"></i> ${formatDate(commit.date)}
                                            </span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            ${recentCommits.length > 20 ? `
                                <div style="text-align: center; margin-top: 1rem;">
                                    <a href="${githubProfileUrl}" target="_blank" class="btn btn-secondary">
                                        <i class="fas fa-external-link-alt"></i> View All Commits on GitHub
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                ` : ''}

                <!-- Repository Details Card -->
                ${member.githubConnected && repositories.length > 0 ? `
                <div class="detail-card card-large">
                    <div class="detail-card-header">
                        <i class="fas fa-code-branch"></i>
                        <h3>Repositories</h3>
                        <span class="detail-card-badge">${repositories.length} Repos</span>
                    </div>
                    <div class="detail-card-body">
                        <div class="repo-stats-summary">
                            <div class="repo-stat-summary-item">
                                <i class="fas fa-star"></i>
                                <span>${formatNumber(totalStarsFromRepos)} Total Stars</span>
                            </div>
                            <div class="repo-stat-summary-item">
                                <i class="fas fa-code-branch"></i>
                                <span>${formatNumber(totalForksFromRepos)} Total Forks</span>
                            </div>
                            <div class="repo-stat-summary-item">
                                <i class="fas fa-exclamation-circle"></i>
                                <span>${formatNumber(repositories.reduce((sum, r) => sum + r.open_issues, 0))} Open Issues</span>
                            </div>
                        </div>
                        <div class="repo-list-container">
                            <h4 style="margin: 1rem 0 0.5rem 0; color: #1e293b;">Recent Repositories</h4>
                            <div class="repo-list">
                                ${repositories.slice(0, 15).map(repo => `
                                    <div class="repo-item">
                                        <div class="repo-header">
                                            <div class="repo-title-section">
                                                <a href="${repo.url}" target="_blank" class="repo-title-link">
                                                    <i class="fas fa-folder${repo.is_private ? '-lock' : ''}"></i>
                                                    ${repo.name}
                                                </a>
                                                ${repo.is_private ? '<span class="repo-private-badge">Private</span>' : ''}
                                            </div>
                                            <div class="repo-meta-badges">
                                                ${repo.stars > 0 ? `
                                                    <span class="repo-meta-badge" title="Stars">
                                                        <i class="fas fa-star"></i> ${formatNumber(repo.stars)}
                                                    </span>
                                                ` : ''}
                                                ${repo.forks > 0 ? `
                                                    <span class="repo-meta-badge" title="Forks">
                                                        <i class="fas fa-code-branch"></i> ${formatNumber(repo.forks)}
                                                    </span>
                                                ` : ''}
                                                ${repo.open_issues > 0 ? `
                                                    <span class="repo-meta-badge issues" title="Open Issues">
                                                        <i class="fas fa-exclamation-circle"></i> ${formatNumber(repo.open_issues)}
                                                    </span>
                                                ` : ''}
                                            </div>
                                        </div>
                                        ${repo.description ? `
                                            <p class="repo-description">${repo.description}</p>
                                        ` : ''}
                                        <div class="repo-footer">
                                        ${repo.language && repo.language.trim() ? `
                                            <span class="repo-language">
                                                <span class="repo-language-dot"></span>
                                                ${repo.language}
                                            </span>
                                        ` : ''}
                                            <span class="repo-updated">
                                                Updated ${formatDate(repo.updated_at)}
                                            </span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            ${repositories.length > 15 ? `
                                <div style="text-align: center; margin-top: 1rem;">
                                    <a href="${githubProfileUrl}?tab=repositories" target="_blank" class="btn btn-secondary">
                                        <i class="fas fa-external-link-alt"></i> View All ${repositories.length} Repositories on GitHub
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Go back to members page
 */
/**
 * Switch PR tab
 * @param {string} tabName - Tab name (all, open, merged, closed)
 */
window.switchPRTab = function(tabName) {
    // Remove active class from all tab buttons and panes
    const container = document.querySelector('.tab-container');
    if (!container) return;
    
    container.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    container.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    
    // Add active class to selected tab button
    const buttons = container.querySelectorAll('.tab-button');
    buttons.forEach((btn) => {
        const btnText = btn.textContent.toLowerCase();
        if (btnText.includes(tabName) || (tabName === 'all' && btnText.includes('all'))) {
            btn.classList.add('active');
        }
    });
    
    // Show corresponding tab pane
    const targetPane = container.querySelector(`#pr-tab-${tabName}`);
    if (targetPane) {
        targetPane.classList.add('active');
    }
};

window.goBackToMembers = function() {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    const membersPage = document.getElementById('membersPage');
    if (membersPage) {
        membersPage.classList.add('active');
    }
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
        if (nav.dataset.page === 'members') {
            nav.classList.add('active');
        }
    });
    
    // Trigger members page load
    if (window.loadMembersPage) {
        window.loadMembersPage();
    }
};

// Export viewMember for use in other modules
export { viewMember };


// Make viewMember globally available for onclick handlers
window.viewMember = viewMember;

