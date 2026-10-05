/**
 * Academic AI Toolkit — Public Website Reviews Integration
 */

import {
  getApprovedReviews,
  submitUserReview,
  sanitizeString
} from './firebase-client.js';

(function () {
  'use strict';

  // Fallback demo reviews to ensure pristine visual display if database is freshly started
  const FALLBACK_SAMPLE_REVIEWS = [
    {
      id: "sample_1",
      name: "Dr. Sarah Wilson",
      role: "PhD Researcher & Lecturer",
      institution: "Life Sciences Department",
      rating: 5,
      comment: "Cut my syllabus and course preparation time in half. Having 2,360 discipline-specific prompts already structured means I customize instead of starting every AI prompt from zero. An indispensable toolkit for faculty.",
      verified: false,
      isSample: true,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: "sample_2",
      name: "Prof. Michael Chen",
      role: "Associate Professor",
      institution: "School of Business & Economics",
      rating: 5,
      comment: "The Notion workspace and Google Sheets format make it effortless to organize prompts across grant applications, literature reviews, and journal submission responses. Genuinely built for academic work, not generic chatbot fluff.",
      verified: false,
      isSample: true,
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString()
    },
    {
      id: "sample_3",
      name: "Elena Rostova",
      role: "Teaching Assistant & Doctoral Candidate",
      institution: "Graduate School of Humanities",
      rating: 5,
      comment: "As a teaching assistant juggling course grading, student feedback, and dissertation writing, the assessment and feedback modules alone were worth tenfold. Clear prompt scaffolding, highly recommended!",
      verified: false,
      isSample: true,
      createdAt: new Date(Date.now() - 86400000 * 12).toISOString()
    }
  ];

  /* ========================================================================
     PUBLIC REVIEWS LOADING & RENDERING
     ======================================================================== */
  function formatReviewDate(isoString) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  }

  function renderStars(rating) {
    const num = Math.min(Math.max(Math.round(rating || 5), 1), 5);
    return '★'.repeat(num) + '☆'.repeat(5 - num);
  }

  function createReviewCard(review) {
    const card = document.createElement('article');
    card.className = 'review-card card';

    const topBar = document.createElement('div');
    topBar.className = 'review-card-top';

    const starsSpan = document.createElement('span');
    starsSpan.className = 'rating-stars';
    starsSpan.setAttribute('aria-label', `${review.rating || 5} out of 5 stars`);
    starsSpan.textContent = renderStars(review.rating);
    topBar.appendChild(starsSpan);

    // Badges container
    const badgeContainer = document.createElement('div');
    badgeContainer.style.display = 'flex';
    badgeContainer.style.gap = '6px';
    badgeContainer.style.alignItems = 'center';

    if (review.verified) {
      const badge = document.createElement('span');
      badge.className = 'badge-verified';
      badge.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Verified User`;
      badgeContainer.appendChild(badge);
    }

    if (review.isSample) {
      const sampleBadge = document.createElement('span');
      sampleBadge.className = 'badge-sample';
      sampleBadge.textContent = 'Sample';
      badgeContainer.appendChild(sampleBadge);
    }

    topBar.appendChild(badgeContainer);
    card.appendChild(topBar);

    // Review comment
    const p = document.createElement('p');
    p.textContent = `“${review.comment || ''}”`;
    card.appendChild(p);

    // Reviewer metadata footer
    const reviewerDiv = document.createElement('div');
    reviewerDiv.className = 'reviewer';

    const infoDiv = document.createElement('div');
    infoDiv.className = 'reviewer-info';

    const strong = document.createElement('strong');
    strong.textContent = review.name || 'Academic User';
    infoDiv.appendChild(strong);

    const metaParts = [];
    if (review.role) metaParts.push(review.role);
    if (review.institution) metaParts.push(review.institution);
    if (metaParts.length > 0) {
      const span = document.createElement('span');
      span.textContent = metaParts.join(' · ');
      infoDiv.appendChild(span);
    }
    reviewerDiv.appendChild(infoDiv);

    if (review.createdAt) {
      const dateSpan = document.createElement('span');
      dateSpan.className = 'review-date';
      dateSpan.textContent = formatReviewDate(review.createdAt);
      reviewerDiv.appendChild(dateSpan);
    }

    card.appendChild(reviewerDiv);
    return card;
  }

  async function loadPublicReviews() {
    const container = document.getElementById('public-reviews-container');
    if (!container) return;

    try {
      const reviews = await getApprovedReviews();
      const displayList = (reviews && reviews.length > 0) ? reviews : FALLBACK_SAMPLE_REVIEWS;

      container.innerHTML = '';
      displayList.forEach(rev => {
        container.appendChild(createReviewCard(rev));
      });

      // Update summary rating score
      const scoreEl = document.getElementById('summary-avg-rating');
      const countEl = document.getElementById('summary-review-count');
      if (scoreEl && countEl && displayList.length > 0) {
        const total = displayList.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
        const avg = (total / displayList.length).toFixed(1);
        scoreEl.textContent = avg;
        countEl.textContent = 'Based on customer feedback';
      }
    } catch (err) {
      console.warn('[Academic AI Toolkit] Error loading reviews, rendering samples:', err);
      container.innerHTML = '';
      FALLBACK_SAMPLE_REVIEWS.forEach(rev => {
        container.appendChild(createReviewCard(rev));
      });
    }
  }

  /* ========================================================================
     3. USER FEEDBACK / REVIEW MODAL CONTROLLER
     ======================================================================== */
  function initReviewModal() {
    const modal = document.getElementById('review-modal');
    const openBtn = document.getElementById('open-review-modal-btn');
    const closeBtn = document.getElementById('close-review-modal-btn');
    const cancelBtn = document.getElementById('cancel-review-modal-btn');
    const form = document.getElementById('review-submission-form');
    const successView = document.getElementById('review-success-view');
    const closeSuccessBtn = document.getElementById('close-success-btn');
    const alertBox = document.getElementById('review-form-alert');
    const charCount = document.getElementById('comment-char-count');
    const textarea = document.getElementById('review-comment');
    const submitBtn = document.getElementById('submit-review-btn');
    const ratingInput = document.getElementById('review-rating');
    const ratingLabel = document.getElementById('rating-label-desc');
    const starBtns = document.querySelectorAll('.star-rating-picker .star-btn');

    if (!modal) return;

    const ratingDescriptions = {
      1: "1 - Poor",
      2: "2 - Fair",
      3: "3 - Good",
      4: "4 - Very Good",
      5: "5 - Excellent"
    };

    function openModal() {
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      if (form) form.hidden = false;
      if (successView) successView.hidden = true;
      if (alertBox) alertBox.hidden = true;
      const nameInput = document.getElementById('review-name');
      if (nameInput) setTimeout(() => nameInput.focus(), 80);
    }

    function closeModal() {
      modal.hidden = true;
      document.body.style.overflow = '';
      if (form) form.reset();
      updateStarPicker(5);
      if (charCount) charCount.textContent = '0 / 1500';
    }

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (closeSuccessBtn) closeSuccessBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) closeModal();
    });

    // Character counter for textarea
    if (textarea && charCount) {
      textarea.addEventListener('input', () => {
        const len = textarea.value.length;
        charCount.textContent = `${len} / 1500`;
        charCount.style.color = len > 1400 ? '#DC2626' : '';
      });
    }

    // Interactive Star Rating Picker
    function updateStarPicker(val) {
      if (ratingInput) ratingInput.value = val;
      if (ratingLabel) ratingLabel.textContent = ratingDescriptions[val] || `${val} Stars`;
      starBtns.forEach(btn => {
        const btnVal = Number(btn.getAttribute('data-value'));
        btn.classList.toggle('active', btnVal <= val);
        btn.classList.remove('hover-active');
      });
    }

    starBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = Number(btn.getAttribute('data-value'));
        updateStarPicker(val);
      });
      btn.addEventListener('mouseenter', () => {
        const val = Number(btn.getAttribute('data-value'));
        starBtns.forEach(b => {
          const bVal = Number(b.getAttribute('data-value'));
          b.classList.toggle('hover-active', bVal <= val);
        });
      });
      btn.addEventListener('mouseleave', () => {
        starBtns.forEach(b => b.classList.remove('hover-active'));
      });
    });

    // Form Submission
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (alertBox) alertBox.hidden = true;

        const name = document.getElementById('review-name')?.value.trim();
        const email = document.getElementById('review-email')?.value.trim();
        const role = document.getElementById('review-role')?.value.trim();
        const institution = document.getElementById('review-institution')?.value.trim();
        const rating = Number(ratingInput?.value || 5);
        const comment = textarea?.value.trim();

        // Basic front validation
        if (!name || name.length < 2) {
          showAlert('Please enter your full name (minimum 2 characters).');
          return;
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          showAlert('Please enter a valid email address.');
          return;
        }
        if (!comment || comment.length < 10) {
          showAlert('Please provide a comment of at least 10 characters.');
          return;
        }

        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.querySelector('span').textContent = 'Submitting...';
          }

          await submitUserReview({ name, email, role, institution, rating, comment });

          // Transition to success view
          form.hidden = true;
          if (successView) successView.hidden = false;
        } catch (err) {
          showAlert(err.message || 'Error submitting review. Please try again.');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.querySelector('span').textContent = 'Submit Review';
          }
        }
      });
    }

    function showAlert(msg) {
      if (!alertBox) return;
      alertBox.className = 'form-feedback-alert form-feedback-alert--error';
      alertBox.textContent = msg;
      alertBox.hidden = false;
    }
  }

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    loadPublicReviews();
    initReviewModal();
  });

  // Re-run if already loaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    loadPublicReviews();
    initReviewModal();
  }
})();
