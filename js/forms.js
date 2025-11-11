// Forms List Page Module
import { db, collection, getDocs, doc, deleteDoc, setDoc, updateDoc, query, where, orderBy, Timestamp } from '../firebase-config.js';
import { showLoading, hideLoading, formatNumber, showToast, debounce, handleError } from './utils.js';
import { getCurrentUser } from './auth.js';

let formsList = [];
let currentView = localStorage.getItem('formsView') || 'grid'; // 'grid' or 'list'
let selectedForms = new Set();
let submissionCounts = {}; // Cache for submission counts

/**
 * Initialize forms page
 */
export function initializeFormsPage() {
    setupEventListeners();
    loadForms();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    const createFormBtn = document.getElementById('createFormBtn');
    if (createFormBtn) {
        createFormBtn.addEventListener('click', () => {
            openFormBuilder();
        });
    }

    // View toggle
    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    if (gridViewBtn && listViewBtn) {
        gridViewBtn.addEventListener('click', () => switchView('grid'));
        listViewBtn.addEventListener('click', () => switchView('list'));
        updateViewToggle();
    }

    // Clear filters button
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearAllFilters);
    }

    const formSearch = document.getElementById('formSearch');
    const clearFormSearch = document.getElementById('clearFormSearch');
    
    if (formSearch) {
        // Debounce search input to avoid excessive filtering
        const debouncedFilter = debounce(() => {
            filterForms();
            updateFilterIndicators();
            if (clearFormSearch) {
                clearFormSearch.style.display = formSearch.value ? 'flex' : 'none';
            }
        }, 300);
        
        formSearch.addEventListener('input', () => {
            // Show clear button immediately
            if (clearFormSearch) {
                clearFormSearch.style.display = formSearch.value ? 'flex' : 'none';
            }
            // Debounce the actual filtering
            debouncedFilter();
        });
    }

    if (clearFormSearch) {
        clearFormSearch.addEventListener('click', () => {
            if (formSearch) {
                formSearch.value = '';
                clearFormSearch.style.display = 'none';
                filterForms();
                updateFilterIndicators();
            }
        });
    }

    const statusFilter = document.getElementById('statusFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');

    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            filterForms();
            updateFilterIndicators();
        });
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            filterForms();
            updateFilterIndicators();
        });
    }
    if (sortFilter) {
        sortFilter.addEventListener('change', filterForms);
    }

    // Click outside to close quick actions menus
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.form-card-actions-menu')) {
            document.querySelectorAll('.quick-actions-dropdown.show').forEach(dropdown => {
                dropdown.classList.remove('show');
            });
        }
    });
}

/**
 * Load forms from Firestore
 */
