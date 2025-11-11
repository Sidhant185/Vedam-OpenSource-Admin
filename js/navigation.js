/**
 * @fileoverview Navigation Module
 * Handles page navigation, UI state management, and keyboard accessibility
 * @module navigation
 */

// DOM elements (will be initialized)
let loginScreen = null;
let dashboard = null;
let loginForm = null;
let loginError = null;
let navItems = null;
let pages = null;
let sidebar = null;

/**
 * Initialize navigation module
 */
export function initializeNavigation() {
    loginScreen = document.getElementById('loginScreen');
    dashboard = document.getElementById('dashboard');
    loginForm = document.getElementById('loginForm');
    loginError = document.getElementById('loginError');
    navItems = document.querySelectorAll('.nav-item');
    pages = document.querySelectorAll('.page');
    sidebar = document.getElementById('sidebar');
    
    setupNavigationListeners();
    initializeSidebar();
}

/**
 * Handle navigation item click/keyboard activation
 * @param {HTMLElement} item - Navigation item element
 * @param {NodeList} navItems - All navigation items
 */
function handleNavItemClick(item, navItems) {
    const page = item.dataset.page;
    if (page) {
        showPage(page);
        
        // Update active nav item
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
    }
}

/**
 * Setup navigation event listeners
 */
function setupNavigationListeners() {
    // Regular navigation items with keyboard support
    if (navItems) {
        navItems.forEach(item => {
            // Click handler
            item.addEventListener('click', () => {
                handleNavItemClick(item, navItems);
            });
            
            // Keyboard handler (Enter and Space)
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleNavItemClick(item, navItems);
                }
            });
        });
    }

    // Dropdown navigation items
    const dropdownItems = document.querySelectorAll('.nav-dropdown-item');
    dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const page = item.dataset.page;
            if (page === 'forms') {
                // Navigate to forms.html page
                window.location.href = 'forms.html';
                return;
            } else if (page) {
                // For other pages in index.html
                // Close dropdown first
                const dropdown = item.closest('.nav-item-dropdown');
                if (dropdown) {
                    dropdown.classList.remove('open');
                    const menu = dropdown.querySelector('.nav-dropdown-menu');
                    const arrow = dropdown.querySelector('.nav-dropdown-arrow');
                    if (menu) {
                        menu.classList.remove('show');
                    }
                    if (arrow) {
                        arrow.style.transform = 'rotate(0deg)';
                    }
                }
                
                showPage(page);
                
                // Update active nav item
                navItems.forEach(nav => nav.classList.remove('active'));
                dropdownItems.forEach(dropItem => dropItem.classList.remove('active'));
                item.classList.add('active');
                
                // Mark parent dropdown as active
                if (dropdown) {
                    dropdown.classList.add('active');
                }
            }
        });
    });

    // Dropdown toggle - only toggle, don't navigate
    const dropdownHeaders = document.querySelectorAll('.nav-item-header');
    dropdownHeaders.forEach(header => {
        header.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const dropdown = header.closest('.nav-item-dropdown');
            if (dropdown) {
                // Simply toggle the open class - CSS will handle all visibility
                dropdown.classList.toggle('open');
            }
        });
    });
}

/**
 * Show login screen
 */
export function showLoginScreen() {
    if (loginScreen) loginScreen.style.display = 'flex';
    if (dashboard) dashboard.style.display = 'none';
    clearLoginForm();
}

/**
 * Show dashboard
 */
export function showDashboard() {
    if (loginScreen) loginScreen.style.display = 'none';
    if (dashboard) dashboard.style.display = 'flex';
}

/**
 * Navigate to specific page
 * @param {string} pageId - Page ID to show
 */
export function showPage(pageId) {
    if (!pages) {
        pages = document.querySelectorAll('.page');
    }
    
    // Hide all pages
    pages.forEach(page => {
        page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(pageId + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
        
        // Load page-specific data
        loadPageData(pageId);
    }
}

/**
 * Load data for specific page
 * @param {string} pageId - Page ID
 */
async function loadPageData(pageId) {
    try {
        switch (pageId) {
            case 'dashboard':
                const { loadDashboard } = await import('./dashboard.js');
                loadDashboard();
                break;
            case 'members':
                const { initializeMembersPage, loadMembers } = await import('./members.js');
                // Initialize members page if not already done
                if (window.membersPageInitialized !== true) {
                    initializeMembersPage();
                    window.membersPageInitialized = true;
                }
                loadMembers();
                break;
            case 'analytics':
                const { loadAnalytics } = await import('./analytics.js');
                loadAnalytics();
                break;
            case 'settings':
                const { loadSettings } = await import('./settings.js');
                loadSettings();
                break;
            case 'forms':
                // Navigate to forms.html
                window.location.href = 'forms.html';
                break;
        }
    } catch (error) {
        const { handleError } = await import('./utils.js');
        handleError(error, { module: 'navigation', action: 'loadPageData', pageId });
    }
}

/**
 * Show error message on login screen
 * @param {string} message - Error message
 */
export function showLoginError(message) {
    if (loginError) {
        loginError.textContent = message;
        loginError.style.display = 'block';
        setTimeout(() => {
            if (loginError) loginError.style.display = 'none';
        }, 5000);
    }
}

/**
 * Clear login form
 */
export function clearLoginForm() {
    if (loginForm) loginForm.reset();
    if (loginError) loginError.style.display = 'none';
}

/**
 * Toggle sidebar
 * Works on all screen sizes - sidebar is hidden by default
 */
export function toggleSidebar() {
    if (sidebar && dashboard) {
        const isOpen = sidebar.classList.contains('open');
        sidebar.classList.toggle('open');
        
        // Update ARIA attributes
        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            toggleBtn.setAttribute('aria-expanded', !isOpen);
        }
        
        // Add/remove class to dashboard for CSS targeting (all screen sizes)
        if (!isOpen) {
            dashboard.classList.add('sidebar-open');
        } else {
            dashboard.classList.remove('sidebar-open');
        }
    }
}

/**
 * Initialize sidebar state
 * Sidebar is hidden by default on all screen sizes
 */
export function initializeSidebar() {
    if (sidebar) {
        // Sidebar starts hidden - user must click toggle to show it
        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            toggleBtn.setAttribute('aria-expanded', 'false');
        }
    }
}

