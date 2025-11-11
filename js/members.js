/**
 * @fileoverview Members Page Module
 * Handles member listing, filtering, sorting, and pagination
 * @module members
 */

// Members Page Module
import { getMembers } from "./data-store.js";
import { fetchGitHubUserInfo } from "./github-api.js";
import {
  getMemberDisplayName,
  getMemberEmail,
  getMemberPhone,
  showLoading,
  hideLoading,
  formatNumber,
  debounce,
  handleError,
} from "./utils.js";
import { validateMember } from "./utils/validation.js";
import { viewMember } from "./member-details.js";

// Make viewMember available globally for onclick handlers
window.viewMember = viewMember;

let currentPage = 1;
const membersPerPage = 20;

// DOM elements (will be initialized when page loads)
let membersTableBody,
  memberSearch,
  statusFilter,
  prFilter,
  sortFilter,
  clearSearchBtn,
  prevPage,
  nextPage,
  pageInfo;

/**
 * Initialize members page
 */
export function initializeMembersPage() {
  membersTableBody = document.getElementById("membersTableBody");
  memberSearch = document.getElementById("memberSearch");
  statusFilter = document.getElementById("statusFilter");
  prFilter = document.getElementById("prFilter");
  sortFilter = document.getElementById("sortFilter");
  clearSearchBtn = document.getElementById("clearSearch");
  prevPage = document.getElementById("prevPage");
  nextPage = document.getElementById("nextPage");
  pageInfo = document.getElementById("pageInfo");

  // Set up event listeners with debouncing for search
  if (memberSearch) {
    // Debounce search input to avoid excessive filtering
    const debouncedFilter = debounce(() => {
      filterMembers();
      if (clearSearchBtn) {
        clearSearchBtn.style.display = memberSearch.value ? "block" : "none";
      }
    }, 300);
    
    memberSearch.addEventListener("input", () => {
      // Show clear button immediately
      if (clearSearchBtn) {
        clearSearchBtn.style.display = memberSearch.value ? "block" : "none";
      }
      // Debounce the actual filtering
      debouncedFilter();
    });
  }
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      if (memberSearch) {
        memberSearch.value = "";
        clearSearchBtn.style.display = "none";
        filterMembers();
      }
    });
  }
  if (statusFilter) {
    statusFilter.addEventListener("change", filterMembers);
  }
  if (prFilter) {
    prFilter.addEventListener("change", filterMembers);
  }
  if (sortFilter) {
    sortFilter.addEventListener("change", filterMembers);
  }
  if (prevPage) {
    prevPage.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        displayMembers();
        updatePagination();
      }
    });
  }
  if (nextPage) {
    nextPage.addEventListener("click", () => {
      const filteredMembers = getFilteredMembers();
      const totalPages = Math.ceil(filteredMembers.length / membersPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        displayMembers();
        updatePagination();
      }
    });
  }
}

/**
 * Load and display members
 * @returns {Promise<void>}
 */
export async function loadMembers() {
  try {
    showLoading();
    currentPage = 1;
    await displayMembers();
    updatePagination();
  } catch (error) {
    handleError(error, { module: 'members', action: 'loadMembers' });
  } finally {
    hideLoading();
  }
}

/**
 * Display members in table with pagination
 * Uses virtual scrolling for better performance with large lists
 * @returns {Promise<void>}
 */
async function displayMembers() {
  if (!membersTableBody) return;

  const filteredMembers = getFilteredMembers();
  const startIndex = (currentPage - 1) * membersPerPage;
  const endIndex = startIndex + membersPerPage;
  const pageMembers = filteredMembers.slice(startIndex, endIndex);

  // Show loading state
  membersTableBody.innerHTML =
    '<tr><td colspan="8" style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading members...</td></tr>';

  // Update members page stats
  updateMembersPageStats(filteredMembers);

  // Load members
  const rows = [];
  for (const member of pageMembers) {
    const row = await createMemberRow(member);
    rows.push(row);
  }

  // Display all at once using document fragment for better performance
  const fragment = document.createDocumentFragment();
  rows.forEach((row) => fragment.appendChild(row));
  membersTableBody.innerHTML = "";
  membersTableBody.appendChild(fragment);
}

/**
 * Update members page summary statistics
 * @param {Array} members - Filtered members array
 */
