// ===== Utility helpers =====

// Format ISO timestamp to Vietnamese relative time
function timeAgo(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;

  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Escape HTML to prevent XSS
function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// Source type icon + label
function sourceIcon(sourceType) {
  const map = {
    facebook_page: { icon: '📘', label: 'Facebook' },
    website: { icon: '🌐', label: 'Website' },
    rss: { icon: '📡', label: 'RSS' }
  };
  return map[sourceType] || { icon: '📄', label: 'Nguồn' };
}

// Status badge HTML
function statusBadgeHtml(status, publishedUrl) {
  const map = {
    raw: '<span class="badge badge-raw">○ Mới</span>',
    rewritten: '<span class="badge badge-rewritten">✎ Đã viết lại</span>',
    has_image: '<span class="badge badge-has_image">🖼 Có ảnh</span>',
    published: '<span class="badge badge-published">✓ Đã đăng</span>'
  };

  let html = map[status] || map['raw'];

  // Show all applicable badges based on data
  return html;
}

// Build full badge row based on post state
function buildBadges(post) {
  const badges = [];

  if (post.published_url) {
    badges.push(`<span class="badge badge-published">✓ Đã đăng</span>`);
  } else if (post.generated_image) {
    badges.push(`<span class="badge badge-has_image">🖼 Có ảnh</span>`);
    if (post.rewritten_content) {
      badges.push(`<span class="badge badge-rewritten">✎ Đã viết lại</span>`);
    }
  } else if (post.rewritten_content) {
    badges.push(`<span class="badge badge-rewritten">✎ Đã viết lại</span>`);
  } else {
    badges.push(`<span class="badge badge-raw">○ Mới</span>`);
  }

  if (post.published_url) {
    badges.push(`<a href="${escHtml(post.published_url)}" target="_blank" class="published-link">↗ Xem bài đăng</a>`);
  }

  return badges.join('');
}

// Toast notification
const _toastTimers = {};
function toast(message, type = 'info', duration = 3500, html = false) {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  if (html) {
    el.innerHTML = message;
  } else {
    el.textContent = message;
  }
  container.appendChild(el);

  const id = Date.now();
  _toastTimers[id] = setTimeout(() => {
    el.classList.add('hiding');
    setTimeout(() => el.remove(), 220);
  }, duration);

  return el;
}

// Confirm modal
function confirmModal(header, body) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modalOverlay');
    document.getElementById('modalHeader').textContent = header;
    document.getElementById('modalBody').textContent = body;
    overlay.style.display = 'flex';

    const onConfirm = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };

    const confirmBtn = document.getElementById('modalConfirm');
    const cancelBtn = document.getElementById('modalCancel');

    function cleanup() {
      overlay.style.display = 'none';
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onOverlay);
    }

    function onOverlay(e) {
      if (e.target === overlay) onCancel();
    }

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onOverlay);
  });
}

// Set button loading state
function setBtnLoading(btn, isLoading, label = '') {
  if (isLoading) {
    btn.disabled = true;
    btn.classList.add('btn-loading');
    if (label) {
      btn.dataset.origLabel = btn.innerHTML;
      btn.innerHTML = `<span class="btn-icon-spin">⟳</span> ${label}`;
    }
  } else {
    btn.disabled = false;
    btn.classList.remove('btn-loading');
    if (btn.dataset.origLabel) {
      btn.innerHTML = btn.dataset.origLabel;
      delete btn.dataset.origLabel;
    }
  }
}

// Debounce helper
function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}
