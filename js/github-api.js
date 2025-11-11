// GitHub API Configuration and Functions
// Token is injected from environment variables at build time
// For local development, create a .env file with VITE_GITHUB_TOKEN
// Build script will replace this placeholder with actual value
const GITHUB_TOKEN = 'VITE_GITHUB_TOKEN';

// Debug: Log token status (only first 4 chars for security)
if (typeof window !== 'undefined') {
    const tokenStatus = GITHUB_TOKEN === 'VITE_GITHUB_TOKEN' 
        ? 'NOT SET (placeholder)' 
        : `SET (${GITHUB_TOKEN.substring(0, 4)}...)`;
    console.log(`[GitHub API] Token status: ${tokenStatus}`);
}

// Cache for GitHub user data
export let githubUserCache = {};

// Rate limit tracking
let rateLimitReset = null;
let rateLimitRemaining = null;

/**
 * Clears the GitHub user cache
 */
export function clearGitHubCache() {
    githubUserCache = {};
}

/**
 * Check rate limit headers and wait if needed
 * @param {Response} response - Fetch response object
 * @returns {Promise<void>}
 */
async function handleRateLimit(response) {
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');
    
    if (remaining !== null) {
        rateLimitRemaining = parseInt(remaining, 10);
    }
    if (reset !== null) {
        rateLimitReset = parseInt(reset, 10) * 1000; // Convert to milliseconds
    }
    
    // If we hit rate limit (429 or remaining is 0), wait until reset
    if (response.status === 429 || (rateLimitRemaining !== null && rateLimitRemaining === 0)) {
        const waitTime = rateLimitReset ? Math.max(0, rateLimitReset - Date.now() + 1000) : 60000;
        console.warn(`Rate limit hit. Waiting ${Math.round(waitTime / 1000)}s before retrying...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
}

/**
 * Make a GitHub API request with rate limit handling
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<Response>}
 */
async function githubApiRequest(url, options = {}, maxRetries = 3) {
    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        ...options.headers
    };
    
    // Add token if available and not placeholder
    const hasToken = GITHUB_TOKEN && GITHUB_TOKEN !== 'VITE_GITHUB_TOKEN' && GITHUB_TOKEN.trim() !== '';
    if (hasToken) {
        headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    } else {
        // Log warning if token is missing (only once per session)
        if (!window._githubTokenWarningShown) {
            console.warn('GitHub token not found or invalid. Using unauthenticated requests (60 req/hour limit). Set VITE_GITHUB_TOKEN in Netlify environment variables.');
            window._githubTokenWarningShown = true;
        }
    }
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const response = await fetch(url, { ...options, headers });
        
        // Handle rate limiting
        if (response.status === 429) {
            await handleRateLimit(response);
            // Retry after waiting
            if (attempt < maxRetries - 1) {
                continue; // Retry after waiting
            }
            // If all retries exhausted, return the response
            return response;
        }
        
        // Handle 403 Forbidden
        if (response.status === 403) {
            // Check if it's a rate limit (GitHub sometimes returns 403 for rate limits)
            const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
            if (rateLimitRemaining === '0') {
                await handleRateLimit(response);
                if (attempt < maxRetries - 1) {
                    continue; // Retry after waiting
                }
            }
            
            // If 403 and no token, log and return
            if (!hasToken) {
                console.warn(`GitHub API 403 Forbidden - token may be missing or invalid. Skipping request to ${url}`);
            } else {
                console.warn(`GitHub API 403 Forbidden - token may be invalid or expired. Request: ${url}`);
            }
            return response; // Return the response but don't throw
        }
        
        // Success or other status codes
        return response;
    }
    
    // Should never reach here, but just in case
    return fetch(url, { ...options, headers });
}

/**
 * Fetches GitHub user information from the GitHub API
 * @param {string} githubUsername - The GitHub username to fetch
 * @param {boolean} useCache - Whether to use cached data (default: true)
 * @returns {Promise<Object|null>} - GitHub user info or null if not found
 */
export async function fetchGitHubUserInfo(githubUsername, useCache = true) {
    // Check cache first
    if (useCache && githubUserCache[githubUsername] !== undefined) {
        return githubUserCache[githubUsername];
    }

    try {
        const response = await githubApiRequest(`https://api.github.com/users/${githubUsername}`);

        if (response.ok) {
            const userData = await response.json();
            const userInfo = {
                username: userData.login,
                name: userData.name,
                avatar_url: userData.avatar_url,
                html_url: userData.html_url,
                public_repos: userData.public_repos,
                followers: userData.followers,
                following: userData.following,
                bio: userData.bio || '',
                location: userData.location || '',
                blog: userData.blog || '',
                company: userData.company || ''
            };
            
            // Cache the result
            githubUserCache[githubUsername] = userInfo;
            return userInfo;
        } else if (response.status === 404) {
            console.warn(`GitHub user '${githubUsername}' not found (404)`);
            githubUserCache[githubUsername] = null;
            return null;
        } else if (response.status === 403 || response.status === 429) {
            // Rate limited or forbidden - return null but don't cache
            console.warn(`GitHub API ${response.status} for user '${githubUsername}' - skipping`);
            return null;
        } else {
            console.error(`GitHub API error: ${response.status} - ${response.statusText}`);
            return null;
        }
    } catch (error) {
        console.error('Error fetching GitHub user info:', error);
        return null;
    }
}

/**
 * Fallback: Count PRs repo-by-repo with pagination
 * Used when Search API fails or returns 1000 (limit)
 * @param {Array} repos - Array of repository objects
 * @param {string} githubUsername - GitHub username
 * @returns {Promise<Object>} - PR counts {total, merged, open, closed}
 */
async function countPRsByRepos(repos, githubUsername) {
    let total = 0;
    let merged = 0;
    let open = 0;
    let closed = 0;
    const recentPRsList = [];
    
    console.log(`Counting PRs repo-by-repo (fallback method)...`);
    
    for (const repo of repos) {
        try {
            let page = 1;
            let hasMore = true;
            
            while (hasMore) {
                const prsResponse = await githubApiRequest(
                    `https://api.github.com/repos/${repo.full_name}/pulls?state=all&per_page=100&page=${page}&sort=updated`
                );
                
                if (prsResponse.status === 409 || prsResponse.status === 403 || !prsResponse.ok) {
                    hasMore = false;
                    continue;
                }
                
                if (prsResponse.ok) {
                    const prs = await prsResponse.json();
                    const userPRs = prs.filter(pr => pr.user?.login === githubUsername);
                    
                    userPRs.forEach(pr => {
                        total++;
                        if (pr.merged_at) {
                            merged++;
                        } else if (pr.state === 'open') {
                            open++;
                        } else {
                            closed++;
                        }
                        
                        // Collect recent PRs
                        if (recentPRsList.length < 10) {
                            recentPRsList.push({
                                title: pr.title,
                                url: pr.html_url,
                                state: pr.state,
                                merged: !!pr.merged_at,
                                createdAt: pr.created_at
                            });
                        }
                    });
                    
                    // Check if there are more pages
                    const linkHeader = prsResponse.headers.get('Link');
                    hasMore = linkHeader && linkHeader.includes('rel="next"') && prs.length === 100;
                    page++;
                } else {
                    hasMore = false;
                }
                
                await new Promise(r => setTimeout(r, 150));
            }
        } catch (err) {
            console.warn(`  Error fetching PRs from ${repo.full_name}:`, err.message);
            continue;
        }
    }
    
    console.log(`Total PRs (fallback): ${total} (${merged} merged, ${open} open, ${closed} closed)`);
    return { total, merged, open, closed, recentPRs: recentPRsList };
}

/**
 * Fallback: Count commits repo-by-repo with simplified pagination
 * Used when Search API fails or returns 1000 (limit)
 * @param {Array} repos - Array of repository objects
 * @param {string} githubUsername - GitHub username
 * @returns {Promise<number>} - Total commit count
 */
async function countCommitsByRepos(repos, githubUsername) {
    let totalCommits = 0;
    let successfulRepos = 0;
    
    console.log(`Counting commits repo-by-repo (fallback method)...`);
    
    for (const repo of repos) {
        try {
            // Fetch with per_page=100 to get accurate pagination
            const commitsResponse = await githubApiRequest(
                `https://api.github.com/repos/${repo.full_name}/commits?author=${githubUsername}&per_page=100`
            );
            
            if (commitsResponse.status === 409 || commitsResponse.status === 403 || !commitsResponse.ok) {
                continue;
            }
            
            if (commitsResponse.ok) {
                const linkHeader = commitsResponse.headers.get('Link');
                if (linkHeader && linkHeader.includes('rel="last"')) {
                    // Multiple pages - fetch all pages and count
                    const lastMatch = linkHeader.match(/<[^>]+page=(\d+)[^>]*>; rel="last"/);
                    if (lastMatch) {
                        const lastPage = parseInt(lastMatch[1], 10);
                        // Fetch last page to get accurate count
                        const lastPageResponse = await githubApiRequest(
                            `https://api.github.com/repos/${repo.full_name}/commits?author=${githubUsername}&per_page=100&page=${lastPage}`
                        );
                        if (lastPageResponse.ok && lastPageResponse.status !== 409) {
                            const lastPageCommits = await lastPageResponse.json();
                            const repoCommits = (lastPage - 1) * 100 + lastPageCommits.length;
                            totalCommits += repoCommits;
                            successfulRepos++;
                            console.log(`  ${repo.full_name}: ${repoCommits} commits`);
                        }
                    }
                } else {
                    // Single page
                    const commits = await commitsResponse.json();
                    totalCommits += commits.length;
                    successfulRepos++;
                    if (commits.length > 0) {
                        console.log(`  ${repo.full_name}: ${commits.length} commits`);
                    }
                }
            }
            
            await new Promise(r => setTimeout(r, 150));
        } catch (err) {
            console.warn(`  Error fetching commits from ${repo.full_name}:`, err.message);
            continue;
        }
    }
    
    console.log(`Total commits (fallback): ${totalCommits} (from ${successfulRepos}/${repos.length} repos)`);
    return totalCommits;
}

/**
 * Get user activity snapshot
 * @param {string} githubUsername - GitHub username
 * @param {Object} opts - Options (from, to, prsFirst, lifetime)
 * @returns {Promise<Object>} - Activity snapshot
 */
export async function getUserActivitySnapshot(githubUsername, opts = {}) {
    try {
        const githubInfo = await fetchGitHubUserInfo(githubUsername);
        
        if (!githubInfo) {
            console.warn(`GitHub user info not found for ${githubUsername}`);
            return {
                publicRepos: 0,
                followers: 0,
                following: 0,
                contributions: 0,
                commits: 0,
                pullRequests: 0,
                mergedPRs: 0,
                openPRs: 0,
                closedPRs: 0,
                issues: 0,
                recentPRs: [],
                totalStars: 0,
                totalForks: 0
            };
        }
        
        // Fetch commits, repos, and PRs (lifetime data)
        let commits = 0;
        let pullRequests = 0;
        let mergedPRs = 0;
        let openPRs = 0;
        let closedPRs = 0;
        let issues = 0;
        let recentPRs = [];
        
        try {
            // Get user's repositories (lifetime - all repos)
            const repos = await fetchUserRepositories(githubUsername, 100);
            
            if (!repos || repos.length === 0) {
                console.log(`No repositories found for ${githubUsername}`);
                return {
                    publicRepos: githubInfo.public_repos || 0,
                    followers: githubInfo.followers || 0,
                    following: githubInfo.following || 0,
                    contributions: 0,
                    commits: 0,
                    pullRequests: 0,
                    mergedPRs: 0,
                    openPRs: 0,
                    closedPRs: 0,
                    issues: 0,
                    recentPRs: [],
                    totalStars: 0,
                    totalForks: 0
                };
            }
            
            // Use GitHub Search API to get total commit count directly
            // This is much simpler and more accurate than pagination calculation
            try {
                console.log(`Fetching total commit count for ${githubUsername} using Search API...`);
                const commitsSearchResponse = await githubApiRequest(
                    `https://api.github.com/search/commits?q=author:${githubUsername}`
                );
                
                if (commitsSearchResponse.ok) {
                    const commitsSearchData = await commitsSearchResponse.json();
                    commits = commitsSearchData.total_count || 0;
                    
                    // Note: Search API is limited to 1000 results
                    // If we get exactly 1000, the actual count might be higher
                    if (commits === 1000) {
                        console.log(`  Note: Commit count is at Search API limit (1000). Actual count may be higher.`);
                    }
                    console.log(`Total commits for ${githubUsername}: ${commits}`);
                } else if (commitsSearchResponse.status === 422) {
                    // 422 = Validation failed (e.g., user doesn't exist or no commits)
                    console.log(`No commits found for ${githubUsername} (or user not found)`);
                    commits = 0;
                } else {
                    console.warn(`Search API failed for commits (status: ${commitsSearchResponse.status}), falling back to repo-by-repo counting...`);
                    // Fallback: count commits repo-by-repo (simplified pagination)
                    commits = await countCommitsByRepos(repos, githubUsername);
                }
            } catch (err) {
                console.warn(`Error using Search API for commits:`, err.message);
                // Fallback: count commits repo-by-repo
                commits = await countCommitsByRepos(repos, githubUsername);
            }
            
            // Fetch PRs using GitHub Search API to get total count directly
            if (GITHUB_TOKEN && GITHUB_TOKEN !== 'VITE_GITHUB_TOKEN' && GITHUB_TOKEN.trim() !== '') {
                try {
                    console.log(`Fetching total PR count for ${githubUsername} using Search API...`);
                    const prsSearchResponse = await githubApiRequest(
                        `https://api.github.com/search/issues?q=author:${githubUsername}+type:pr`
                    );
                    
                    if (prsSearchResponse.ok) {
                        const prsSearchData = await prsSearchResponse.json();
                        pullRequests = prsSearchData.total_count || 0;
                        
                        // Note: Search API is limited to 1000 results
                        if (pullRequests === 1000) {
                            console.log(`  Note: PR count is at Search API limit (1000). Actual count may be higher.`);
                        }
                        console.log(`Total PRs for ${githubUsername}: ${pullRequests}`);
                        
                        // Fetch some PRs to get breakdown (merged/open/closed) and recent PRs
                        // We'll fetch up to 100 PRs to categorize them
                        try {
                            const prsListResponse = await githubApiRequest(
                                `https://api.github.com/search/issues?q=author:${githubUsername}+type:pr&sort=updated&order=desc&per_page=100`
                            );
                            
                            if (prsListResponse.ok) {
                                const prsListData = await prsListResponse.json();
                                const prs = prsListData.items || [];
                                
                                // Count by state
                                let mergedCount = 0;
                                let openCount = 0;
                                let closedCount = 0;
                                
                                // Store merged status for PRs we check (for recentPRs display)
                                const prMergedStatus = new Map();
                                
                                // For each PR, we need to check if it's merged
                                // Search API doesn't include merged_at, so we'll fetch PR details for merged status
                                // But to avoid too many API calls, we'll estimate based on state
                                // If state is 'closed', it could be merged or just closed
                                // We'll fetch a sample to get accurate merged count
                                for (const pr of prs.slice(0, 30)) { // Check first 30 PRs for merged status
                                    try {
                                        const prDetailResponse = await githubApiRequest(pr.pull_request.url);
                                        if (prDetailResponse.ok) {
                                            const prDetail = await prDetailResponse.json();
                                            const isMerged = !!prDetail.merged_at;
                                            prMergedStatus.set(pr.id, isMerged);
                                            
                                            if (isMerged) {
                                                mergedCount++;
                                            } else if (prDetail.state === 'open') {
                                                openCount++;
                                            } else {
                                                closedCount++;
                                            }
                                        }
                                        await new Promise(r => setTimeout(r, 50)); // Small delay
                                    } catch (err) {
                                        // If we can't fetch detail, estimate from state
                                        prMergedStatus.set(pr.id, false); // Assume not merged if we can't check
                                        if (pr.state === 'open') {
                                            openCount++;
                                        } else {
                                            closedCount++;
                                        }
                                    }
                                }
                                
                                // Estimate remaining PRs based on sample
                                if (prs.length > 30) {
                                    const sampleMerged = mergedCount;
                                    const sampleOpen = openCount;
                                    const sampleClosed = closedCount;
                                    const sampleTotal = sampleMerged + sampleOpen + sampleClosed;
                                    
                                    if (sampleTotal > 0) {
                                        const mergedRatio = sampleMerged / sampleTotal;
                                        const openRatio = sampleOpen / sampleTotal;
                                        const closedRatio = sampleClosed / sampleTotal;
                                        
                                        const remaining = prs.length - 30;
                                        mergedCount += Math.round(remaining * mergedRatio);
                                        openCount += Math.round(remaining * openRatio);
                                        closedCount += Math.round(remaining * closedRatio);
                                    }
                                }
                                
                                mergedPRs = mergedCount;
                                openPRs = openCount;
                                closedPRs = closedCount;
                                
                                // Get recent PRs for display (use first 10 from the list)
                                // Use stored merged status for PRs we checked, otherwise use state as approximation
                                recentPRs = prs.slice(0, 10).map(pr => {
                                    const isMerged = prMergedStatus.get(pr.id) || false;
                                    return {
                                        title: pr.title,
                                        url: pr.html_url,
                                        state: pr.state,
                                        merged: isMerged,
                                        createdAt: pr.created_at
                                    };
                                });
                                
                                console.log(`PR breakdown: ${mergedPRs} merged, ${openPRs} open, ${closedPRs} closed`);
                            }
                        } catch (err) {
                            console.warn(`Error fetching PR details for breakdown:`, err.message);
                            // Use fallback: fetch PRs repo-by-repo
                            const prCounts = await countPRsByRepos(repos, githubUsername);
                            pullRequests = prCounts.total;
                            mergedPRs = prCounts.merged;
                            openPRs = prCounts.open;
                            closedPRs = prCounts.closed;
                            recentPRs = prCounts.recentPRs || [];
                        }
                    } else if (prsSearchResponse.status === 422) {
                        // 422 = Validation failed (e.g., user doesn't exist or no PRs)
                        console.log(`No PRs found for ${githubUsername} (or user not found)`);
                        pullRequests = 0;
                        mergedPRs = 0;
                        openPRs = 0;
                        closedPRs = 0;
                    } else {
                        console.warn(`Search API failed for PRs (status: ${prsSearchResponse.status}), falling back to repo-by-repo counting...`);
                        // Fallback: count PRs repo-by-repo
                        const prCounts = await countPRsByRepos(repos, githubUsername);
                        pullRequests = prCounts.total;
                        mergedPRs = prCounts.merged;
                        openPRs = prCounts.open;
                        closedPRs = prCounts.closed;
                        recentPRs = prCounts.recentPRs || [];
                    }
                } catch (err) {
                    console.warn(`Error using Search API for PRs:`, err.message);
                    // Fallback: count PRs repo-by-repo
                    const prCounts = await countPRsByRepos(repos, githubUsername);
                    pullRequests = prCounts.total;
                    mergedPRs = prCounts.merged;
                    openPRs = prCounts.open;
                    closedPRs = prCounts.closed;
                    recentPRs = prCounts.recentPRs || [];
                }
            }
            
        } catch (error) {
            console.warn(`Error fetching activity data for ${githubUsername}:`, error);
        }
        
        return {
            publicRepos: githubInfo.public_repos || 0,
            followers: githubInfo.followers || 0,
            following: githubInfo.following || 0,
            contributions: 0, // Not needed - removed
            commits: commits,
            pullRequests: pullRequests,
            mergedPRs: mergedPRs,
            openPRs: openPRs,
            closedPRs: closedPRs,
            issues: issues,
            recentPRs: recentPRs,
            totalStars: 0, // Will be calculated from repos in github-refresh.js
            totalForks: 0  // Will be calculated from repos in github-refresh.js
        };
    } catch (error) {
        console.error(`Error in getUserActivitySnapshot for ${githubUsername}:`, error);
        return {
            publicRepos: 0,
            followers: 0,
            following: 0,
            contributions: 0,
            commits: 0,
            pullRequests: 0,
            mergedPRs: 0,
            openPRs: 0,
            closedPRs: 0,
            issues: 0,
            recentPRs: [],
            totalStars: 0,
            totalForks: 0
        };
    }
}

/**
 * Fetch user languages
 * @param {string} githubUsername - GitHub username
 * @param {number} limit - Maximum repos to check
 * @returns {Promise<Object>} - Language breakdown
 */
export async function fetchUserLanguages(githubUsername, limit = 100) {
    try {
        // Return empty object if no token or token is placeholder
        if (!GITHUB_TOKEN || GITHUB_TOKEN === 'VITE_GITHUB_TOKEN' || GITHUB_TOKEN.trim() === '') {
            return {};
        }
        
        const reposResponse = await githubApiRequest(
            `https://api.github.com/users/${githubUsername}/repos?sort=updated&per_page=${limit}`
        );

        if (!reposResponse.ok) {
            return {};
        }

        const repos = await reposResponse.json();
        const languageBreakdown = {};
        
        // Limit to first 20 repos to avoid too many API calls
        const reposToCheck = repos.slice(0, Math.min(20, repos.length));
        
        for (const repo of reposToCheck) {
            try {
                const langResponse = await githubApiRequest(
                    `https://api.github.com/repos/${repo.full_name}/languages`
                );
                
                if (langResponse.ok) {
                    const repoLanguages = await langResponse.json();
                    Object.entries(repoLanguages).forEach(([lang, bytes]) => {
                        if (lang && lang.trim()) {
                            languageBreakdown[lang] = (languageBreakdown[lang] || 0) + bytes;
                        }
                    });
                } else if (langResponse.status === 403 || langResponse.status === 429) {
                    // Rate limited, stop fetching languages
                    break;
                }
                
                // Delay between requests to avoid rate limits
                await new Promise(r => setTimeout(r, 300));
            } catch (error) {
                console.error(`Error fetching languages for ${repo.full_name}:`, error);
            }
        }
        
        return languageBreakdown;
    } catch (error) {
        console.error('Error fetching user languages:', error);
        return {};
    }
}

/**
 * Fetch user repositories
 * @param {string} githubUsername - GitHub username
 * @param {number} limit - Maximum repos to fetch
 * @returns {Promise<Array>} - Array of repository objects
 */
export async function fetchUserRepositories(githubUsername, limit = 100) {
    try {
        const allRepos = [];
        let page = 1;
        const perPage = 100;
        let hasMore = true;

        while (hasMore && allRepos.length < limit) {
            const response = await githubApiRequest(
                `https://api.github.com/users/${githubUsername}/repos?sort=updated&per_page=${perPage}&page=${page}`
            );

            if (!response.ok) {
                if (response.status === 404) {
                    break;
                }
                // If rate limited or forbidden, return what we have so far
                if (response.status === 403 || response.status === 429) {
                    console.warn(`GitHub API ${response.status} for repos of '${githubUsername}' - returning partial results`);
                    break;
                }
                // For other errors, throw but catch below
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const repos = await response.json();
            
            if (repos.length === 0) {
                hasMore = false;
            } else {
                repos.forEach(repo => {
                    if (allRepos.length < limit) {
                        allRepos.push({
                            id: repo.id,
                            name: repo.name,
                            full_name: repo.full_name,
                            description: repo.description || '',
                            url: repo.html_url,
                            language: repo.language || null,
                            stars: repo.stargazers_count || 0,
                            forks: repo.forks_count || 0,
                            open_issues: repo.open_issues_count || 0,
                            is_private: repo.private,
                            created_at: repo.created_at,
                            updated_at: repo.updated_at,
                            pushed_at: repo.pushed_at,
                            default_branch: repo.default_branch
                        });
                    }
                });
                
                const linkHeader = response.headers.get('Link');
                hasMore = repos.length === perPage && (!linkHeader || linkHeader.includes('rel="next"'));
                page++;
                
                // Small delay between pages to avoid hitting rate limits
                if (hasMore) {
                    await new Promise(r => setTimeout(r, 100));
                }
            }
        }
        
        return allRepos;
    } catch (error) {
        console.error('Error fetching repositories:', error);
        return [];
    }
}

/**
 * Fetch contribution calendar
 * @param {string} login - GitHub username
 * @returns {Promise<Object|null>} - Contribution calendar data
 */
export async function fetchContributionCalendar(login) {
    try {
        // Return null if no token or token is placeholder
        if (!GITHUB_TOKEN || GITHUB_TOKEN === 'VITE_GITHUB_TOKEN') {
            return null;
        }
        
        // This would require GraphQL API - simplified version
        return null;
    } catch (error) {
        console.error(`Error in fetchContributionCalendar for ${login}:`, error);
        return null;
    }
}

/**
 * Fetch user pull requests
 * @param {string} githubUsername - GitHub username
 * @param {string} state - PR state: 'all', 'open', 'closed', 'merged'
 * @param {number} limit - Maximum PRs to fetch
 * @returns {Promise<Array>} - Array of PR objects
 */
export async function fetchUserPullRequests(githubUsername, state = 'all', limit = 30) {
    try {
        // Return empty array if no token or token is placeholder
        if (!GITHUB_TOKEN || GITHUB_TOKEN === 'VITE_GITHUB_TOKEN') {
            return [];
        }
        
        // This would require GraphQL API - simplified version
        return [];
    } catch (error) {
        console.error('Error fetching pull requests:', error);
        return [];
    }
}

/**
 * Fetch recent commits
 * @param {string} githubUsername - GitHub username
 * @param {number} limit - Maximum commits to fetch
 * @returns {Promise<Array>} - Array of commit objects
 */
export async function fetchRecentCommits(githubUsername, limit = 30) {
    try {
        // Return empty array if no token or token is placeholder
        if (!GITHUB_TOKEN || GITHUB_TOKEN === 'VITE_GITHUB_TOKEN' || GITHUB_TOKEN.trim() === '') {
            return [];
        }
        
        const reposResponse = await githubApiRequest(
            `https://api.github.com/users/${githubUsername}/repos?sort=updated&per_page=10`
        );

        if (!reposResponse.ok) {
            return [];
        }

        const repos = await reposResponse.json();
        const allCommits = [];
        
        for (const repo of repos.slice(0, 10)) {
            if (allCommits.length >= limit) break;
            
            try {
                const commitsResponse = await githubApiRequest(
                    `https://api.github.com/repos/${repo.full_name}/commits?author=${githubUsername}&per_page=10&sort=author-date&order=desc`
                );
                
                if (commitsResponse.ok) {
                    const commits = await commitsResponse.json();
                    commits.forEach(commit => {
                        if (allCommits.length < limit) {
                            allCommits.push({
                                sha: commit.sha,
                                message: commit.commit.message.split('\n')[0],
                                author: commit.commit.author.name,
                                date: commit.commit.author.date,
                                url: commit.html_url,
                                repository: repo.full_name,
                                repositoryUrl: repo.html_url
                            });
                        }
                    });
                } else if (commitsResponse.status === 403 || commitsResponse.status === 429) {
                    // Rate limited, stop fetching commits
                    break;
                }
                
                // Delay between requests to avoid rate limits
                await new Promise(r => setTimeout(r, 300));
            } catch (error) {
                console.error(`Error fetching commits from ${repo.full_name}:`, error);
            }
        }
        
        return allCommits
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, limit);
    } catch (error) {
        console.error('Error fetching recent commits:', error);
        return [];
    }
}

