/**
 * Loading State Management Service
 * Provides centralized loading state management with progress tracking
 */

class LoadingService {
    constructor() {
        this.loadingStates = new Map();
        this.progressCallbacks = new Map();
    }

    /**
     * Set loading state for a specific operation
     * @param {string} operationId - Unique identifier for the operation
     * @param {boolean} isLoading - Loading state
     * @param {Object} options - Additional options
     * @param {string} options.message - Loading message
     * @param {number} options.progress - Progress percentage (0-100)
     */
    setLoading(operationId, isLoading, options = {}) {
        const { message = '', progress = null } = options;
        
        if (isLoading) {
            this.loadingStates.set(operationId, {
                isLoading: true,
                message,
                progress,
                startTime: Date.now()
            });
        } else {
            this.loadingStates.delete(operationId);
        }
        
        this.updateUI();
    }

    /**
     * Update progress for an operation
     * @param {string} operationId - Operation identifier
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} message - Optional progress message
     */
    updateProgress(operationId, progress, message = '') {
        const state = this.loadingStates.get(operationId);
        if (state) {
            state.progress = progress;
            if (message) {
                state.message = message;
            }
            this.updateUI();
        }
    }

    /**
     * Get loading state for an operation
     * @param {string} operationId - Operation identifier
     * @returns {Object|null} - Loading state or null
     */
    getLoadingState(operationId) {
        return this.loadingStates.get(operationId) || null;
    }

    /**
     * Check if any operation is loading
     * @returns {boolean} - True if any operation is loading
     */
    isAnyLoading() {
        return this.loadingStates.size > 0;
    }

    /**
     * Update UI based on loading states
     */
    updateUI() {
        const globalOverlay = document.getElementById('loadingOverlay');
        const progressBar = document.getElementById('refreshProgressBar');
        const progressText = document.getElementById('refreshProgressText');
        const progressWrap = document.getElementById('refreshProgressWrap');

        if (this.loadingStates.size > 0) {
            // Show global overlay if any operation is loading
            if (globalOverlay) {
                globalOverlay.classList.add('active');
            }

            // Update progress UI if available
            const githubRefreshState = this.loadingStates.get('github-refresh');
            if (githubRefreshState && progressWrap) {
                progressWrap.style.display = 'block';
                if (progressBar && githubRefreshState.progress !== null) {
                    progressBar.style.width = `${githubRefreshState.progress}%`;
                }
                if (progressText && githubRefreshState.message) {
                    progressText.textContent = githubRefreshState.message;
                }
            }
        } else {
            // Hide global overlay if no operations are loading
            if (globalOverlay) {
                globalOverlay.classList.remove('active');
            }
            if (progressWrap) {
                progressWrap.style.display = 'none';
            }
        }
    }

    /**
     * Clear all loading states
     */
    clearAll() {
        this.loadingStates.clear();
        this.updateUI();
    }
}

// Create singleton instance
const loadingService = new LoadingService();

/**
 * Set loading state for an operation
 * @param {string} operationId - Unique identifier for the operation
 * @param {boolean} isLoading - Loading state
 * @param {Object} options - Additional options
 * @returns {void}
 */
export function setLoadingState(operationId, isLoading, options = {}) {
    loadingService.setLoading(operationId, isLoading, options);
}

/**
 * Update progress for an operation
 * @param {string} operationId - Operation identifier
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} message - Optional progress message
 * @returns {void}
 */
export function updateLoadingProgress(operationId, progress, message = '') {
    loadingService.updateProgress(operationId, progress, message);
}

/**
 * Get loading state for an operation
 * @param {string} operationId - Operation identifier
 * @returns {Object|null} - Loading state or null
 */
export function getLoadingState(operationId) {
    return loadingService.getLoadingState(operationId);
}

/**
 * Check if any operation is loading
 * @returns {boolean} - True if any operation is loading
 */
export function isAnyLoading() {
    return loadingService.isAnyLoading();
}

/**
 * Clear all loading states
 * @returns {void}
 */
export function clearAllLoadingStates() {
    loadingService.clearAll();
}

