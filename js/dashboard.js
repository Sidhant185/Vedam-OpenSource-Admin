// Dashboard Page Module
import { getMembers } from "./data-store.js";
import {
  getLastNDays,
  formatNumber,
  showLoading,
  hideLoading,
} from "./utils.js";


const dashboardDateRange = 30; // Fixed to 30 days

/**
 * Load dashboard data and render charts
 */
export async function loadDashboard() {
  try {
    showLoading();

    const members = getMembers();
    updateDashboardStats(members);
    loadDashboardCharts(members);
    loadTopCommitters(members);
  } catch (error) {
    console.error("Error loading dashboard:", error);
  } finally {
    hideLoading();
  }
}

/**
 * Update dashboard statistics
 * @param {Array} members - Array of member objects
 */
function updateDashboardStats(members) {
  const total = members.length;

  // Calculate GitHub activity stats
  let totalRepos = 0;
  let totalStars = 0;
  let totalPRs = 0;
  let totalCommits = 0;

  members.forEach((member) => {
    if (member.githubActivity) {
      totalRepos +=
        (member.githubActivity.publicRepos || 0) +
        (member.githubActivity.privateRepos || 0);
      totalStars += member.githubActivity.totalStars || 0;
      totalPRs += member.githubActivity.pullRequests || 0;
      totalCommits +=
        member.githubActivity.commits !== undefined &&
        member.githubActivity.commits !== null
          ? member.githubActivity.commits
          : 0;
    }
  });

  // Update stat elements
  const totalMembersEl = document.getElementById("totalMembers");
  const dashboardTotalReposEl = document.getElementById("dashboardTotalRepos");
  const dashboardTotalStarsEl = document.getElementById("dashboardTotalStars");
  const dashboardTotalPRsEl = document.getElementById("dashboardTotalPRs");
  const dashboardTotalCommitsEl = document.getElementById(
    "dashboardTotalCommits"
  );

  if (totalMembersEl) totalMembersEl.textContent = formatNumber(total);
  if (dashboardTotalReposEl)
    dashboardTotalReposEl.textContent = formatNumber(totalRepos);
  if (dashboardTotalStarsEl)
    dashboardTotalStarsEl.textContent = formatNumber(totalStars);
  if (dashboardTotalPRsEl)
    dashboardTotalPRsEl.textContent = formatNumber(totalPRs);
  if (dashboardTotalCommitsEl)
    dashboardTotalCommitsEl.textContent = formatNumber(totalCommits);
}

/**
 * Load dashboard charts
 * @param {Array} members - Array of member objects
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
 * @param {Array} members - Array of member objects
 * @param {number} days - Number of days (default: 30)
 * @returns {Array} - Array of PR counts per day
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

/**
 * Get top committers by commits
 * @param {Array} members - Array of member objects
 * @returns {Array} - Top committers array
 */
function getTopCommitters(members) {
  return members
    .filter(
      (member) =>
        member.githubActivity &&
        member.githubActivity.commits !== undefined &&
        member.githubActivity.commits !== null
    )
    .map((member) => ({
      name:
        member.displayName ||
        `${member.firstName || ""} ${member.lastName || ""}`.trim() ||
        "Unknown",
      commits: member.githubActivity.commits || 0,
    }))
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 10);
}

/**
 * Load top committers list
 * @param {Array} members - Array of member objects
 */
function loadTopCommitters(members) {
  const committers = getTopCommitters(members);
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
