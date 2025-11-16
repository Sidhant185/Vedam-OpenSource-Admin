// Form Submissions Module
import { db, collection, doc, getDoc, getDocs, deleteDoc, updateDoc, query, orderBy, where, Timestamp } from '../firebase-config.js';
import { showLoading, hideLoading, formatNumber, showToast } from './utils.js';
import { loadFormAnalytics } from './form-analytics.js';

let currentFormId = null;
let currentFormData = null;
let submissionsList = [];

/**
 * Load form details page
 */
window.loadFormDetails = async function(formId) {
    currentFormId = formId;
    try {
        showLoading();
        
        // Load form data
        const formRef = doc(db, 'forms', formId);
        const formSnap = await getDoc(formRef);
        
        if (!formSnap.exists()) {
            alert('Form not found');
            backToForms();
            return;
        }

        currentFormData = {
            id: formSnap.id,
            ...formSnap.data()
        };

        // Load submissions
        await loadSubmissions();

        // Render form details page
        renderFormDetails();
        
        // Load analytics
        if (typeof loadFormAnalytics === 'function') {
            loadFormAnalytics(formId, currentFormData);
        }
    } catch (error) {
        console.error('Error loading form details:', error);
        alert('Failed to load form details');
    } finally {
        hideLoading();
    }
};

/**
 * Load submissions
 */
async function loadSubmissions() {
    try {
        const submissionsRef = collection(db, 'form_submissions', currentFormId, 'submissions');
        const submissionsSnapshot = await getDocs(query(submissionsRef, orderBy('submittedAt', 'desc')));
        
        submissionsList = [];
        submissionsSnapshot.forEach(doc => {
            submissionsList.push({
                id: doc.id,
                ...doc.data()
            });
        });
    } catch (error) {
        console.error('Error loading submissions:', error);
        submissionsList = [];
    }
}

/**
 * Render form details page
 */