export async function loadForms() {
    try {
        showLoading();
        const formsRef = collection(db, 'forms');
        const formsSnapshot = await getDocs(formsRef);
        
        formsList = [];
        formsSnapshot.forEach(doc => {
            formsList.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Fetch submission counts for all forms
        await fetchSubmissionCounts();

        // Populate categories filter
        populateCategoriesFilter();
        
        // Update stats summary
        updateStatsSummary();
        
        // Display forms
        displayForms(formsList);
    } catch (error) {
        console.error('Error loading forms:', error);
        showToast('Failed to load forms. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Fetch submission counts for all forms
 */
async function fetchSubmissionCounts() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    for (const form of formsList) {
        try {
            const submissionsRef = collection(db, 'forms', form.id, 'submissions');
            const submissionsSnapshot = await getDocs(submissionsRef);
            
            const total = submissionsSnapshot.size;
            let todayCount = 0;
            let weekCount = 0;

            submissionsSnapshot.forEach(subDoc => {
                const data = subDoc.data();
                const submittedAt = data.submittedAt?.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt);
                
                if (submittedAt >= today) todayCount++;
                if (submittedAt >= weekAgo) weekCount++;
            });

            submissionCounts[form.id] = { total, today: todayCount, week: weekCount };
        } catch (error) {
            console.error(`Error fetching submissions for form ${form.id}:`, error);
            submissionCounts[form.id] = { total: 0, today: 0, week: 0 };
        }
    }
}

/**
 * Update stats summary
 */
function updateStatsSummary() {
    const totalForms = formsList.length;
    const activeForms = formsList.filter(f => f.status === 'active').length;
    const draftForms = formsList.filter(f => f.status === 'draft').length;

    document.getElementById('totalFormsStat').textContent = formatNumber(totalForms);
    document.getElementById('activeFormsStat').textContent = formatNumber(activeForms);
    document.getElementById('draftFormsStat').textContent = formatNumber(draftForms);
}

/**
 * Populate categories filter
 */
function populateCategoriesFilter() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;

    const categories = new Set();
    formsList.forEach(form => {
        if (form.category) {
            categories.add(form.category);
        }
    });

    // Clear existing options except "All Categories"
    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    
    Array.from(categories).sort().forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

/**
 * Filter and sort forms
 */
function filterForms() {
    const searchTerm = document.getElementById('formSearch')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const sortFilter = document.getElementById('sortFilter')?.value || 'date-desc';

    let filtered = [...formsList];

    // Search filter
    if (searchTerm) {
        filtered = filtered.filter(form => {
            const name = (form.name || '').toLowerCase();
            const description = (form.description || '').toLowerCase();
            const category = (form.category || '').toLowerCase();
            const tags = (form.tags || []).join(' ').toLowerCase();
            return name.includes(searchTerm) || 
                   description.includes(searchTerm) ||
                   category.includes(searchTerm) ||
                   tags.includes(searchTerm);
        });
    }

    // Status filter
    if (statusFilter) {
        filtered = filtered.filter(form => form.status === statusFilter);
    }

    // Category filter
    if (categoryFilter) {
        filtered = filtered.filter(form => form.category === categoryFilter);
    }

    // Sort
    filtered.sort((a, b) => {
        switch (sortFilter) {
            case 'date-desc':
                return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
            case 'date-asc':
                return (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0);
            case 'name-asc':
                return (a.name || '').localeCompare(b.name || '');
            case 'name-desc':
                return (b.name || '').localeCompare(a.name || '');
            case 'status':
                return (a.status || '').localeCompare(b.status || '');
            default:
                return 0;
        }
    });

    displayForms(filtered);
}

/**
 * Display forms in current view (grid or list)
 */
function displayForms(forms) {
    const formsGrid = document.getElementById('formsGrid');
    const formsListView = document.getElementById('formsList');
    const emptyState = document.getElementById('emptyState');

    if (!formsGrid || !formsListView) return;

    if (forms.length === 0) {
        formsGrid.innerHTML = '';
        formsListView.innerHTML = '';
        if (emptyState) {
            emptyState.style.display = 'flex';
            // Ensure proper centering
            emptyState.style.flexDirection = 'column';
            emptyState.style.alignItems = 'center';
            emptyState.style.justifyContent = 'center';
        }
        return;
    }

    if (emptyState) {
        emptyState.style.display = 'none';
    }

    // Render based on current view
    if (currentView === 'grid') {
        formsGrid.innerHTML = forms.map(form => createFormCard(form)).join('');
        formsListView.style.display = 'none';
        formsGrid.style.display = 'grid';
    } else {
        formsListView.innerHTML = forms.map(form => createFormListItem(form)).join('');
        formsGrid.style.display = 'none';
        formsListView.style.display = 'flex';
    }
    
    // Add event listeners
    setupFormCardListeners(forms);
}

/**
 * Setup event listeners for form cards
 */
function setupFormCardListeners(forms) {
    forms.forEach(form => {
        const card = document.getElementById(`form-card-${form.id}`);
        const listItem = document.getElementById(`form-list-item-${form.id}`);
        
        if (card) {
            // Card click (excluding checkbox and actions)
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.form-card-checkbox') && 
                    !e.target.closest('.form-card-actions') &&
                    !e.target.closest('.quick-actions-btn') &&
                    !e.target.closest('.quick-actions-dropdown')) {
                    openFormDetails(form.id);
                }
            });

            // Checkbox
            const checkbox = card.querySelector('.form-card-checkbox');
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    e.stopPropagation();
                    toggleFormSelection(form.id, checkbox.checked);
                });
            }

            // Quick actions button
            const quickActionsBtn = card.querySelector('.quick-actions-btn');
            if (quickActionsBtn) {
                quickActionsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleQuickActions(form.id);
                });
            }
        }

        if (listItem) {
            listItem.addEventListener('click', (e) => {
                if (!e.target.closest('input[type="checkbox"]') && 
                    !e.target.closest('.form-list-item-actions')) {
                    openFormDetails(form.id);
                }
            });

            const checkbox = listItem.querySelector('.form-list-item-checkbox');
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    e.stopPropagation();
                    toggleFormSelection(form.id, checkbox.checked);
                });
            }
        }
    });
}

