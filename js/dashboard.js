/**
 * @fileoverview Dashboard Page Module
 * Handles dashboard display, statistics, and charts
 * @module dashboard
 */

// Dashboard Page Module
import { getMembers } from "./data-store.js";
import {
  getLastNDays,
  formatNumber,
  showLoading,
  hideLoading,
  handleError,
} from "./utils.js";
import { calculateDashboardStats, getTopCommitters } from "./services/stats-service.js";


const dashboardDateRange = 30; // Fixed to 30 days

/**
 * Load dashboard data and render charts
 * Fetches members data and displays statistics and visualizations
 * @returns {Promise<void>}
 */
export async function loadDashboard() {
  try {
    showLoading();

    const members = getMembers();
    updateDashboardStats(members);
    loadDashboardCharts(members);
    loadTopCommitters(members);
  } catch (error) {
    handleError(error, { module: 'dashboard', action: 'loadDashboard' });
  } finally {
    hideLoading();
  }
}

/**
 * Update dashboard statistics
 * Uses centralized stats service for consistent calculations
 * @param {Array} members - Array of member objects
 */
function updateDashboardStats(members) {
  try {
    // Use centralized stats calculation
    const stats = calculateDashboardStats(members);

    // Update stat elements
    const totalMembersEl = document.getElementById("totalMembers");
    const dashboardTotalReposEl = document.getElementById("dashboardTotalRepos");
    const dashboardTotalStarsEl = document.getElementById("dashboardTotalStars");
    const dashboardTotalPRsEl = document.getElementById("dashboardTotalPRs");
    const dashboardTotalCommitsEl = document.getElementById(
      "dashboardTotalCommits"
    );

    if (totalMembersEl) totalMembersEl.textContent = formatNumber(stats.totalMembers);
    if (dashboardTotalReposEl)
      dashboardTotalReposEl.textContent = formatNumber(stats.totalRepos);
    if (dashboardTotalStarsEl)
      dashboardTotalStarsEl.textContent = formatNumber(stats.totalStars);
    if (dashboardTotalPRsEl)
      dashboardTotalPRsEl.textContent = formatNumber(stats.totalPRs);
    if (dashboardTotalCommitsEl)
      dashboardTotalCommitsEl.textContent = formatNumber(stats.totalCommits);
  } catch (error) {
    handleError(error, { module: 'dashboard', action: 'updateDashboardStats' });
  }
}

/**
 * Load and render dashboard charts
 * Creates PR trends chart using Chart.js
 * @param {Array<Object>} members - Array of member objects
 * @returns {void}
 */
function loadDashboardCharts(members) {
  // PR Trends Chart
  const prTrendsCtx = document.getElementById("prTrendsChart");
  if (prTrendsCtx) {
    const prTrendsData = getPRTrendsData(members, dashboardDateRange);
    const labels = getLastNDays(dashboardDateRange);
    new Chart(prTrendsCtx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Pull Requests",
            data: prTrendsData,
            borderColor: "#ef4444",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
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
            mode: "index",
            intersect: false,
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
  }

}

/**
 * Get PR trends data for the last N days
 * Uses recentPRs timestamps if available, otherwise distributes evenly
 * @param {Array<Object>} members - Array of member objects
 * @param {number} days - Number of days (default: 30)
 * @returns {Array<number>} - Array of PR counts per day
 */
function getPRTrendsData(members, days = 30) {
  // Prefer recentPRs timestamps if available; else even distribution fallback
  const labels = getLastNDays(days);
  const dayStarts = labels.map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  });
  const buckets = new Array(days).fill(0);
  let hasTimestamps = false;
  members.forEach((m) => {
    const recent = m.githubActivity?.recentPRs || [];
    if (recent.length) hasTimestamps = true;
    recent.forEach((pr) => {
      const created = new Date(pr.created_at);
      for (let i = 0; i < dayStarts.length; i++) {
        const start = dayStarts[i];
        const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        if (created >= start && created < end) {
          buckets[i]++;
          break;
        }
      }
    });
  });
  if (hasTimestamps) return buckets;
  // fallback
  const totalPRs = members.reduce(
    (sum, m) => sum + (m.githubActivity?.pullRequests || 0),
    0
  );
  const base = Math.floor(totalPRs / days);
  let rem = totalPRs - base * days;
  for (let i = 0; i < days; i++) {
    buckets[i] = base + (rem > 0 ? 1 : 0);
    if (rem > 0) rem--;
  }
  return buckets;
}

// getTopCommitters is now imported from stats-service.js

/**
 * Load top committers list
 * @param {Array} members - Array of member objects
 */
function loadTopCommitters(members) {
  const committers = getTopCommitters(members, 10);
  const committersList = document.getElementById("dashboardTopCommitters");

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