function updateMembersPageStats(members) {
  let totalRepos = 0;
  let totalStars = 0;
  let totalPRs = 0;
  let totalCommits = 0;

  members.forEach((member) => {
    if (member.githubConnected && member.githubActivity) {
      totalRepos +=
        (member.githubActivity.publicRepos || 0) +
        (member.githubActivity.privateRepos || 0);
      totalStars += member.githubActivity.totalStars || 0;
      totalPRs += member.githubActivity.pullRequests || 0;
      totalCommits += (member.githubActivity.commits !== undefined && member.githubActivity.commits !== null) ? member.githubActivity.commits : 0;
    }
  });

  const totalReposEl = document.getElementById("membersTotalRepos");
  const totalStarsEl = document.getElementById("membersTotalStars");
  const totalPRsEl = document.getElementById("membersTotalPRs");
  const totalCommitsEl = document.getElementById("membersTotalCommits");

  if (totalReposEl) totalReposEl.textContent = formatNumber(totalRepos);
  if (totalStarsEl) totalStarsEl.textContent = formatNumber(totalStars);
  if (totalPRsEl) totalPRsEl.textContent = formatNumber(totalPRs);
  if (totalCommitsEl) totalCommitsEl.textContent = formatNumber(totalCommits);
}

/**
 * Create a table row for a member
 * @param {Object} member - Member object
 * @returns {Promise<HTMLElement>} - Table row element
 */
async function createMemberRow(member) {
  const row = document.createElement("tr");

  const name = getMemberDisplayName(member);

  // Get GitHub info - use cached data first to reduce API calls
  // Only fetch if we don't have basic info in githubActivity
  let githubUsername = "N/A";
  let githubProfileUrl = "#";
  
  if (member.githubConnected && member.githubUsername) {
    // Always use cached data - no API calls
    // Manual refresh will populate all data in Firebase cache
    githubUsername = member.githubUsername;
    githubProfileUrl = `https://github.com/${member.githubUsername}`;
  }

  // Get repository and activity stats
  // Use only stored data from cache (no API calls)
  let publicRepos = member.githubActivity
    ? member.githubActivity.publicRepos || 0
    : 0;
  let privateRepos = member.githubActivity
    ? member.githubActivity.privateRepos || 0
    : 0;
  let totalStars = member.githubActivity
    ? member.githubActivity.totalStars || 0
    : 0;
  let commits =
    member.githubActivity?.commits !== undefined
      ? member.githubActivity.commits || 0
      : 0;
  let prs = member.githubActivity ? member.githubActivity.pullRequests || 0 : 0;
  let mergedPRs = member.githubActivity
    ? member.githubActivity.mergedPRs || 0
    : 0;
  let openPRs = member.githubActivity ? member.githubActivity.openPRs || 0 : 0;

  // If commits are missing (undefined), use 0 as fallback
  // Do NOT fetch on-demand - rely only on cached data from manual refresh
  // This ensures no unnecessary API calls - only manual refresh populates data
  
  // Ensure we have numbers (default to 0 if still undefined)
  commits = commits !== undefined ? commits : 0;

  const totalRepos = publicRepos + privateRepos;

  row.innerHTML = `
        <td>
            <div class="member-info">
                <strong>${name}</strong>
            </div>
        </td>
        <td>
            ${
              member.githubConnected && member.githubUsername
                ? `<a href="${githubProfileUrl}" target="_blank" class="github-link">
                    <i class="fab fa-github"></i> ${githubUsername}
                </a>`
                : '<span class="github-badge github-not-connected">Not Connected</span>'
            }
        </td>
        <td>
            ${
              member.githubConnected
                ? `
                <div class="repo-stats-cell">
                    <span class="repo-count" title="Public: ${publicRepos}, Private: ${privateRepos}">
                        <i class="fas fa-folder"></i> ${totalRepos}
                    </span>
                </div>
            `
                : '<span class="text-muted">-</span>'
            }
        </td>
        <td>
            ${
              member.githubConnected
                ? `
                <span class="star-count">
                    <i class="fas fa-star"></i> ${
                      totalStars > 0 ? formatNumber(totalStars) : "0"
                    }
                </span>
            `
                : '<span class="text-muted">-</span>'
            }
        </td>
        <td>
            ${
              member.githubConnected
                ? `
                <span class="commit-count">
                    <i class="fas fa-code-commit"></i> ${
                      commits > 0 ? formatNumber(commits) : "0"
                    }
                </span>
            `
                : '<span class="text-muted">-</span>'
            }
        </td>
        <td>
            ${
              member.githubConnected
                ? `
                <div class="pr-stats-cell">
                    <span class="pr-count" title="Total PRs: ${prs}, Merged: ${mergedPRs}, Open: ${openPRs}">
                        <i class="fas fa-code-pull-request"></i> ${formatNumber(
                          prs
                        )}
                    </span>
                    ${
                      mergedPRs > 0
                        ? `<span class="pr-merged-badge" title="Merged PRs"><i class="fas fa-check"></i> ${formatNumber(
                            mergedPRs
                          )}</span>`
                        : ""
                    }
                </div>
            `
                : '<span class="text-muted">-</span>'
            }
        </td>
        <td>
            <button class="btn btn-primary" onclick="viewMember('${
              member.id
            }')">
                <i class="fas fa-eye"></i> View
            </button>
        </td>
    `;

  return row;
}