/**
 * Create form card HTML
 */
function createFormCard(form) {
    const statusColors = {
        draft: '#64748b',
        active: '#10b981',
        closed: '#ef4444'
    };

    const statusLabels = {
        draft: 'Draft',
        active: 'Active',
        closed: 'Closed'
    };

    const statusColor = statusColors[form.status] || '#64748b';
    const statusLabel = statusLabels[form.status] || 'Draft';
    
    const createdAt = form.createdAt?.toDate ? form.createdAt.toDate() : new Date(form.createdAt);
    const updatedAt = form.updatedAt?.toDate ? form.updatedAt.toDate() : new Date(form.updatedAt);
    
    const createdDate = createdAt.toLocaleDateString();
    const updatedDate = updatedAt.toLocaleDateString();

    const counts = submissionCounts[form.id] || { total: 0, today: 0, week: 0 };
    const isSelected = selectedForms.has(form.id);

    return `
        <div class="form-card ${isSelected ? 'selected' : ''}" id="form-card-${form.id}">
            <input type="checkbox" class="form-card-checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation()">
            <div class="form-card-header">
                <div class="form-card-title">
                    <h3>${escapeHtml(form.name || 'Untitled Form')}</h3>
                    <span class="form-status-badge" style="background-color: ${statusColor}20; color: ${statusColor}">
                        ${statusLabel}
                    </span>
                </div>
                <div class="form-card-actions form-card-actions-menu" onclick="event.stopPropagation()">
                    <button class="quick-actions-btn" title="More actions">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="quick-actions-dropdown">
                        <div class="quick-actions-item" onclick="editForm('${form.id}')">
                            <i class="fas fa-edit"></i>
                            <span>Edit</span>
                        </div>
                        <div class="quick-actions-item" onclick="duplicateForm('${form.id}')">
                            <i class="fas fa-copy"></i>
                            <span>Duplicate</span>
                        </div>
                        <div class="quick-actions-item" onclick="exportForm('${form.id}')">
                            <i class="fas fa-download"></i>
                            <span>Export</span>
                        </div>
                        <div class="quick-actions-item" onclick="window.openFormDetails ? window.openFormDetails('${form.id}') : null">
                            <i class="fas fa-eye"></i>
                            <span>View Details</span>
                        </div>
                        <div class="quick-actions-item danger" onclick="deleteForm('${form.id}')">
                            <i class="fas fa-trash"></i>
                            <span>Delete</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="form-card-body">
                <p class="form-card-description">${escapeHtml(form.description || 'No description')}</p>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.75rem;">
                    ${form.category ? `<span class="form-category">${escapeHtml(form.category)}</span>` : ''}
                    ${(form.tags || []).map(tag => `<span class="form-category">${escapeHtml(tag)}</span>`).join('')}
                </div>
                <div class="form-card-submission-stats">
                    <div class="submission-stat-item">
                        <div class="submission-stat-value">${formatNumber(counts.total)}</div>
                        <div class="submission-stat-label">Total</div>
                    </div>
                    <div class="submission-stat-item">
                        <div class="submission-stat-value">${formatNumber(counts.today)}</div>
                        <div class="submission-stat-label">Today</div>
                    </div>
                    <div class="submission-stat-item">
                        <div class="submission-stat-value">${formatNumber(counts.week)}</div>
                        <div class="submission-stat-label">This Week</div>
                    </div>
                </div>
            </div>
            <div class="form-card-footer">
                <div class="form-card-meta">
                    <span><i class="fas fa-calendar"></i> Created: ${createdDate}</span>
                    <span><i class="fas fa-edit"></i> Updated: ${updatedDate}</span>
                </div>
                <div class="form-card-stats">
                    <span><i class="fas fa-file-alt"></i> ${formatNumber(form.fields?.length || 0)} fields</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Create form list item HTML
 */
function createFormListItem(form) {
    const statusColors = {
        draft: '#64748b',
        active: '#10b981',
        closed: '#ef4444'
    };

    const statusLabels = {
        draft: 'Draft',
        active: 'Active',
        closed: 'Closed'
    };

    const statusColor = statusColors[form.status] || '#64748b';
    const statusLabel = statusLabels[form.status] || 'Draft';
    
    const createdAt = form.createdAt?.toDate ? form.createdAt.toDate() : new Date(form.createdAt);
    const updatedAt = form.updatedAt?.toDate ? form.updatedAt.toDate() : new Date(form.updatedAt);
    
    const createdDate = createdAt.toLocaleDateString();
    const counts = submissionCounts[form.id] || { total: 0, today: 0, week: 0 };
    const isSelected = selectedForms.has(form.id);

    return `
        <div class="form-list-item" id="form-list-item-${form.id}">
            <input type="checkbox" class="form-list-item-checkbox" ${isSelected ? 'checked' : ''}>
            <div class="form-list-item-info">
                <div class="form-list-item-title">
                    <span>${escapeHtml(form.name || 'Untitled Form')}</span>
                    <span class="form-status-badge" style="background-color: ${statusColor}20; color: ${statusColor}; font-size: 0.75rem;">
                        ${statusLabel}
                    </span>
                </div>
                <div class="form-list-item-meta">
                    <span><i class="fas fa-calendar"></i> ${createdDate}</span>
                    <span><i class="fas fa-file-alt"></i> ${formatNumber(form.fields?.length || 0)} fields</span>
                    ${form.category ? `<span><i class="fas fa-tag"></i> ${escapeHtml(form.category)}</span>` : ''}
                </div>
            </div>
            <div class="form-list-item-stats">
                <div><strong>${formatNumber(counts.total)}</strong> total</div>
                <div>${formatNumber(counts.today)} today</div>
            </div>
            <div class="form-list-item-actions">
                <button class="btn-icon" onclick="event.stopPropagation(); editForm('${form.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="event.stopPropagation(); duplicateForm('${form.id}')" title="Duplicate">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="btn-icon btn-icon-danger" onclick="event.stopPropagation(); deleteForm('${form.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

/**
 * Open form builder
 */
function openFormBuilder(formId = null) {
    // This will be handled by form-builder.js
    if (typeof window.openFormBuilder === 'function') {
        window.openFormBuilder(formId);
    } else {
        // Navigate to builder page
        const builderPage = document.getElementById('formBuilderPage');
        const formsListPage = document.getElementById('formsListPage');
        
        if (builderPage && formsListPage) {
            formsListPage.classList.remove('active');
            builderPage.classList.add('active');
            
            // Initialize builder
            if (typeof window.initializeFormBuilder === 'function') {
                window.initializeFormBuilder(formId);
            }
        }
    }
}

/**
 * Open form details
 */
function openFormDetails(formId) {
    // This will be handled by form-submissions.js
    const detailsPage = document.getElementById('formDetailsPage');
    const formsListPage = document.getElementById('formsListPage');
    
    if (detailsPage && formsListPage) {
        formsListPage.classList.remove('active');
        detailsPage.classList.add('active');
        
        if (typeof window.loadFormDetails === 'function') {
            window.loadFormDetails(formId);
        }
    }
}

// Make it globally accessible
window.openFormDetails = openFormDetails;

/**
 * Edit form
 */
window.editForm = function(formId) {
    openFormBuilder(formId);
};

/**
 * Duplicate form
 */
window.duplicateForm = async function(formId) {
    try {
        if (!confirm('Are you sure you want to duplicate this form?')) return;
        
        showLoading();
        const form = formsList.find(f => f.id === formId);
        if (!form) {
            throw new Error('Form not found');
        }

        // Create duplicate
        const duplicateForm = {
            ...form,
            name: form.name + ' (Copy)',
            status: 'draft',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };
        delete duplicateForm.id;

        // Save to Firestore
        const formsRef = collection(db, 'forms');
        const newDocRef = doc(formsRef);
        await setDoc(newDocRef, duplicateForm);

        // Reload forms
        await loadForms();
        showToast('Form duplicated successfully!', 'success');
    } catch (error) {
        console.error('Error duplicating form:', error);
        showToast('Failed to duplicate form. Please try again.', 'error');
    } finally {
        hideLoading();
    }
};

/**
 * Delete form
 */
window.deleteForm = async function(formId) {
    try {
        if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) return;
        
        showLoading();
        const formRef = doc(db, 'forms', formId);
        await deleteDoc(formRef);

        // Also delete submissions subcollection if exists
        // Note: Firestore doesn't automatically delete subcollections
        // We'll handle this in a separate cleanup function if needed

        // Reload forms
        await loadForms();
        showToast('Form deleted successfully!', 'success');
    } catch (error) {
        console.error('Error deleting form:', error);
        showToast('Failed to delete form. Please try again.', 'error');
    } finally {
        hideLoading();
    }
};

/**
 * Export form as JSON
 */
window.exportForm = async function(formId) {
    try {
        const form = formsList.find(f => f.id === formId);
        if (!form) {
            showToast('Form not found', 'error');
            return;
        }

        const exportData = {
            ...form,
            exportedAt: new Date().toISOString()
        };
        delete exportData.id;

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${form.name || 'form'}_${formId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Form exported successfully!', 'success');
    } catch (error) {
        console.error('Error exporting form:', error);
        showToast('Failed to export form.', 'error');
    }
};

/**
 * Bulk delete forms
 */
window.bulkDelete = async function() {
    if (selectedForms.size === 0) {
        showToast('No forms selected', 'warning');
        return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedForms.size} form(s)? This action cannot be undone.`)) {
        return;
    }

    try {
        showLoading();
        const deletePromises = Array.from(selectedForms).map(formId => {
            const formRef = doc(db, 'forms', formId);
            return deleteDoc(formRef);
        });

        await Promise.all(deletePromises);
        selectedForms.clear();
        await loadForms();
        showToast(`Successfully deleted ${deletePromises.length} form(s)!`, 'success');
    } catch (error) {
        console.error('Error bulk deleting forms:', error);
        showToast('Failed to delete forms. Please try again.', 'error');
    } finally {
        hideLoading();
    }
};

/**
 * Bulk export forms
 */
window.bulkExport = async function() {
    if (selectedForms.size === 0) {
        showToast('No forms selected', 'warning');
        return;
    }

    try {
        const formsToExport = formsList.filter(f => selectedForms.has(f.id));
        const exportData = {
            forms: formsToExport.map(form => {
                const { id, ...data } = form;
                return data;
            }),
            exportedAt: new Date().toISOString(),
            count: formsToExport.length
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `forms_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`Successfully exported ${formsToExport.length} form(s)!`, 'success');
    } catch (error) {
        console.error('Error bulk exporting forms:', error);
        showToast('Failed to export forms.', 'error');
    }
};