function renderFormDetails() {
    const detailsPage = document.getElementById('formDetailsPage');
    if (!detailsPage) return;

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

    const statusColor = statusColors[currentFormData.status] || '#64748b';
    const statusLabel = statusLabels[currentFormData.status] || 'Draft';

    const createdAt = currentFormData.createdAt?.toDate ? currentFormData.createdAt.toDate() : new Date();
    const updatedAt = currentFormData.updatedAt?.toDate ? currentFormData.updatedAt.toDate() : new Date();

    detailsPage.innerHTML = `
        <div class="form-details-container">
            <div class="form-details-header">
                <div>
                    <h2>${escapeHtml(currentFormData.name || 'Untitled Form')}</h2>
                    <span class="form-status-badge" style="background-color: ${statusColor}20; color: ${statusColor};">
                        ${statusLabel}
                    </span>
                </div>
                <div class="form-details-actions">
                    <button class="btn btn-secondary" onclick="editFormFromDetails('${currentFormId}')">
                        <i class="fas fa-edit"></i> Edit Form
                    </button>
                    <button class="btn btn-secondary" onclick="duplicateFormFromDetails('${currentFormId}')">
                        <i class="fas fa-copy"></i> Duplicate
                    </button>
                    <button class="btn btn-danger" onclick="deleteFormFromDetails('${currentFormId}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                    <button class="btn btn-secondary" onclick="backToForms()">
                        <i class="fas fa-arrow-left"></i> Back
                    </button>
                </div>
            </div>

            <div class="form-details-content">
                <div class="form-details-grid">
                    <!-- Form Metadata -->
                    <div class="detail-card">
                        <div class="detail-card-header">
                            <h3>Form Information</h3>
                        </div>
                        <div class="detail-card-body">
                            <div class="detail-row">
                                <span class="detail-label">Description</span>
                                <span class="detail-value">${escapeHtml(currentFormData.description || 'No description')}</span>
                            </div>
                            ${currentFormData.category ? `
                                <div class="detail-row">
                                    <span class="detail-label">Category</span>
                                    <span class="detail-value">${escapeHtml(currentFormData.category)}</span>
                                </div>
                            ` : ''}
                            ${currentFormData.tags && currentFormData.tags.length > 0 ? `
                                <div class="detail-row">
                                    <span class="detail-label">Tags</span>
                                    <span class="detail-value">${currentFormData.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</span>
                                </div>
                            ` : ''}
                            <div class="detail-row">
                                <span class="detail-label">Created</span>
                                <span class="detail-value">${createdAt.toLocaleString()}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Last Updated</span>
                                <span class="detail-value">${updatedAt.toLocaleString()}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Fields</span>
                                <span class="detail-value">${formatNumber(currentFormData.fields?.length || 0)}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Submission Statistics -->
                    <div class="detail-card">
                        <div class="detail-card-header">
                            <h3>Submission Statistics</h3>
                        </div>
                        <div class="detail-card-body">
                            <div id="submissionStats">
                                ${renderSubmissionStats()}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Form Preview -->
                <div class="detail-card">
                    <div class="detail-card-header">
                        <h3>Form Preview</h3>
                    </div>
                    <div class="detail-card-body">
                        <div class="form-preview-readonly">
                            ${renderFormPreviewReadonly()}
                        </div>
                    </div>
                </div>

                <!-- Analytics -->
                <div id="formAnalytics" class="detail-card">
                    <!-- Analytics will be loaded by form-analytics.js -->
                </div>

                <!-- Submissions -->
                <div class="detail-card">
                    <div class="detail-card-header">
                        <div>
                            <h3>Submissions</h3>
                            <span class="submission-count">${formatNumber(submissionsList.length)} total</span>
                        </div>
                        <div class="submissions-actions">
                            <button class="btn btn-secondary" onclick="exportSubmissions('csv')">
                                <i class="fas fa-download"></i> Export CSV
                            </button>
                            <button class="btn btn-secondary" onclick="exportSubmissions('json')">
                                <i class="fas fa-download"></i> Export JSON
                            </button>
                        </div>
                    </div>
                    <div class="detail-card-body">
                        <div class="submissions-filters">
                            <input type="text" id="submissionSearch" placeholder="Search submissions..." onkeyup="filterSubmissions()">
                            <input type="date" id="submissionDateFrom" onchange="filterSubmissions()">
                            <input type="date" id="submissionDateTo" onchange="filterSubmissions()">
                        </div>
                        <div id="submissionsTable" class="submissions-table-container">
                            ${renderSubmissionsTable()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render submission statistics
 */
function renderSubmissionStats() {
    const total = submissionsList.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySubmissions = submissionsList.filter(s => {
        const subDate = s.submittedAt?.toDate ? s.submittedAt.toDate() : new Date(s.submittedAt);
        return subDate >= today;
    }).length;

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekSubmissions = submissionsList.filter(s => {
        const subDate = s.submittedAt?.toDate ? s.submittedAt.toDate() : new Date(s.submittedAt);
        return subDate >= weekAgo;
    }).length;

    const avgCompletionTime = submissionsList.length > 0
        ? submissionsList.reduce((sum, s) => sum + (s.completionTime || 0), 0) / submissionsList.length
        : 0;

    return `
        <div class="stats-grid-mini">
            <div class="stat-mini">
                <div class="stat-mini-value">${formatNumber(total)}</div>
                <div class="stat-mini-label">Total Submissions</div>
            </div>
            <div class="stat-mini">
                <div class="stat-mini-value">${formatNumber(todaySubmissions)}</div>
                <div class="stat-mini-label">Today</div>
            </div>
            <div class="stat-mini">
                <div class="stat-mini-value">${formatNumber(weekSubmissions)}</div>
                <div class="stat-mini-label">This Week</div>
            </div>
            <div class="stat-mini">
                <div class="stat-mini-value">${avgCompletionTime > 0 ? Math.round(avgCompletionTime) + 's' : 'N/A'}</div>
                <div class="stat-mini-label">Avg Completion Time</div>
            </div>
        </div>
    `;
}

/**
 * Render form preview (read-only)
 */
function renderFormPreviewReadonly() {
    if (!currentFormData.fields || currentFormData.fields.length === 0) {
        return '<p>No fields in this form</p>';
    }

    const sortedFields = [...currentFormData.fields].sort((a, b) => a.order - b.order);
    
    let html = '<div class="preview-form">';
    
    sortedFields.forEach(field => {
        html += renderFieldPreviewReadonly(field);
    });
    
    html += '</div>';
    return html;
}

/**
 * Render field preview (read-only)
 */
function renderFieldPreviewReadonly(field) {
    const section = currentFormData.sections?.find(s => s.id === field.sectionId);
    let html = '';

    if (section && !currentFormData.fields.find(f => f.id === field.id && f.order < field.order && f.sectionId === field.sectionId)) {
        html += `
            <div class="preview-section">
                <h3>${escapeHtml(section.title)}</h3>
                ${section.description ? `<p>${escapeHtml(section.description)}</p>` : ''}
            </div>
        `;
    }

    html += `
        <div class="preview-field">
            <label>
                ${escapeHtml(field.label || 'Untitled Field')}
                ${field.required ? '<span class="required">*</span>' : ''}
            </label>
            ${renderFieldInputReadonly(field)}
            ${field.helpText ? `<small>${escapeHtml(field.helpText)}</small>` : ''}
        </div>
    `;

    return html;
}

/**
 * Render field input (read-only)
 */
function renderFieldInputReadonly(field) {
    switch (field.type) {
        case 'text':
        case 'email':
        case 'number':
            return `<input type="${field.type}" placeholder="${escapeHtml(field.placeholder || '')}" disabled>`;
        case 'textarea':
            return `<textarea placeholder="${escapeHtml(field.placeholder || '')}" disabled></textarea>`;
        case 'dropdown':
            return `
                <select disabled>
                    <option value="">Select...</option>
                    ${(field.options || []).map(opt => `<option>${escapeHtml(opt)}</option>`).join('')}
                </select>
            `;
        case 'multiselect':
            return `
                <select multiple disabled>
                    ${(field.options || []).map(opt => `<option>${escapeHtml(opt)}</option>`).join('')}
                </select>
            `;
        case 'checkbox':
        case 'radio':
            return `
                <div class="${field.type}-group">
                    ${(field.options || []).map(opt => `
                        <label>
                            <input type="${field.type}" disabled>
                            ${escapeHtml(opt)}
                        </label>
                    `).join('')}
                </div>
            `;
        case 'date':
            return `<input type="date" disabled>`;
        case 'time':
            return `<input type="time" disabled>`;
        case 'rating':
            return `<div class="rating-preview">${Array(5).fill(0).map(() => `<i class="fas fa-star"></i>`).join('')}</div>`;
        case 'scale':
            return `<input type="range" min="1" max="10" value="5" disabled>`;
        default:
            return '';
    }
}

/**
 * Render submissions table
 */
function renderSubmissionsTable(submissions = null) {
    const submissionsToRender = submissions || submissionsList;
    
    if (submissionsToRender.length === 0) {
        return '<p class="empty-text">No submissions yet</p>';
    }

    return `
        <table class="submissions-table">
            <thead>
                <tr>
                    <th>Date/Time</th>
                    <th>Submitted By</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${submissionsToRender.map(submission => `
                    <tr>
                        <td>${formatSubmissionDate(submission.submittedAt)}</td>
                        <td>${escapeHtml(submission.submittedBy || 'Anonymous')}</td>
                        <td>
                            <button class="btn btn-sm btn-primary" onclick="viewSubmission('${submission.id}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="editSubmission('${submission.id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteSubmission('${submission.id}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

/**
 * View submission details
 */
window.viewSubmission = function(submissionId) {
    const submission = submissionsList.find(s => s.id === submissionId);
    if (!submission) return;

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h3>Submission Details</h3>
                <button class="btn-icon" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="submission-details">
                    <div class="detail-section">
                        <h4>Submission Information</h4>
                        <div class="detail-row">
                            <span class="detail-label">Submitted At</span>
                            <span class="detail-value">${formatSubmissionDate(submission.submittedAt)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Submitted By</span>
                            <span class="detail-value">${escapeHtml(submission.submittedBy || 'Anonymous')}</span>
                        </div>
                        ${submission.completionTime ? `
                            <div class="detail-row">
                                <span class="detail-label">Completion Time</span>
                                <span class="detail-value">${Math.round(submission.completionTime)}s</span>
                            </div>
                        ` : ''}
                    </div>

                    ${submission.userInfo && Object.keys(submission.userInfo).length > 0 ? `
                        <div class="detail-section">
                            <h4>User Information</h4>
                            ${Object.entries(submission.userInfo).map(([key, value]) => `
                                <div class="detail-row">
                                    <span class="detail-label">${key.charAt(0).toUpperCase() + key.slice(1)}</span>
                                    <span class="detail-value">${escapeHtml(value || 'N/A')}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}

                    <div class="detail-section">
                        <h4>Form Data</h4>
                        ${renderSubmissionData(submission.data)}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                <button class="btn btn-primary" onclick="editSubmission('${submission.id}'); this.closest('.modal').remove();">
                    <i class="fas fa-edit"></i> Edit Submission
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
};

/**
 * Edit submission
 */
window.editSubmission = async function(submissionId) {
    const submission = submissionsList.find(s => s.id === submissionId);
    if (!submission) {
        if (typeof showToast === 'function') {
            showToast('Submission not found', 'error');
        } else {
            alert('Submission not found');
        }
        return;
    }

    // Create edit modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h3>Edit Submission</h3>
                <button class="btn-icon" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="submission-edit-form">
                    <div class="form-section">
                        <h4>Submission Information</h4>
                        <div class="form-group">
                            <label>Submitted By</label>
                            <input type="text" id="editSubmittedBy" value="${escapeHtml(submission.submittedBy || '')}" placeholder="Email or name">
                        </div>
                        ${submission.completionTime !== undefined ? `
                            <div class="form-group">
                                <label>Completion Time (seconds)</label>
                                <input type="number" id="editCompletionTime" value="${submission.completionTime || 0}" min="0">
                            </div>
                        ` : ''}
                    </div>

                    ${submission.userInfo && Object.keys(submission.userInfo).length > 0 ? `
                        <div class="form-section">
                            <h4>User Information</h4>
                            ${Object.entries(submission.userInfo).map(([key, value]) => `
                                <div class="form-group">
                                    <label>${key.charAt(0).toUpperCase() + key.slice(1)}</label>
                                    <input type="text" id="editUserInfo_${key}" value="${escapeHtml(value || '')}">
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}

                    <div class="form-section">
                        <h4>Form Data</h4>
                        <div id="editFormDataFields">
                            ${renderEditableFormData(submission.data)}
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="saveSubmissionEdit('${submissionId}')">
                    <i class="fas fa-save"></i> Save Changes
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
};

/**
 * Render editable form data fields
 */
function renderEditableFormData(data) {
    if (!data || !currentFormData || !currentFormData.fields) {
        return '<p>No form data available</p>';
    }

    return currentFormData.fields
        .filter(field => field.type !== 'section' && field.type !== 'pagebreak')
        .map(field => {
            const fieldId = field.id;
            const value = data[fieldId];
            const fieldValue = value !== undefined && value !== null 
                ? (Array.isArray(value) ? value.join(', ') : String(value))
                : '';

            let inputHtml = '';

            switch (field.type) {
                case 'text':
                case 'email':
                case 'number':
                    inputHtml = `<input type="${field.type}" id="editField_${fieldId}" value="${escapeHtml(fieldValue)}" class="form-control">`;
                    break;
                case 'textarea':
                    inputHtml = `<textarea id="editField_${fieldId}" rows="3" class="form-control">${escapeHtml(fieldValue)}</textarea>`;
                    break;
                case 'dropdown':
                case 'radio':
                    if (field.options && field.options.length > 0) {
                        inputHtml = `
                            <select id="editField_${fieldId}" class="form-control">
                                <option value="">-- Select --</option>
                                ${field.options.map(opt => `
                                    <option value="${escapeHtml(opt)}" ${fieldValue === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>
                                `).join('')}
                            </select>
                        `;
                    } else {
                        inputHtml = `<input type="text" id="editField_${fieldId}" value="${escapeHtml(fieldValue)}" class="form-control">`;
                    }
                    break;
                case 'multiselect':
                case 'checkbox':
                    if (field.options && field.options.length > 0) {
                        const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
                        inputHtml = `
                            <div class="checkbox-group">
                                ${field.options.map(opt => `
                                    <label style="display: block; margin-bottom: 0.5rem;">
                                        <input type="checkbox" value="${escapeHtml(opt)}" 
                                               ${selectedValues.includes(opt) ? 'checked' : ''}
                                               data-field-id="${fieldId}">
                                        ${escapeHtml(opt)}
                                    </label>
                                `).join('')}
                            </div>
                        `;
                    } else {
                        inputHtml = `<input type="text" id="editField_${fieldId}" value="${escapeHtml(fieldValue)}" class="form-control">`;
                    }
                    break;
                case 'date':
                    const dateValue = fieldValue ? new Date(fieldValue).toISOString().split('T')[0] : '';
                    inputHtml = `<input type="date" id="editField_${fieldId}" value="${dateValue}" class="form-control">`;
                    break;
                case 'time':
                    const timeValue = fieldValue ? fieldValue.split(' ')[0] : '';
                    inputHtml = `<input type="time" id="editField_${fieldId}" value="${timeValue}" class="form-control">`;
                    break;
                default:
                    inputHtml = `<input type="text" id="editField_${fieldId}" value="${escapeHtml(fieldValue)}" class="form-control">`;
            }

            return `
                <div class="form-group">
                    <label>
                        ${escapeHtml(field.label || 'Untitled Field')}
                        ${field.required ? '<span class="required">*</span>' : ''}
                    </label>
                    ${inputHtml}
                    ${field.helpText ? `<small class="form-help-text">${escapeHtml(field.helpText)}</small>` : ''}
                </div>
            `;
        }).join('');
}

/**
 * Save submission edit
 */
window.saveSubmissionEdit = async function(submissionId) {
    try {
        showLoading();

        // Get edited values
        const submittedBy = document.getElementById('editSubmittedBy')?.value || '';
        const completionTime = document.getElementById('editCompletionTime')?.value 
            ? parseInt(document.getElementById('editCompletionTime').value) 
            : undefined;

        // Get user info
        const userInfo = {};
        if (currentFormData && submissionsList.find(s => s.id === submissionId)?.userInfo) {
            const originalUserInfo = submissionsList.find(s => s.id === submissionId).userInfo;
            Object.keys(originalUserInfo).forEach(key => {
                const input = document.getElementById(`editUserInfo_${key}`);
                if (input) {
                    userInfo[key] = input.value;
                }
            });
        }

        // Get form data
        const editedData = {};
        if (currentFormData && currentFormData.fields) {
            currentFormData.fields
                .filter(field => field.type !== 'section' && field.type !== 'pagebreak')
                .forEach(field => {
                    const fieldId = field.id;
                    let fieldValue = null;

                    if (field.type === 'multiselect' || field.type === 'checkbox') {
                        // Get all checked values
                        const checkboxes = document.querySelectorAll(`input[type="checkbox"][data-field-id="${fieldId}"]:checked`);
                        fieldValue = Array.from(checkboxes).map(cb => cb.value);
                        if (fieldValue.length === 0) fieldValue = null;
                    } else {
                        const input = document.getElementById(`editField_${fieldId}`);
                        if (input) {
                            fieldValue = input.value;
                            if (fieldValue === '' && !field.required) {
                                fieldValue = null;
                            }
                        }
                    }

                    if (fieldValue !== null) {
                        editedData[fieldId] = fieldValue;
                    }
                });
        }

        // Prepare update data
        const updateData = {
            data: editedData,
            updatedAt: Timestamp.now()
        };

        if (submittedBy !== '') {
            updateData.submittedBy = submittedBy;
        }

        if (completionTime !== undefined) {
            updateData.completionTime = completionTime;
        }

        if (Object.keys(userInfo).length > 0) {
            updateData.userInfo = userInfo;
        }

        // Update in Firebase
        const submissionRef = doc(db, 'form_submissions', currentFormId, 'submissions', submissionId);
        await updateDoc(submissionRef, updateData);

        // Reload submissions
        await loadSubmissions();

        // Re-render the page
        renderFormDetails();

        // Reload analytics
        if (typeof loadFormAnalytics === 'function') {
            loadFormAnalytics(currentFormId, currentFormData);
        }

        // Close modal
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.remove();
        }

        if (typeof showToast === 'function') {
            showToast('Submission updated successfully!', 'success');
        } else {
            alert('Submission updated successfully!');
        }
    } catch (error) {
        console.error('Error updating submission:', error);
        const errorMsg = error.message || 'Failed to update submission';
        if (typeof showToast === 'function') {
            showToast(`Error: ${errorMsg}`, 'error');
        } else {
            alert(`Failed to update submission: ${errorMsg}`);
        }
    } finally {
        hideLoading();
    }
};

/**
 * Render submission data
 */
function renderSubmissionData(data) {
    if (!data || Object.keys(data).length === 0) {
        return '<p>No data</p>';
    }

    return Object.entries(data).map(([fieldId, value]) => {
        const field = currentFormData.fields?.find(f => f.id === fieldId);
        const label = field?.label || fieldId;
        
        return `
            <div class="detail-row">
                <span class="detail-label">${escapeHtml(label)}</span>
                <span class="detail-value">${escapeHtml(Array.isArray(value) ? value.join(', ') : String(value))}</span>
            </div>
        `;
    }).join('');
}

/**
 * Delete submission
 */
window.deleteSubmission = async function(submissionId) {
    if (!confirm('Are you sure you want to delete this submission? This action cannot be undone.')) return;

    try {
        showLoading();
        
        // Delete from Firebase - correct path: form_submissions/{formId}/submissions/{submissionId}
        const submissionRef = doc(db, 'form_submissions', currentFormId, 'submissions', submissionId);
        await deleteDoc(submissionRef);
        
        // Remove from local list
        submissionsList = submissionsList.filter(s => s.id !== submissionId);
        
        // Reload submissions to ensure sync
        await loadSubmissions();
        
        // Re-render the page
        renderFormDetails();
        
        // Reload analytics
        if (typeof loadFormAnalytics === 'function') {
            loadFormAnalytics(currentFormId, currentFormData);
        }
        
        if (typeof showToast === 'function') {
            showToast('Submission deleted successfully!', 'success');
        } else {
            alert('Submission deleted successfully!');
        }
    } catch (error) {
        console.error('Error deleting submission:', error);
        const errorMsg = error.message || 'Failed to delete submission';
        if (typeof showToast === 'function') {
            showToast(`Error: ${errorMsg}`, 'error');
        } else {
            alert(`Failed to delete submission: ${errorMsg}`);
        }
    } finally {
        hideLoading();
    }
};

/**
 * Filter submissions
 */
window.filterSubmissions = function() {
    const searchTerm = document.getElementById('submissionSearch')?.value.toLowerCase() || '';
    const dateFrom = document.getElementById('submissionDateFrom')?.value;
    const dateTo = document.getElementById('submissionDateTo')?.value;

    let filtered = [...submissionsList];

    if (searchTerm) {
        filtered = filtered.filter(s => {
            const submittedBy = (s.submittedBy || '').toLowerCase();
            return submittedBy.includes(searchTerm);
        });
    }

    if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter(s => {
            const subDate = s.submittedAt?.toDate ? s.submittedAt.toDate() : new Date(s.submittedAt);
            return subDate >= fromDate;
        });
    }

    if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(s => {
            const subDate = s.submittedAt?.toDate ? s.submittedAt.toDate() : new Date(s.submittedAt);
            return subDate <= toDate;
        });
    }

    const table = document.getElementById('submissionsTable');
    if (table) {
        // Store filtered list temporarily for rendering
        const originalList = submissionsList;
        submissionsList = filtered;
        table.innerHTML = renderSubmissionsTable(filtered);
        submissionsList = originalList;
    }
};

/**
 * Export submissions
 */
window.exportSubmissions = function(format) {
    if (submissionsList.length === 0) {
        alert('No submissions to export');
        return;
    }

    if (format === 'csv') {
        exportSubmissionsCSV();
    } else if (format === 'json') {
        exportSubmissionsJSON();
    }
};

/**
 * Export submissions as CSV
 */
function exportSubmissionsCSV() {
    const headers = ['Submission ID', 'Submitted At', 'Submitted By', ...currentFormData.fields.map(f => f.label)];
    const rows = submissionsList.map(sub => {
        const row = [sub.id, formatSubmissionDate(sub.submittedAt), sub.submittedBy || 'Anonymous'];
        currentFormData.fields.forEach(field => {
            const value = sub.data?.[field.id];
            row.push(Array.isArray(value) ? value.join('; ') : (value || ''));
        });
        return row;
    });

    const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    downloadFile(csv, `${currentFormData.name}-submissions.csv`, 'text/csv');
}

/**
 * Export submissions as JSON
 */
function exportSubmissionsJSON() {
    const data = {
        form: {
            id: currentFormId,
            name: currentFormData.name
        },
        submissions: submissionsList.map(sub => ({
            id: sub.id,
            submittedAt: sub.submittedAt?.toDate ? sub.submittedAt.toDate().toISOString() : sub.submittedAt,
            submittedBy: sub.submittedBy,
            userInfo: sub.userInfo,
            data: sub.data,
            completionTime: sub.completionTime
        }))
    };

    downloadFile(JSON.stringify(data, null, 2), `${currentFormData.name}-submissions.json`, 'application/json');
}

/**
 * Download file
 */
function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Edit form from details
 */
window.editFormFromDetails = function(formId) {
    window.location.href = `forms.html?edit=${formId}`;
};

/**
 * Duplicate form from details
 */
window.duplicateFormFromDetails = async function(formId) {
    if (typeof window.duplicateForm === 'function') {
        await window.duplicateForm(formId);
    }
};

/**
 * Delete form from details
 */
window.deleteFormFromDetails = async function(formId) {
    if (!confirm('Are you sure you want to delete this form? All submissions will also be deleted.')) return;

    try {
        showLoading();
        if (typeof window.deleteForm === 'function') {
            await window.deleteForm(formId);
            backToForms();
        }
    } catch (error) {
        console.error('Error deleting form:', error);
        alert('Failed to delete form');
    } finally {
        hideLoading();
    }
};

/**
 * Back to forms
 */
window.backToForms = function() {
    window.location.href = 'forms.html';
};

/**
 * Format submission date
 */
function formatSubmissionDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Show success message
 */
function showSuccess(message) {
    alert(message);
}

