/**
 * Type Definitions for Vedam Open Source Admin Dashboard
 * JSDoc type definitions for better IDE support and documentation
 */

/**
 * @typedef {Object} Member
 * @property {string} id - Member document ID
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {string} displayName - Display name
 * @property {string} email - Email address
 * @property {string} personalEmail - Personal email
 * @property {string} phoneNumber - Phone number
 * @property {string} whatsappNumber - WhatsApp number
 * @property {boolean} githubConnected - Whether GitHub is connected
 * @property {string} githubUsername - GitHub username
 * @property {GitHubActivity} [githubActivity] - GitHub activity data
 * @property {string} status - Member status (active/inactive)
 * @property {string} [role] - Member role
 * @property {string} [joinedAt] - Join date (ISO string)
 * @property {string} lastUpdated - Last update timestamp (ISO string)
 */

/**
 * @typedef {Object} GitHubActivity
 * @property {number} publicRepos - Number of public repositories
 * @property {number} [privateRepos] - Number of private repositories
 * @property {number} followers - Number of followers
 * @property {number} following - Number of following
 * @property {number} commits - Total commits
 * @property {number} pullRequests - Total pull requests
 * @property {number} [mergedPRs] - Merged pull requests
 * @property {number} [openPRs] - Open pull requests
 * @property {number} [closedPRs] - Closed pull requests
 * @property {number} [issues] - Number of issues
 * @property {number} totalStars - Total stars across repositories
 * @property {number} totalForks - Total forks across repositories
 * @property {Object<string, number>} [languages] - Language breakdown (language -> bytes)
 * @property {Array<Object>} [recentPRs] - Recent pull requests
 * @property {Object} [contributionCalendar] - Contribution calendar data
 * @property {string} lastUpdated - Last update timestamp (ISO string)
 */

/**
 * @typedef {Object} DashboardStats
 * @property {number} totalMembers - Total number of members
 * @property {number} totalRepos - Total repositories
 * @property {number} totalStars - Total stars
 * @property {number} totalPRs - Total pull requests
 * @property {number} totalCommits - Total commits
 */

/**
 * @typedef {Object} AnalyticsStats
 * @property {number} totalRepos - Total repositories
 * @property {number} totalStars - Total stars
 * @property {number} totalPRs - Total pull requests
 * @property {number} totalCommits - Total commits
 * @property {number} totalIssues - Total issues
 * @property {number} totalForks - Total forks
 * @property {number} avgRepos - Average repositories per member
 * @property {number} avgStars - Average stars per member
 * @property {number} avgPRs - Average PRs per member
 * @property {number} connectedMembers - Number of members with GitHub connected
 */

/**
 * @typedef {Object} ClubStats
 * @property {number} members - Total members
 * @property {number} membersWithGitHub - Members with GitHub connected
 * @property {number} projects - Total projects (repos)
 * @property {number} stars - Total stars
 * @property {number} totalCommits - Total commits
 * @property {number} totalForks - Total forks
 * @property {number} totalPullRequests - Total pull requests
 * @property {number} [events] - Number of events
 * @property {string} calculatedAt - Calculation timestamp (ISO string)
 * @property {string} lastUpdated - Last update timestamp (ISO string)
 */

/**
 * @typedef {Object} RepositoryStats
 * @property {number} public - Public repositories
 * @property {number} private - Private repositories
 * @property {number} stars - Total stars
 * @property {number} forks - Total forks
 * @property {number} prs - Total pull requests
 * @property {number} commits - Total commits
 */

/**
 * @typedef {Object} TopContributor
 * @property {string} name - Contributor name
 * @property {number} commits - Number of commits
 * @property {string} [username] - GitHub username
 */

/**
 * @typedef {Object} TopPRCreator
 * @property {string} name - Creator name
 * @property {number} prs - Total pull requests
 * @property {number} merged - Merged PRs
 * @property {number} open - Open PRs
 * @property {number} closed - Closed PRs
 * @property {string} [username] - GitHub username
 */

/**
 * @typedef {Object} ErrorContext
 * @property {string} [user] - User identifier
 * @property {string} [action] - Action being performed
 * @property {string} [module] - Module name
 * @property {string} [username] - GitHub username (if applicable)
 */

/**
 * @typedef {Object} ErrorInfo
 * @property {string} message - Error message
 * @property {string|null} stack - Error stack trace
 * @property {string} timestamp - Error timestamp (ISO string)
 * @property {ErrorContext} context - Error context
 */

/**
 * @typedef {Object} GitHubUserInfo
 * @property {string} username - GitHub username
 * @property {string} [name] - Display name
 * @property {string} avatar_url - Avatar URL
 * @property {string} html_url - Profile URL
 * @property {number} public_repos - Public repositories count
 * @property {number} followers - Followers count
 * @property {number} following - Following count
 * @property {string} [bio] - Bio
 * @property {string} [location] - Location
 * @property {string} [blog] - Blog URL
 * @property {string} [company] - Company
 */

/**
 * @typedef {Object} GitHubRepository
 * @property {number} id - Repository ID
 * @property {string} name - Repository name
 * @property {string} full_name - Full repository name (owner/repo)
 * @property {string} description - Repository description
 * @property {string} url - Repository URL
 * @property {string|null} language - Primary language
 * @property {number} stars - Star count
 * @property {number} forks - Fork count
 * @property {number} open_issues - Open issues count
 * @property {boolean} is_private - Whether repository is private
 * @property {string} created_at - Creation date (ISO string)
 * @property {string} updated_at - Last update date (ISO string)
 * @property {string} pushed_at - Last push date (ISO string)
 * @property {string} default_branch - Default branch name
 */

/**
 * @typedef {Object} ActivitySnapshot
 * @property {number} publicRepos - Public repositories
 * @property {number} followers - Followers
 * @property {number} following - Following
 * @property {number} commits - Total commits
 * @property {number} pullRequests - Total pull requests
 * @property {number} mergedPRs - Merged PRs
 * @property {number} openPRs - Open PRs
 * @property {number} closedPRs - Closed PRs
 * @property {number} issues - Issues count
 * @property {Array<Object>} recentPRs - Recent pull requests
 * @property {number} totalStars - Total stars (calculated separately)
 * @property {number} totalForks - Total forks (calculated separately)
 */

/**
 * @typedef {Object} Form
 * @property {string} id - Form document ID
 * @property {string} name - Form name
 * @property {string} [description] - Form description
 * @property {string} status - Form status (active/inactive/draft)
 * @property {string} [category] - Form category
 * @property {Array<string>} [tags] - Form tags
 * @property {Object} structure - Form structure/fields
 * @property {number} [submissionCount] - Number of submissions
 * @property {string} createdAt - Creation timestamp (ISO string)
 * @property {string} lastUpdated - Last update timestamp (ISO string)
 */

/**
 * @typedef {Object} FormSubmission
 * @property {string} id - Submission document ID
 * @property {string} formId - Form ID
 * @property {Object} data - Submission data
 * @property {string} submittedAt - Submission timestamp (ISO string)
 * @property {string} [submittedBy] - Submitter identifier
 */