/**
 * Bulk change status
 */
window.bulkChangeStatus = async function() {
    if (selectedForms.size === 0) {
        showToast('No forms selected', 'warning');
        return;
    }

    const newStatus = prompt(`Enter new status for ${selectedForms.size} form(s):\n(draft, active, or closed)`);
    if (!newStatus || !['draft', 'active', 'closed'].includes(newStatus.toLowerCase())) {
        showToast('Invalid status. Please enter: draft, active, or closed', 'warning');
        return;
    }

    try {
        showLoading();
        const updatePromises = Array.from(selectedForms).map(formId => {
            const formRef = doc(db, 'forms', formId);
            return updateDoc(formRef, {
                status: newStatus.toLowerCase(),
                updatedAt: Timestamp.now()
            });
        });

        await Promise.all(updatePromises);
        selectedForms.clear();
        await loadForms();
        showToast(`Successfully updated ${updatePromises.length} form(s)!`, 'success');
    } catch (error) {
        console.error('Error bulk updating forms:', error);
        showToast('Failed to update forms. Please try again.', 'error');
    } finally {
        hideLoading();
    }
};

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Switch between grid and list view
 */
function switchView(view) {
    currentView = view;
    localStorage.setItem('formsView', view);
    updateViewToggle();
    filterForms(); // Re-render with new view
}

