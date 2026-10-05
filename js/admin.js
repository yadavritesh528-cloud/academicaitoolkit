/**
 * Academic AI Toolkit — Admin Dashboard Controller
 * Handles authentication and review moderation.
 */

import {
  auth,
  PRIMARY_ADMIN_EMAIL,
  isCurrentUserAdmin,
  adminSignInWithGoogle,
  adminSignInWithEmail,
  adminSignOut,
  getAllReviewsForAdmin,
  updateReviewAdminState,
  deleteReviewById,
  seedInitialDataIfEmpty
} from './firebase-client.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// State
let allReviews = [];
let currentFilter = 'all';
let currentSearch = '';
let currentStarFilter = 'all';
let currentSort = 'newest';
let selectedReview = null;

// DOM Elements
const loginView = document.getElementById('admin-login-view');
const dashboardView = document.getElementById('admin-dashboard-view');
const userBar = document.getElementById('admin-user-bar');
const headerUserEmail = document.getElementById('header-user-email');
const loginErrorAlert = document.getElementById('login-error-alert');
const googleLoginBtn = document.getElementById('google-login-btn');
const emailLoginForm = document.getElementById('email-login-form');
const emailLoginInput = document.getElementById('email-login-input');
const passwordLoginInput = document.getElementById('password-login-input');
const adminLogoutBtn = document.getElementById('admin-logout-btn');

// Stats Elements
const statTotal = document.getElementById('stat-total-reviews');
const statPending = document.getElementById('stat-pending-reviews');
const statApproved = document.getElementById('stat-approved-reviews');
const statRejected = document.getElementById('stat-rejected-reviews');
const statCurrentPrice = document.getElementById('stat-current-price');
const pendingCountBadge = document.getElementById('pending-count-badge');
const overviewRecentList = document.getElementById('overview-recent-reviews-list');
const jumpToReviewsBtn = document.getElementById('jump-to-reviews-btn');

// Reviews Table & Filters
const reviewsTableBody = document.getElementById('admin-reviews-table-body');
const searchInput = document.getElementById('review-search-input');
const starFilterSelect = document.getElementById('review-star-filter');
const sortSelect = document.getElementById('review-sort-select');
const seedSamplesBtn = document.getElementById('btn-seed-samples');
const filterPills = document.querySelectorAll('.admin-filter-pill');

// Pricing Elements
const pricingForm = document.getElementById('admin-pricing-form');

// Modal Elements
const reviewModal = document.getElementById('admin-review-modal');
const modalCloseBtn = document.getElementById('close-admin-modal-btn');
const modalReviewerName = document.getElementById('modal-reviewer-name');
const modalRating = document.getElementById('modal-review-rating');
const modalStatusBadge = document.getElementById('modal-review-status-badge');
const modalComment = document.getElementById('modal-review-comment');
const modalEmail = document.getElementById('modal-reviewer-email');
const modalRole = document.getElementById('modal-reviewer-role');
const modalAdminNote = document.getElementById('modal-admin-note');
const modalVerifiedCheckbox = document.getElementById('modal-verified-checkbox');
const modalApproveBtn = document.getElementById('modal-approve-btn');
const modalRejectBtn = document.getElementById('modal-reject-btn');
const modalDeleteBtn = document.getElementById('modal-delete-btn');

/* ==========================================================================
   1. AUTHENTICATION CONTROLLER
   ========================================================================== */

function showLoginError(msg) {
  if (!loginErrorAlert) return;
  loginErrorAlert.textContent = msg;
  loginErrorAlert.hidden = false;
}

function clearLoginError() {
  if (!loginErrorAlert) return;
  loginErrorAlert.textContent = '';
  loginErrorAlert.hidden = true;
}

// Google Sign-In
if (googleLoginBtn) {
  googleLoginBtn.addEventListener('click', async () => {
    clearLoginError();
    googleLoginBtn.disabled = true;
    googleLoginBtn.style.opacity = '0.7';
    try {
      await adminSignInWithGoogle();
    } catch (err) {
      showLoginError(err.message || 'Google Sign-In failed.');
    } finally {
      googleLoginBtn.disabled = false;
      googleLoginBtn.style.opacity = '1';
    }
  });
}

