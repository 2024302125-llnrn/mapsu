let feedbackItems = [];

document.addEventListener('DOMContentLoaded', async () => {
    const adminLoggedIn = sessionStorage.getItem('adminLoggedIn');
    const adminId = sessionStorage.getItem('adminId');

    if (!adminLoggedIn || adminLoggedIn !== 'true' || !adminId) {
        alert('Please login as admin first');
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('editFeedbackForm')?.addEventListener('submit', handleFeedbackUpdate);
    document.getElementById('closeEditModal')?.addEventListener('click', closeEditModal);
    document.getElementById('editModal')?.addEventListener('click', (event) => {
        if (event.target.id === 'editModal') {
            closeEditModal();
        }
    });

    await loadFeedback();
});

async function loadFeedback() {
    try {
        const response = await fetch('api/manage_feedback.php');
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Unable to load feedback.');
        }

        feedbackItems = result.data || [];
        renderFeedbackTable(feedbackItems);
        updateStats(feedbackItems);
    } catch (error) {
        console.error('Failed to load feedback:', error);
        alert(error.message || 'Failed to load feedback.');
    }
}

function renderFeedbackTable(items) {
    const tableBody = document.getElementById('feedback-table-body');

    if (!tableBody) {
        return;
    }

    if (items.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">No feedback records found.</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = items.map((item) => `
        <tr>
            <td>${escapeHtml(item.name || 'Anonymous')}</td>
            <td><span class="badge ${escapeHtml(item.type || 'other')}">${formatLabel(item.type || 'other')}</span></td>
            <td class="msg">${escapeHtml(item.message)}</td>
            <td class="stars">${renderStars(item.rating)}</td>
            <td><span class="status-badge ${escapeHtml(normalizeStatus(item.status))}">${formatLabel(item.status)}</span></td>
            <td><button class="action-btn edit" onclick="openEditModal(${Number(item.reportid)})">Edit</button></td>
        </tr>
    `).join('');
}

function updateStats(items) {
    const pendingCount = items.filter((item) => normalizeStatus(item.status) === 'pending').length;
    const resolvedCount = items.filter((item) => normalizeStatus(item.status) === 'resolved').length;

    document.getElementById('total-feedback').textContent = String(items.length);
    document.getElementById('pending-feedback').textContent = String(pendingCount);
    document.getElementById('resolved-feedback').textContent = String(resolvedCount);
}

function openEditModal(feedbackId) {
    const feedback = feedbackItems.find((item) => Number(item.reportid) === Number(feedbackId));

    if (!feedback) {
        showToast('Feedback record not found.', 'error');
        return;
    }

    document.getElementById('editFeedbackId').value = feedback.reportid;
    
    const statusField = document.getElementById('editFeedbackStatus');
    const currentStatus = formatLabel(normalizeStatus(feedback.status)); 
    statusField.value = currentStatus;

    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function handleFeedbackUpdate(event) {
    event.preventDefault();

    const adminId = sessionStorage.getItem('adminId');
    const feedbackId = parseInt(document.getElementById('editFeedbackId').value, 10);
    const newStatus = document.getElementById('editFeedbackStatus').value.trim();

    const originalFeedback = feedbackItems.find(item => Number(item.reportid) === feedbackId);
    const wasPending = originalFeedback && normalizeStatus(originalFeedback.status) === 'pending';

    const payload = {
        action: 'update',
        adminid: parseInt(adminId, 10),
        id: feedbackId,
        status: newStatus
    };

    try {
        const response = await fetch('api/manage_feedback.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Unable to update feedback.');
        }

        closeEditModal();
        await loadFeedback();

        if (wasPending && normalizeStatus(newStatus) === 'resolved') {
            showToast('Feedback marked as Resolved!', 'success');
        } else {
            showToast('Status updated successfully', 'success');
        }

    } catch (error) {
        console.error('Failed to update feedback:', error);
        showToast(error.message || 'Update failed', 'error');
    }
}

function filterByStatus(status) {
    if (status === 'all') {
        renderFeedbackTable(feedbackItems);
    } else {
        const filtered = feedbackItems.filter(item => 
            normalizeStatus(item.status) === status
        );
        renderFeedbackTable(filtered);
    }
    
    highlightActiveFilter(status);
}

function highlightActiveFilter(status) {
    document.querySelectorAll('.stat-card').forEach(card => {
        card.style.border = '1px solid #d1d1d1';
    });
    
    const index = status === 'all' ? 0 : (status === 'pending' ? 1 : 2);
    document.querySelectorAll('.stat-card')[index].style.border = '2px solid #800000';
}

function renderStars(rating) {
    const validRating = Number(rating);

    if (!validRating || validRating < 1) {
        return '&#9733;';
    }

    return '&#9733;'.repeat(validRating);
}

function formatLabel(value) {
    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeStatus(value) {
    return String(value || '').trim().toLowerCase();
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}