/**
 * Update view toggle buttons
 */
function updateViewToggle() {
    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    
    if (gridViewBtn && listViewBtn) {
        if (currentView === 'grid') {
            gridViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
        } else {
            listViewBtn.classList.add('active');
            gridViewBtn.classList.remove('active');
        }
    }
}

/**
 * Toggle form selection for bulk operations
 */
function toggleFormSelection(formId, selected) {
    if (selected) {
        selectedForms.add(formId);
    } else {
        selectedForms.delete(formId);
    }
    updateSelectionUI();
}

/**
 * Update selection UI
 */
function updateSelectionUI() {
    const count = selectedForms.size;
    const bulkBar = document.getElementById('bulkActionsBar');
    const selectedCount = document.getElementById('selectedCount');
    
    if (selectedCount) {
        selectedCount.textContent = count;
    }
    
    if (bulkBar) {
        bulkBar.style.display = count > 0 ? 'flex' : 'none';
    }

    // Update checkboxes
    selectedForms.forEach(formId => {
        const card = document.getElementById(`form-card-${formId}`);
        const listItem = document.getElementById(`form-list-item-${formId}`);
        if (card) {
            card.classList.add('selected');
            const checkbox = card.querySelector('.form-card-checkbox');
            if (checkbox) checkbox.checked = true;
        }
        if (listItem) {
            const checkbox = listItem.querySelector('.form-list-item-checkbox');
            if (checkbox) checkbox.checked = true;
        }
    });

    // Remove selection from unselected forms
    // Note: formsList is the module-level variable, not the DOM element
    const allForms = formsList;
    allForms.forEach(form => {
        if (!selectedForms.has(form.id)) {
            const card = document.getElementById(`form-card-${form.id}`);
            const listItem = document.getElementById(`form-list-item-${form.id}`);
            if (card) {
                card.classList.remove('selected');
                const checkbox = card.querySelector('.form-card-checkbox');
                if (checkbox) checkbox.checked = false;
            }
            if (listItem) {
                const checkbox = listItem.querySelector('.form-list-item-checkbox');
                if (checkbox) checkbox.checked = false;
            }
        }
    });
}