// Email Sign-In
if (emailLoginForm) {
  emailLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearLoginError();
    const email = emailLoginInput?.value.trim();
    const password = passwordLoginInput?.value;
    if (!email || !password) {
      showLoginError('Please enter both email and password.');
      return;
    }
    const submitBtn = emailLoginForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in...';
    }
    try {
      await adminSignInWithEmail(email, password);
    } catch (err) {
      showLoginError(err.message || 'Email authentication failed. Please verify credentials.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In with Email';
      }
    }
  });
}

// Logout
if (adminLogoutBtn) {
  adminLogoutBtn.addEventListener('click', async () => {
    try {
      await adminSignOut();
      window.location.reload();
    } catch (err) {
      console.error('Logout error:', err);
    }
  });
}

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const isAdmin = await isCurrentUserAdmin(user);
    if (isAdmin) {
      loginView.hidden = true;
      dashboardView.hidden = false;
      userBar.hidden = false;
      if (headerUserEmail) headerUserEmail.textContent = user.email;
      initDashboard();
    } else {
      loginView.hidden = false;
      dashboardView.hidden = true;
      userBar.hidden = true;
      showLoginError(`Access denied: Account ${user.email} is not in the authorized administrator directory.`);
    }
  } else {
    loginView.hidden = false;
    dashboardView.hidden = true;
    userBar.hidden = true;
  }
});

/* ==========================================================================
   2. TAB NAVIGATION
   ========================================================================== */

const tabBtns = document.querySelectorAll('.admin-tab-btn');
const tabPanes = {
  overview: document.getElementById('pane-overview'),
  reviews: document.getElementById('pane-reviews'),
  pricing: document.getElementById('pane-pricing'),
  settings: document.getElementById('pane-settings')
};

function switchTab(targetTab) {
  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === targetTab);
  });
  Object.keys(tabPanes).forEach(tabKey => {
    const pane = tabPanes[tabKey];
    if (pane) {
      pane.hidden = tabKey !== targetTab;
    }
  });
}

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-tab');
    if (target) switchTab(target);
  });
});

if (jumpToReviewsBtn) {
  jumpToReviewsBtn.addEventListener('click', () => switchTab('reviews'));
}

/* ==========================================================================
   3. DASHBOARD INITIALIZATION & DATA SYNC
   ========================================================================== */

async function initDashboard() {
  await seedInitialDataIfEmpty();
  await refreshReviews();
}

async function refreshReviews() {
  try {
    if (reviewsTableBody) {
      reviewsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#64748B;">Loading reviews...</td></tr>';
    }
    allReviews = await getAllReviewsForAdmin();
    updateStatsAndPills();
    renderReviewsTable();
    renderRecentOverview();
  } catch (err) {
    console.error('Failed to fetch reviews:', err);
    if (reviewsTableBody) {
      reviewsTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#DC2626;">Error loading reviews: ${err.message || 'Check connection'}</td></tr>`;
    }
  }
}

function updateStatsAndPills() {
  const total = allReviews.length;
  const pending = allReviews.filter(r => r.status === 'pending').length;
  const approved = allReviews.filter(r => r.status === 'approved').length;
  const rejected = allReviews.filter(r => r.status === 'rejected').length;

  if (statTotal) statTotal.textContent = total;
  if (statPending) statPending.textContent = pending;
  if (statApproved) statApproved.textContent = approved;
  if (statRejected) statRejected.textContent = rejected;
  if (pendingCountBadge) pendingCountBadge.textContent = pending;

  // Update filter pill counts
  const pAll = document.getElementById('count-pill-all');
  const pPending = document.getElementById('count-pill-pending');
  const pApproved = document.getElementById('count-pill-approved');
  const pRejected = document.getElementById('count-pill-rejected');

  if (pAll) pAll.textContent = total;
  if (pPending) pPending.textContent = pending;
  if (pApproved) pApproved.textContent = approved;
  if (pRejected) pRejected.textContent = rejected;
}

/* ==========================================================================
   4. REVIEWS FILTERING, SORTING & RENDERING
   ========================================================================== */