/**
 * Get filtered and sorted members based on current filter settings
 * @returns {Array<Object>} - Filtered and sorted members array
 */
function getFilteredMembers() {
  const members = getMembers();
  let filtered = [...members];

  // Search filter
  if (memberSearch && memberSearch.value) {
    const searchTerm = memberSearch.value.toLowerCase();
    filtered = filtered.filter((member) => {
      const name = getMemberDisplayName(member).toLowerCase();
      const github = (member.githubUsername || "").toLowerCase();
      return name.includes(searchTerm) || github.includes(searchTerm);
    });
  }

  // Status filter
  if (statusFilter && statusFilter.value) {
    filtered = filtered.filter((member) => {
      if (statusFilter.value === "active") return member.githubConnected;
      if (statusFilter.value === "inactive") return !member.githubConnected;
      return true;
    });
  }


  // PR filter
  if (prFilter && prFilter.value) {
    filtered = filtered.filter((member) => {
      const prs = member.githubActivity
        ? member.githubActivity.pullRequests || 0
        : 0;
      if (prFilter.value === "has-prs") return prs > 0;
      if (prFilter.value === "no-prs") return prs === 0;
      if (prFilter.value === "high-prs") return prs >= 10;
      if (prFilter.value === "medium-prs") return prs >= 5 && prs < 10;
      if (prFilter.value === "low-prs") return prs >= 1 && prs < 5;
      return true;
    });
  }


  // Sort filter
  if (sortFilter && sortFilter.value) {
    filtered.sort((a, b) => {
      const aName = getMemberDisplayName(a).toLowerCase();
      const bName = getMemberDisplayName(b).toLowerCase();

      switch (sortFilter.value) {
        case "name-asc":
          return aName.localeCompare(bName);
        case "name-desc":
          return bName.localeCompare(aName);
        case "prs-desc":
          const aPRs = a.githubActivity
            ? a.githubActivity.pullRequests || 0
            : 0;
          const bPRs = b.githubActivity
            ? b.githubActivity.pullRequests || 0
            : 0;
          return bPRs - aPRs;
        case "stars-desc":
          const aStars = a.githubActivity
            ? a.githubActivity.totalStars || 0
            : 0;
          const bStars = b.githubActivity
            ? b.githubActivity.totalStars || 0
            : 0;
          return bStars - aStars;
        case "repos-desc":
          const aRepos = a.githubActivity
            ? (a.githubActivity.publicRepos || 0) +
              (a.githubActivity.privateRepos || 0)
            : 0;
          const bRepos = b.githubActivity
            ? (b.githubActivity.publicRepos || 0) +
              (b.githubActivity.privateRepos || 0)
            : 0;
          return bRepos - aRepos;
        case "joined-desc":
          const aJoined = a.joinedAt ? new Date(a.joinedAt) : new Date(0);
          const bJoined = b.joinedAt ? new Date(b.joinedAt) : new Date(0);
          return bJoined - aJoined;
        default:
          return 0;
      }
    });
  }

  return filtered;
}

/**
 * Filter members and reset to first page
 * Called when filters change (debounced for search input)
 * @returns {void}
 */
function filterMembers() {
  currentPage = 1;
  displayMembers();
  updatePagination();
}

/**
 * Update pagination controls based on current page and filtered members
 * @returns {void}
 */
function updatePagination() {
  if (!prevPage || !nextPage || !pageInfo) return;

  const filteredMembers = getFilteredMembers();
  const totalPages = Math.ceil(filteredMembers.length / membersPerPage) || 1;

  prevPage.disabled = currentPage === 1;
  nextPage.disabled = currentPage >= totalPages;

  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

// Make loadMembers available globally for navigation
window.loadMembersPage = loadMembers;