/**
 * Clear all selections
 */
window.clearSelection = function() {
    selectedForms.clear();
    updateSelectionUI();
};

/**
 * Toggle quick actions dropdown
 */
function toggleQuickActions(formId) {
    const card = document.getElementById(`form-card-${formId}`);
    if (!card) return;
    
    const dropdown = card.querySelector('.quick-actions-dropdown');
    if (!dropdown) return;

    // Close all other dropdowns
    document.querySelectorAll('.quick-actions-dropdown.show').forEach(d => {
        if (d !== dropdown) d.classList.remove('show');
    });

    dropdown.classList.toggle('show');
}

/**
 * Update filter indicators
 */
function updateFilterIndicators() {
    const indicators = document.getElementById('filterIndicators');
    if (!indicators) return;

    const searchTerm = document.getElementById('formSearch')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');

    indicators.innerHTML = '';
    let hasFilters = false;

    if (searchTerm) {
        hasFilters = true;
        indicators.innerHTML += `
            <span class="filter-tag">
                Search: "${escapeHtml(searchTerm)}"
                <button onclick="clearSearchFilter()">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `;
    }

    if (statusFilter) {
        hasFilters = true;
        indicators.innerHTML += `
            <span class="filter-tag">
                Status: ${escapeHtml(statusFilter)}
                <button onclick="clearStatusFilter()">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `;
    }

    if (categoryFilter) {
        hasFilters = true;
        indicators.innerHTML += `
            <span class="filter-tag">
                Category: ${escapeHtml(categoryFilter)}
                <button onclick="clearCategoryFilter()">
                    <i class="fas fa-times"></i>
                </button>
            </span>
        `;
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.style.display = hasFilters ? 'inline-flex' : 'none';
    }
}

/**
 * Clear all filters
 */
function clearAllFilters() {
    document.getElementById('formSearch').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('clearFormSearch').style.display = 'none';
    filterForms();
    updateFilterIndicators();
}

window.clearSearchFilter = function() {
    document.getElementById('formSearch').value = '';
    document.getElementById('clearFormSearch').style.display = 'none';
    filterForms();
    updateFilterIndicators();
};

window.clearStatusFilter = function() {
    document.getElementById('statusFilter').value = '';
    filterForms();
    updateFilterIndicators();
};

window.clearCategoryFilter = function() {
    document.getElementById('categoryFilter').value = '';
    filterForms();
    updateFilterIndicators();
};

// Initialize on page load - check if we're on forms.html
if (window.location.pathname.includes('forms.html') || document.getElementById('formsListPage')) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('Initializing forms page');
            initializeFormsPage();
        });
    } else {
        console.log('Initializing forms page (DOM already loaded)');
        initializeFormsPage();
    }
}