function getFilteredReviews() {
  return allReviews.filter(r => {
    // Status filter
    if (currentFilter !== 'all' && r.status !== currentFilter) return false;

    // Star filter
    if (currentStarFilter !== 'all' && Number(r.rating) !== Number(currentStarFilter)) return false;

    // Search query
    if (currentSearch) {
      const q = currentSearch.toLowerCase();
      const name = (r.name || '').toLowerCase();
      const comment = (r.comment || '').toLowerCase();
      const role = (r.role || '').toLowerCase();
      const institution = (r.institution || '').toLowerCase();
      const email = (r.email || '').toLowerCase();
      if (!name.includes(q) && !comment.includes(q) && !role.includes(q) && !institution.includes(q) && !email.includes(q)) {
        return false;
      }
    }
    return true;
  }).sort((a, b) => {
    if (currentSort === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    if (currentSort === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    if (currentSort === 'highest') return (b.rating || 0) - (a.rating || 0);
    if (currentSort === 'lowest') return (a.rating || 0) - (b.rating || 0);
    return 0;
  });
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function renderStars(rating) {
  const num = Math.min(Math.max(Math.round(rating || 5), 1), 5);
  return '★'.repeat(num) + '☆'.repeat(5 - num);
}

function getStatusBadge(status) {
  if (status === 'approved') return '<span class="badge-status badge-status--approved">Approved</span>';
  if (status === 'rejected') return '<span class="badge-status badge-status--rejected">Rejected</span>';
  return '<span class="badge-status badge-status--pending">Pending</span>';
}

function renderReviewsTable() {
  if (!reviewsTableBody) return;
  const list = getFilteredReviews();

  if (list.length === 0) {
    reviewsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:36px; color:#64748B;">No reviews found matching the current filter.</td></tr>';
    return;
  }

  reviewsTableBody.innerHTML = '';
  list.forEach(rev => {
    const tr = document.createElement('tr');

    const metaParts = [];
    if (rev.role) metaParts.push(rev.role);
    if (rev.institution) metaParts.push(rev.institution);
    const metaStr = metaParts.join(' · ');

    const verifiedBadge = rev.verified
      ? '<span style="display:inline-flex; align-items:center; gap:3px; background:#D1FAE5; color:#065F46; padding:2px 6px; border-radius:4px; font-size:0.68rem; font-weight:700; margin-left:6px;">✓ Verified</span>'
      : '';

    const sampleBadge = rev.isSample
      ? '<span style="display:inline-flex; align-items:center; background:#EDE9FE; color:#5B21B6; padding:2px 6px; border-radius:4px; font-size:0.68rem; font-weight:700; margin-left:6px;">Sample</span>'
      : '';

    tr.innerHTML = `
      <td>
        <div style="font-weight:700; color:var(--admin-navy); display:flex; align-items:center;">
          ${escapeHtml(rev.name || 'Anonymous')}
          ${verifiedBadge}
          ${sampleBadge}
        </div>
        <div style="font-size:0.75rem; color:#64748B; margin-top:2px;">${escapeHtml(metaStr || rev.email || '')}</div>
      </td>
      <td>
        <span style="color:#F5A900; font-size:0.95rem; white-space:nowrap;">${renderStars(rev.rating)}</span>
      </td>
      <td>
        <div style="max-width:320px; font-size:0.84rem; color:#334155; line-height:1.45; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">
          ${escapeHtml(rev.comment || '')}
        </div>
      </td>
      <td>${getStatusBadge(rev.status)}</td>
      <td style="font-size:0.8125rem; color:#64748B; white-space:nowrap;">${formatDate(rev.createdAt)}</td>
      <td style="text-align:right; white-space:nowrap;">
        <button type="button" class="btn-action btn-action--view" data-action="view" data-id="${rev.id}">Inspect</button>
        ${rev.status !== 'approved' ? `<button type="button" class="btn-action btn-action--approve" data-action="quick-approve" data-id="${rev.id}">Approve</button>` : ''}
        ${rev.status !== 'rejected' ? `<button type="button" class="btn-action btn-action--reject" data-action="quick-reject" data-id="${rev.id}">Reject</button>` : ''}
      </td>
    `;

    reviewsTableBody.appendChild(tr);
  });
}

function renderRecentOverview() {
  if (!overviewRecentList) return;
  const recent = allReviews.slice(0, 5);

  if (recent.length === 0) {
    overviewRecentList.innerHTML = '<p style="color:#64748B;">No review submissions yet.</p>';
    return;
  }

  overviewRecentList.innerHTML = '';
  recent.forEach(rev => {
    const item = document.createElement('div');
    item.style.padding = '12px 0';
    item.style.borderBottom = '1px solid #F1F5F9';
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';
    item.style.gap = '12px';

    item.innerHTML = `
      <div style="min-width:0;">
        <div style="display:flex; align-items:center; gap:8px;">
          <strong style="color:var(--admin-navy); font-size:0.9rem;">${escapeHtml(rev.name || 'Anonymous')}</strong>
          <span style="color:#F5A900; font-size:0.85rem;">${renderStars(rev.rating)}</span>
          ${getStatusBadge(rev.status)}
        </div>
        <p style="margin:4px 0 0; color:#475569; font-size:0.8125rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:550px;">
          “${escapeHtml(rev.comment || '')}”
        </p>
      </div>
      <div style="flex-shrink:0;">
        <button type="button" class="btn-action btn-action--view" data-action="view" data-id="${rev.id}">Inspect</button>
      </div>
    `;
    overviewRecentList.appendChild(item);
  });
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ==========================================================================
   5. TABLE ACTIONS & EVENT LISTENERS
   ========================================================================== */

// Filter Pills
filterPills.forEach(pill => {
  pill.addEventListener('click', () => {
    filterPills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentFilter = pill.getAttribute('data-status-filter') || 'all';
    renderReviewsTable();
  });
});

// Search input
if (searchInput) {
  searchInput.addEventListener('input', () => {
    currentSearch = searchInput.value.trim();
    renderReviewsTable();
  });
}

// Star filter
if (starFilterSelect) {
  starFilterSelect.addEventListener('change', () => {
    currentStarFilter = starFilterSelect.value;
    renderReviewsTable();
  });
}

// Sort select
if (sortSelect) {
  sortSelect.addEventListener('change', () => {
    currentSort = sortSelect.value;
    renderReviewsTable();
  });
}

// Seed sample reviews
if (seedSamplesBtn) {
  seedSamplesBtn.addEventListener('click', async () => {
    seedSamplesBtn.disabled = true;
    seedSamplesBtn.textContent = 'Seeding...';
    try {
      await seedInitialDataIfEmpty();
      await refreshReviews();
    } catch (err) {
      alert('Error seeding sample reviews: ' + err.message);
    } finally {
      seedSamplesBtn.disabled = false;
      seedSamplesBtn.textContent = 'Seed 3 Sample Reviews';
    }
  });
}

// Quick action buttons delegation in table & overview list
function handleTableActionClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.getAttribute('data-action');
  const id = btn.getAttribute('data-id');
  const review = allReviews.find(r => r.id === id);
  if (!review) return;

  if (action === 'view') {
    openDetailModal(review);
  } else if (action === 'quick-approve') {
    quickUpdateStatus(id, 'approved', btn);
  } else if (action === 'quick-reject') {
    quickUpdateStatus(id, 'rejected', btn);
  }
}

if (reviewsTableBody) reviewsTableBody.addEventListener('click', handleTableActionClick);
if (overviewRecentList) overviewRecentList.addEventListener('click', handleTableActionClick);

async function quickUpdateStatus(reviewId, newStatus, btn) {
  if (btn) {
    btn.disabled = true;
    btn.textContent = '...';
  }
  try {
    await updateReviewAdminState(reviewId, { status: newStatus });
    const match = allReviews.find(r => r.id === reviewId);
    if (match) match.status = newStatus;
    updateStatsAndPills();
    renderReviewsTable();
    renderRecentOverview();
  } catch (err) {
    alert('Failed to update review status: ' + err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* ==========================================================================
   6. REVIEW DETAIL & MODERATION MODAL
   ========================================================================== */

function openDetailModal(review) {
  selectedReview = review;
  if (!reviewModal) return;

  modalReviewerName.textContent = review.name || 'Anonymous Reviewer';
  modalRating.textContent = renderStars(review.rating);
  modalStatusBadge.innerHTML = getStatusBadge(review.status);
  modalComment.textContent = `“${review.comment || ''}”`;
  modalEmail.value = review.email || '—';

  const metaParts = [];
  if (review.role) metaParts.push(review.role);
  if (review.institution) metaParts.push(review.institution);
  modalRole.value = metaParts.join(' · ') || '—';

  modalAdminNote.value = review.adminNote || '';
  modalVerifiedCheckbox.checked = Boolean(review.verified);

  reviewModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeDetailModal() {
  if (!reviewModal) return;
  reviewModal.hidden = true;
  document.body.style.overflow = '';
  selectedReview = null;
}

if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeDetailModal);

if (reviewModal) {
  reviewModal.addEventListener('click', (e) => {
    if (e.target === reviewModal) closeDetailModal();
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && reviewModal && !reviewModal.hidden) {
    closeDetailModal();
  }
});

// Modal Actions
if (modalApproveBtn) {
  modalApproveBtn.addEventListener('click', async () => {
    if (!selectedReview) return;
    modalApproveBtn.disabled = true;
    modalApproveBtn.textContent = 'Approving...';
    try {
      await updateReviewAdminState(selectedReview.id, {
        status: 'approved',
        verified: modalVerifiedCheckbox.checked,
        adminNote: modalAdminNote.value
      });
      selectedReview.status = 'approved';
      selectedReview.verified = modalVerifiedCheckbox.checked;
      selectedReview.adminNote = modalAdminNote.value;
      closeDetailModal();
      updateStatsAndPills();
      renderReviewsTable();
      renderRecentOverview();
    } catch (err) {
      alert('Failed to approve review: ' + err.message);
    } finally {
      modalApproveBtn.disabled = false;
      modalApproveBtn.textContent = 'Approve Review';
    }
  });
}

if (modalRejectBtn) {
  modalRejectBtn.addEventListener('click', async () => {
    if (!selectedReview) return;
    modalRejectBtn.disabled = true;
    modalRejectBtn.textContent = 'Rejecting...';
    try {
      await updateReviewAdminState(selectedReview.id, {
        status: 'rejected',
        verified: modalVerifiedCheckbox.checked,
        adminNote: modalAdminNote.value
      });
      selectedReview.status = 'rejected';
      selectedReview.verified = modalVerifiedCheckbox.checked;
      selectedReview.adminNote = modalAdminNote.value;
      closeDetailModal();
      updateStatsAndPills();
      renderReviewsTable();
      renderRecentOverview();
    } catch (err) {
      alert('Failed to reject review: ' + err.message);
    } finally {
      modalRejectBtn.disabled = false;
      modalRejectBtn.textContent = 'Reject Review';
    }
  });
}

if (modalDeleteBtn) {
  modalDeleteBtn.addEventListener('click', async () => {
    if (!selectedReview) return;
    const confirmDelete = confirm(`Are you sure you want to permanently delete the review from "${selectedReview.name}"?`);
    if (!confirmDelete) return;

    modalDeleteBtn.disabled = true;
    modalDeleteBtn.textContent = 'Deleting...';
    try {
      await deleteReviewById(selectedReview.id);
      allReviews = allReviews.filter(r => r.id !== selectedReview.id);
      closeDetailModal();
      updateStatsAndPills();
      renderReviewsTable();
      renderRecentOverview();
    } catch (err) {
      alert('Failed to delete review: ' + err.message);
    } finally {
      modalDeleteBtn.disabled = false;
      modalDeleteBtn.textContent = 'Delete';
    }
  });
}

/* ==========================================================================
   7. PRODUCT PRICING CONTROLLER (STATIC PRICING)
   ========================================================================== */

if (pricingForm) {
  pricingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Website price is managed statically in the website code ($49). Dynamic Firestore pricing has been removed.');
  });
}
