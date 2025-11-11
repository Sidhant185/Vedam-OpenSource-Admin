/**
 * @fileoverview Analytics Page Module
 * Handles analytics display, charts, and data visualization
 * @module analytics
 */

// Analytics Page Module
import { getMembers } from "./data-store.js";
import { formatNumber, showLoading, hideLoading, handleError } from "./utils.js";
import { fetchGitHubUserInfo } from "./github-api.js";
import { 
  calculateAnalyticsStats, 
  calculateRepositoryStats, 
  getTopCommitters, 
  getTopPRCreators 
} from "./services/stats-service.js";

let repoChart = null;
let languageChart = null;
let activityChart = null;

/**
 * Load analytics data and render charts
 */
export async function loadAnalytics() {
  try {
    showLoading();

    const members = getMembers();

    await loadAnalyticsCharts(members);
    loadTopCommitters(members);
    loadTopPRCreators(members);
    updateActivityStats(members);
    loadPRActivityChart(members);
    loadLanguageStatistics(members);
  } catch (error) {
    handleError(error, { module: 'analytics', action: 'loadAnalytics' });
  } finally {
    hideLoading();
  }
}

/**
 * Load all analytics charts
 * @param {Array} members - Array of member objects
 */
async function loadAnalyticsCharts(members) {
  // Check if Chart.js is available
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded. Please ensure Chart.js is included in the page.');
    return;
  }

  // Repository statistics chart
  const repoCtx = document.getElementById("repoChart");
  if (!repoCtx) {
    console.warn('Repository chart container not found');
  } else {
    try {
      if (repoChart) {
        repoChart.destroy();
        repoChart = null;
      }

      // Use centralized repository stats calculation
      const repoData = calculateRepositoryStats(members);
      
      // Validate data
      const chartData = [
        repoData.public || 0,
        repoData.private || 0,
        repoData.stars || 0,
        repoData.forks || 0,
        repoData.prs || 0,
        repoData.commits || 0,
      ];

      repoChart = new Chart(repoCtx, {
      type: "bar",
      data: {
        labels: [
          "Public Repos",
          "Private Repos",
          "Total Stars",
          "Total Forks",
          "Pull Requests",
          "Commits",
        ],
        datasets: [
          {
            label: "Count",
            data: chartData,
            backgroundColor: [
              "#667eea",
              "#764ba2",
              "#10b981",
              "#f59e0b",
              "#ef4444",
              "#06b6d4",
            ],
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.label}: ${formatNumber(context.parsed.y)}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              callback: function (value) {
                return formatNumber(value);
              },
            },
          },
        },
      },
    });
    } catch (error) {
      console.error('Error creating repository chart:', error);
      handleError(error, { module: 'analytics', action: 'loadAnalyticsCharts', chart: 'repoChart' });
    }
  }

  // Language distribution chart
  const languageCtx = document.getElementById("languageChart");
  if (!languageCtx) {
    console.warn('Language chart container not found');
  } else {
    try {
      if (languageChart) {
        languageChart.destroy();
        languageChart = null;
      }

      const languageData = getLanguageData(members);

      // Validate language data
      if (!languageData || !languageData.labels || !languageData.data || 
          languageData.labels.length === 0 || languageData.data.length === 0) {
        console.warn('No language data available for chart');
        return;
      }

      languageChart = new Chart(languageCtx, {
      type: "pie",
      data: {
        labels:
          languageData.labels.length > 0 ? languageData.labels : ["No Data"],
        datasets: [
          {
            data: languageData.data.length > 0 ? languageData.data : [1],
            backgroundColor: [
              "#667eea",
              "#764ba2",
              "#10b981",
              "#f59e0b",
              "#ef4444",
              "#8b5cf6",
              "#06b6d4",
              "#84cc16",
              "#f97316",
              "#ec4899",
            ],
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 15,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage =
                  total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${label}: ${formatNumber(value)} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
    } catch (error) {
      console.error('Error creating language chart:', error);
      handleError(error, { module: 'analytics', action: 'loadAnalyticsCharts', chart: 'languageChart' });
    }
  }
}

/**
 * Load top committers list
 * @param {Array} members - Array of member objects
 */
function loadTopCommitters(members) {
  const committers = getTopCommitters(members, 10);
  const committersList = document.getElementById("topCommitters");

  if (!committersList) return;

  committersList.innerHTML = "";

  if (committers.length === 0) {
    committersList.innerHTML =
      '<p style="text-align: center; color: #64748b; padding: 20px;">No committer data available</p>';
    return;
  }

  committers.forEach((committer, index) => {
    const committerEl = document.createElement("div");
    committerEl.className = "contributor-item";
    committerEl.innerHTML = `
            <div class="contributor-rank">#${index + 1}</div>
            <div class="contributor-avatar" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                ${committer.name.charAt(0).toUpperCase()}
            </div>
            <div class="contributor-info">
                <div class="contributor-name">${committer.name}</div>
                <div class="contributor-stats">
                    <span><i class="fas fa-code-commit"></i> ${formatNumber(
                      committer.commits
                    )} commits</span>
                </div>
            </div>
        `;
    committersList.appendChild(committerEl);
  });
}

/**
 * Load top PR creators list
 * @param {Array} members - Array of member objects
 */
function loadTopPRCreators(members) {
  const prCreators = getTopPRCreators(members, 10);
  const prCreatorsList = document.getElementById("topPRCreators");

  if (!prCreatorsList) return;

  prCreatorsList.innerHTML = "";

  if (prCreators.length === 0) {
    prCreatorsList.innerHTML =
      '<p style="text-align: center; color: #64748b; padding: 20px;">No PR data available</p>';
    return;
  }

  prCreators.forEach((creator, index) => {
    const creatorEl = document.createElement("div");
    creatorEl.className = "contributor-item";
    creatorEl.innerHTML = `
            <div class="contributor-rank">#${index + 1}</div>
            <div class="contributor-avatar" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                ${creator.name.charAt(0).toUpperCase()}
            </div>
            <div class="contributor-info">
                <div class="contributor-name">${creator.name}</div>
                <div class="contributor-stats">
                    <span><i class="fas fa-code-pull-request"></i> ${formatNumber(
                      creator.prs
                    )} pull requests</span>
                    ${
                      creator.merged
                        ? `<span><i class="fas fa-check"></i> ${formatNumber(
                            creator.merged
                          )} merged</span>`
                        : ""
                    }
                </div>
            </div>
        `;
    prCreatorsList.appendChild(creatorEl);
  });
}

/**
 * Update activity statistics
 * Uses centralized stats service for consistent calculations
 * @param {Array} members - Array of member objects
 */
function updateActivityStats(members) {
  try {
    // Use centralized stats calculation
    const stats = calculateAnalyticsStats(members);

    const totalReposEl = document.getElementById("totalRepos");
    const totalStarsEl = document.getElementById("totalStars");
    const avgReposEl = document.getElementById("avgRepos");
    const totalPRsEl = document.getElementById("totalPRs");
    const totalCommitsEl = document.getElementById("totalCommits");
    const totalIssuesEl = document.getElementById("totalIssues");
    const avgStarsEl = document.getElementById("avgStars");

    if (totalReposEl) totalReposEl.textContent = formatNumber(stats.totalRepos);
    if (totalStarsEl) totalStarsEl.textContent = formatNumber(stats.totalStars);
    if (avgReposEl) avgReposEl.textContent = formatNumber(stats.avgRepos);
    if (totalPRsEl) totalPRsEl.textContent = formatNumber(stats.totalPRs);
    if (totalCommitsEl)
      totalCommitsEl.textContent = formatNumber(stats.totalCommits);
    if (totalIssuesEl)
      totalIssuesEl.textContent = formatNumber(stats.totalIssues);
    if (avgStarsEl) avgStarsEl.textContent = formatNumber(stats.avgStars);
  } catch (error) {
    handleError(error, { module: 'analytics', action: 'updateActivityStats' });
  }
}

// getRepositoryData is now replaced by calculateRepositoryStats from stats-service.js

/**
 * Get language distribution data
 * @param {Array} members - Array of member objects
 * @returns {Object} - Language data with labels and values
 */
function getLanguageData(members) {
  const languageCounts = {};
  let hasLanguageData = false;

  members.forEach((member) => {
    if (member.githubActivity && member.githubActivity.languages) {
      hasLanguageData = true;
      const languages = member.githubActivity.languages;

      // Handle both object and array formats
      if (typeof languages === "object" && !Array.isArray(languages)) {
        Object.entries(languages).forEach(([lang, count]) => {
          const langName = String(lang).trim();
          const langCount = Number(count) || 0;
          // Filter out Unknown, null, empty strings
          if (
            langName &&
            langCount > 0 &&
            langName !== "Unknown" &&
            langName !== "null"
          ) {
            languageCounts[langName] =
              (languageCounts[langName] || 0) + langCount;
          }
        });
      } else if (Array.isArray(languages)) {
        languages.forEach((lang) => {
          if (typeof lang === "string") {
            const langName = lang.trim();
            if (langName && langName !== "Unknown") {
              languageCounts[langName] = (languageCounts[langName] || 0) + 1;
            }
          } else if (lang && lang.name) {
            const langName = String(lang.name).trim();
            const langCount = Number(lang.count || lang.value || 1) || 1;
            if (langName && langName !== "Unknown" && langCount > 0) {
              languageCounts[langName] =
                (languageCounts[langName] || 0) + langCount;
            }
          }
        });
      }
    }
  });

  // If no language data, try to infer from common patterns or return default
  if (!hasLanguageData || Object.keys(languageCounts).length === 0) {
    // Return empty data - will be handled by chart
    return {
      labels: ["No Language Data"],
      data: [1],
      isBytes: false,
    };
  }

  const sortedLanguages = Object.entries(languageCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15) // Show top 15 languages
    .filter(
      ([lang]) => lang && lang.trim() !== "" && lang.trim() !== "Unknown"
    );

  if (sortedLanguages.length === 0) {
    return {
      labels: ["No Language Data"],
      data: [1],
      isBytes: false,
    };
  }

  // Check if data is in bytes (large numbers) or repo count (small numbers)
  const maxValue = Math.max(...sortedLanguages.map(([, count]) => count));
  const isBytes = maxValue > 10000; // If max value > 10KB, assume it's bytes

  return {
    labels: sortedLanguages.map(([lang]) => lang),
    data: sortedLanguages.map(([, count]) => count),
    isBytes: isBytes,
  };
}

/**
 * Get top contributors
 * @param {Array} members - Array of member objects
 * @returns {Array} - Top contributors array
 */
function getTopContributors(members) {
  return members
    .filter(
      (member) =>
        member.githubActivity &&
        member.githubActivity.contributions !== undefined &&
        member.githubActivity.contributions !== null
    )
    .map((member) => ({
      name:
        member.displayName ||
        `${member.firstName || ""} ${member.lastName || ""}`.trim() ||
        "Unknown",
      contributions: member.githubActivity.contributions || 0,
      repos:
        (member.githubActivity.publicRepos || 0) +
        (member.githubActivity.privateRepos || 0),
    }))
    .sort((a, b) => b.contributions - a.contributions)
    .slice(0, 10);
}

// getTopCommitters is now imported from stats-service.js

// getTopPRCreators is now imported from stats-service.js

// getActivityStats is now replaced by calculateAnalyticsStats from stats-service.js

/**
 * Load PR Activity Chart
 * @param {Array} members - Array of member objects
 */
function loadPRActivityChart(members) {
  const prCtx = document.getElementById("prActivityChart");
  if (!prCtx) {
    console.warn('PR Activity chart container not found');
    return;
  }

  // Check if Chart.js is available
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded. Please ensure Chart.js is included in the page.');
    return;
  }

  try {
    // Destroy existing chart if it exists
    if (window.prActivityChartInstance) {
      window.prActivityChartInstance.destroy();
      window.prActivityChartInstance = null;
    }

    const prData = getPRActivityData(members);

    // Validate data
    const chartData = [
      prData.total || 0,
      prData.open || 0,
      prData.merged || 0,
      prData.closed || 0,
    ];

    window.prActivityChartInstance = new Chart(prCtx, {
    type: "bar",
    data: {
      labels: ["Total PRs", "Open PRs", "Merged PRs", "Closed PRs"],
      datasets: [
        {
          label: "Pull Requests",
          data: chartData,
          backgroundColor: ["#667eea", "#10b981", "#059669", "#ef4444"],
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
        },
      },
    },
  });
  } catch (error) {
    console.error('Error creating PR Activity chart:', error);
    handleError(error, { module: 'analytics', action: 'loadPRActivityChart' });
  }
}

/**
 * Get PR Activity Data
 * @param {Array} members - Array of member objects
 * @returns {Object} - PR statistics
 */
function getPRActivityData(members) {
  let total = 0;
  let open = 0;
  let merged = 0;
  let closed = 0;

  members.forEach((member) => {
    if (member.githubActivity) {
      total += member.githubActivity.pullRequests || 0;
      open += member.githubActivity.openPRs || 0;
      merged += member.githubActivity.mergedPRs || 0;
      closed += member.githubActivity.closedPRs || 0;
    }
  });

  return { total, open, merged, closed };
}

/**
 * Load Language Statistics
 * @param {Array} members - Array of member objects
 */
function loadLanguageStatistics(members) {
  const languageStatsContainer = document.getElementById("languageStats");
  if (!languageStatsContainer) return;

  const languageData = getLanguageData(members);

  if (
    languageData.labels.length === 0 ||
    languageData.labels[0] === "No Language Data"
  ) {
    languageStatsContainer.innerHTML =
      '<p style="text-align: center; color: #64748b; padding: 20px;">No language data available</p>';
    return;
  }

  const total = languageData.data.reduce((a, b) => a + b, 0);
  const isBytes = languageData.isBytes || false;

  let html = '<div class="language-stats-list">';

  languageData.labels.forEach((lang, index) => {
    const count = languageData.data[index];
    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;

    // Format count display
    let countDisplay = "";
    if (isBytes) {
      // Convert bytes to readable format (KB, MB, GB)
      if (count >= 1024 * 1024 * 1024) {
        countDisplay = `${(count / (1024 * 1024 * 1024)).toFixed(2)} GB`;
      } else if (count >= 1024 * 1024) {
        countDisplay = `${(count / (1024 * 1024)).toFixed(2)} MB`;
      } else if (count >= 1024) {
        countDisplay = `${(count / 1024).toFixed(2)} KB`;
      } else {
        countDisplay = `${count} bytes`;
      }
    } else {
      countDisplay = `${formatNumber(count)} repos`;
    }

    html += `
            <div class="language-stat-item">
                <div class="language-stat-header">
                    <span class="language-name">${lang}</span>
                    <span class="language-percentage">${percentage}%</span>
                </div>
                <div class="language-stat-bar">
                    <div class="language-stat-bar-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="language-stat-count">${countDisplay}</div>
            </div>
        `;
  });

  html += "</div>";
  languageStatsContainer.innerHTML = html;
}

