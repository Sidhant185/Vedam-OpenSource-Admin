/**
 * Virtual Scrolling Utility
 * Efficiently renders large lists by only rendering visible items
 */

/**
 * Virtual Scroll Manager
 * @class
 */
export class VirtualScrollManager {
    /**
     * @param {HTMLElement} container - Container element for the list
     * @param {Object} options - Configuration options
     * @param {number} options.itemHeight - Height of each item in pixels (default: 50)
     * @param {number} options.overscan - Number of items to render outside viewport (default: 5)
     * @param {Function} options.renderItem - Function to render each item
     * @param {Function} options.getItemKey - Function to get unique key for each item (optional)
     */
    constructor(container, options = {}) {
        this.container = container;
        this.itemHeight = options.itemHeight || 50;
        this.overscan = options.overscan || 5;
        this.renderItem = options.renderItem;
        this.getItemKey = options.getItemKey || ((item, index) => index);
        
        this.items = [];
        this.scrollTop = 0;
        this.containerHeight = 0;
        this.visibleStart = 0;
        this.visibleEnd = 0;
        this.renderedItems = new Map();
        
        // Create wrapper for items
        this.wrapper = document.createElement('div');
        this.wrapper.style.position = 'relative';
        this.wrapper.style.height = '100%';
        this.wrapper.style.overflow = 'auto';
        
        // Create spacer for items before visible range
        this.topSpacer = document.createElement('div');
        this.topSpacer.style.height = '0px';
        
        // Create container for visible items
        this.itemsContainer = document.createElement('div');
        this.itemsContainer.style.position = 'relative';
        
        // Create spacer for items after visible range
        this.bottomSpacer = document.createElement('div');
        this.bottomSpacer.style.height = '0px';
        
        this.wrapper.appendChild(this.topSpacer);
        this.wrapper.appendChild(this.itemsContainer);
        this.wrapper.appendChild(this.bottomSpacer);
        
        // Replace container content with wrapper
        this.container.innerHTML = '';
        this.container.appendChild(this.wrapper);
        
        // Setup scroll listener
        this.wrapper.addEventListener('scroll', this.handleScroll.bind(this));
        
        // Setup resize observer
        this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
        this.resizeObserver.observe(this.wrapper);
        
        // Initial calculation
        this.update();
    }

    /**
     * Set items to render
     * @param {Array} items - Array of items to render
     */
    setItems(items) {
        this.items = items || [];
        this.update();
    }

    /**
     * Handle scroll event
     */
    handleScroll() {
        this.scrollTop = this.wrapper.scrollTop;
        this.update();
    }

    /**
     * Handle resize event
     */
    handleResize() {
        this.containerHeight = this.wrapper.clientHeight;
        this.update();
    }

    /**
     * Calculate visible range and update DOM
     */
    update() {
        if (!this.items.length) {
            this.itemsContainer.innerHTML = '';
            this.topSpacer.style.height = '0px';
            this.bottomSpacer.style.height = '0px';
            return;
        }

        // Calculate container height if not set
        if (!this.containerHeight) {
            this.containerHeight = this.wrapper.clientHeight || this.container.clientHeight;
        }

        // Calculate visible range
        const totalHeight = this.items.length * this.itemHeight;
        const startIndex = Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - this.overscan);
        const endIndex = Math.min(
            this.items.length - 1,
            Math.ceil((this.scrollTop + this.containerHeight) / this.itemHeight) + this.overscan
        );

        this.visibleStart = startIndex;
        this.visibleEnd = endIndex;

        // Update spacers
        const topSpacerHeight = startIndex * this.itemHeight;
        const bottomSpacerHeight = (this.items.length - endIndex - 1) * this.itemHeight;
        
        this.topSpacer.style.height = `${topSpacerHeight}px`;
        this.bottomSpacer.style.height = `${bottomSpacerHeight}px`;

        // Render visible items
        this.renderVisibleItems();
    }

    /**
     * Render visible items
     */
    renderVisibleItems() {
        const visibleItems = this.items.slice(this.visibleStart, this.visibleEnd + 1);
        const fragment = document.createDocumentFragment();
        
        // Clear existing items
        this.itemsContainer.innerHTML = '';
        
        // Render each visible item
        visibleItems.forEach((item, index) => {
            const actualIndex = this.visibleStart + index;
            const element = this.renderItem(item, actualIndex);
            
            if (element) {
                element.style.position = 'absolute';
                element.style.top = `${actualIndex * this.itemHeight}px`;
                element.style.width = '100%';
                element.style.height = `${this.itemHeight}px`;
                
                // Set data attribute for key
                const key = this.getItemKey(item, actualIndex);
                element.setAttribute('data-virtual-key', key);
                
                fragment.appendChild(element);
            }
        });
        
        this.itemsContainer.appendChild(fragment);
    }

    /**
     * Scroll to specific item
     * @param {number} index - Index of item to scroll to
     * @param {string} align - Alignment: 'start', 'center', 'end' (default: 'start')
     */
    scrollToIndex(index, align = 'start') {
        if (index < 0 || index >= this.items.length) return;
        
        let scrollTop;
        switch (align) {
            case 'center':
                scrollTop = index * this.itemHeight - (this.containerHeight / 2) + (this.itemHeight / 2);
                break;
            case 'end':
                scrollTop = index * this.itemHeight - this.containerHeight + this.itemHeight;
                break;
            default: // 'start'
                scrollTop = index * this.itemHeight;
        }
        
        this.wrapper.scrollTop = Math.max(0, scrollTop);
    }

    /**
     * Get scroll position
     * @returns {number} - Current scroll position
     */
    getScrollTop() {
        return this.wrapper.scrollTop;
    }

    /**
     * Set scroll position
     * @param {number} scrollTop - Scroll position
     */
    setScrollTop(scrollTop) {
        this.wrapper.scrollTop = scrollTop;
    }

    /**
     * Destroy virtual scroll manager
     */
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        this.wrapper.removeEventListener('scroll', this.handleScroll);
        this.container.innerHTML = '';
    }
}

