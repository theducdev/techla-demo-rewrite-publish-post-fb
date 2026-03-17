// ===== Content Pipeline — Main App =====

// ---- State ----
const state = {
  posts: [],         // array of post objects
  expandedIds: new Set(),
  activeTabIds: {}   // id -> 'original' | 'rewritten'
};

// ---- DOM refs ----
const $ = id => document.getElementById(id);
const emptyState = $('emptyState');
const skeletonGrid = $('skeletonGrid');
const cardGrid = $('cardGrid');
const toolbar = $('toolbar');
const toolbarCount = $('toolbarCount');
const scrapeStatus = $('scrapeStatus');
const content = document.querySelector('.content');

// ---- Boot ----
document.addEventListener('DOMContentLoaded', () => {
  bindScrapeBtn();
  bindDemoBtn();
  bindBatchButtons();
  bindKeyboard();
  loadPersistedPosts();
});

// ---- Persist posts across page reload (sessionStorage) ----
function loadPersistedPosts() {
  try {
    const saved = sessionStorage.getItem('cp_posts');
    if (saved) {
      const posts = JSON.parse(saved);
      if (posts && posts.length) {
        state.posts = posts;
        renderAll();
        return;
      }
    }
  } catch (e) {}
  // Show empty state
  showEmpty();
}

function persistPosts() {
  try {
    sessionStorage.setItem('cp_posts', JSON.stringify(state.posts));
  } catch (e) {}
}

// ---- Scrape button ----
function bindScrapeBtn() {
  const btn = $('scrapeBtn');
  btn.addEventListener('click', handleScrape);

  $('sourceUrl').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleScrape();
  });

  $('sourceUrl').addEventListener('input', () => {
    const url = $('sourceUrl').value.trim().toLowerCase();
    const sel = $('sourceType');
    if (!url) return;
    if (url.includes('facebook.com')) {
      sel.value = 'facebook_page';
    } else if (url.match(/\/(rss|feed)(\/|$)/) || url.endsWith('.rss') || url.endsWith('.xml')) {
      sel.value = 'rss';
    } else if (url.startsWith('http')) {
      sel.value = 'website';
    }
  });
}

async function handleScrape() {
  const btn = $('scrapeBtn');
  const sourceUrl = $('sourceUrl').value.trim();
  const sourceType = $('sourceType').value;
  const limit = parseInt($('limitInput').value) || 10;

  setBtnLoading(btn, true, 'Đang cào...');
  setStatus('⟳ Đang cào dữ liệu...');
  showSkeleton();

  try {
    const res = await API.scrape({ source_type: sourceType, source_url: sourceUrl, limit });
    state.posts = res.data;
    persistPosts();
    renderAll();
    setStatus(`✓ Đã cào ${res.total} bài`);
    toast(`Đã tải ${res.total} bài viết`, 'success');
  } catch (err) {
    hideSkeleton();
    setStatus('✗ Lỗi cào dữ liệu');
    toast(`Lỗi: ${err.message}`, 'error', 5000);
  } finally {
    setBtnLoading(btn, false);
  }
}

// ---- Demo button ----
function bindDemoBtn() {
  const btn = $('loadDemoBtn');
  if (btn) {
    btn.addEventListener('click', handleScrape);
  }
}

// ---- Batch actions ----
function bindBatchButtons() {
  $('batchRewriteBtn').addEventListener('click', handleBatchRewrite);
  $('batchPublishBtn').addEventListener('click', handleBatchPublish);
}

async function handleBatchRewrite() {
  const btn = $('batchRewriteBtn');
  const rawPosts = state.posts.filter(p => !p.rewritten_content);
  if (!rawPosts.length) {
    toast('Không có bài nào cần viết lại', 'warning');
    return;
  }

  const ok = await confirmModal('Viết lại tất cả', `Viết lại ${rawPosts.length} bài chưa được xử lý?`);
  if (!ok) return;

  setBtnLoading(btn, true, 'Đang viết lại...');

  let done = 0;
  for (const post of rawPosts) {
    try {
      await doRewrite(post.id);
      done++;
      setStatus(`✎ Đang viết lại... ${done}/${rawPosts.length}`);
    } catch (e) {
      console.error('batch rewrite error', e);
    }
    // small delay to avoid hammering API
    await new Promise(r => setTimeout(r, 400));
  }

  setBtnLoading(btn, false);
  toast(`Đã viết lại ${done}/${rawPosts.length} bài`, 'success');
  setStatus(`✓ Hoàn thành viết lại ${done} bài`);
}

async function handleBatchPublish() {
  const rewrittenPosts = state.posts.filter(p => p.rewritten_content && p.status !== 'published');
  if (!rewrittenPosts.length) {
    toast('Không có bài nào đã viết lại để đăng', 'warning');
    return;
  }

  const ok = await confirmModal('Đăng tất cả', `Đăng ${rewrittenPosts.length} bài đã viết lại lên Facebook Page?`);
  if (!ok) return;

  const btn = $('batchPublishBtn');
  setBtnLoading(btn, true, 'Đang đăng...');

  let done = 0;
  for (const post of rewrittenPosts) {
    try {
      await doPublish(post.id);
      done++;
      setStatus(`📤 Đang đăng... ${done}/${rewrittenPosts.length}`);
    } catch (e) {
      console.error('batch publish error', e);
    }
    await new Promise(r => setTimeout(r, 600));
  }

  setBtnLoading(btn, false);
  toast(`Đã đăng ${done}/${rewrittenPosts.length} bài`, 'success');
  setStatus(`✓ Đã đăng ${done} bài`);
}

// ---- Keyboard shortcuts ----
function bindKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.id === 'sourceUrl') {
      e.preventDefault();
      handleScrape();
    }
  });
}

// ---- Render ----
function renderAll() {
  hideSkeleton();
  hideEmpty();
  updateToolbar();

  cardGrid.style.display = 'grid';
  cardGrid.innerHTML = '';

  state.posts.forEach(post => {
    const card = buildCard(post);
    cardGrid.appendChild(card);
  });

  content.classList.add('with-toolbar');
}

function buildCard(post) {
  const { id, source, source_type, timestamp, title, content: postContent,
    images, generated_image, rewritten_content, published_url, status } = post;

  const { icon: srcIcon } = sourceIcon(source_type);
  const tab = state.activeTabIds[id] || 'original';
  const isExpanded = state.expandedIds.has(id);
  const displayImage = generated_image || (images && images[0]);
  const hasOriginalImage = images && images[0];
  const hasGenImage = !!generated_image;

  const card = document.createElement('article');
  card.className = 'card';
  card.dataset.id = id;

  card.innerHTML = `
    <!-- Header -->
    <div class="card-header">
      <div class="card-source-icon">${srcIcon}</div>
      <span class="card-source" title="${escHtml(source)}">${escHtml(source)}</span>
      <span class="card-time">${timeAgo(timestamp)}</span>
    </div>

    <!-- Image -->
    <div class="card-image ${displayImage ? '' : 'no-image'}" data-img-container>
      ${displayImage ? `<img src="${escHtml(displayImage)}" alt="Ảnh bài viết" loading="lazy" />` : ''}
      ${hasOriginalImage && hasGenImage ? `
        <div class="card-image-toggle">
          <button class="img-toggle-btn ${generated_image ? '' : 'active'}" data-img-toggle="original">Gốc</button>
          <button class="img-toggle-btn ${generated_image ? 'active' : ''}" data-img-toggle="generated">Đã gen</button>
        </div>` : ''}
    </div>

    <!-- Body -->
    <div class="card-body">
      ${title ? `<div class="card-title">${escHtml(title)}</div>` : ''}

      <!-- Tabs -->
      <div class="card-tabs">
        <div class="card-tabs-nav">
          <button class="tab-btn ${tab === 'original' ? 'active' : ''}" data-tab="original">Gốc</button>
          <button class="tab-btn ${tab === 'rewritten' ? 'active' : ''}" data-tab="rewritten">Viết lại${rewritten_content ? '' : ''}</button>
        </div>
        <div class="tab-content">
          <!-- Original tab -->
          <div class="tab-pane ${tab === 'original' ? 'active' : ''}" data-pane="original">
            <p class="content-text ${isExpanded ? '' : 'truncated'}" data-content-text>${escHtml(postContent)}</p>
            <button class="expand-btn" data-expand>${isExpanded ? 'Thu gọn ↑' : 'Xem thêm ↓'}</button>
          </div>
          <!-- Rewritten tab -->
          <div class="tab-pane ${tab === 'rewritten' ? 'active' : ''}" data-pane="rewritten">
            ${rewritten_content
              ? `<p class="content-text" contenteditable="true" data-rewritten-text data-id="${id}">${escHtml(rewritten_content)}</p>`
              : `<div class="rewrite-placeholder">
                  <div>Chưa có nội dung viết lại</div>
                  <button class="rewrite-placeholder-btn" data-quick-rewrite>✏️ Bấm để viết lại ngay</button>
                </div>`
            }
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="card-footer">
      <div class="card-badges" data-badges>${buildBadges(post)}</div>
      <div class="card-actions">
        <button class="btn btn-secondary btn-card" data-action="rewrite" ${published_url ? 'disabled' : ''}>
          <span class="btn-icon-static">✏️</span>
          <span class="btn-icon-spin">⟳</span>
          <span class="btn-label">Viết lại</span>
        </button>
        <button class="btn btn-secondary btn-card" data-action="genimage" ${published_url ? 'disabled' : ''}>
          <span class="btn-icon-static">🖼</span>
          <span class="btn-icon-spin">⟳</span>
          <span class="btn-label">Gen ảnh</span>
        </button>
        <button class="btn btn-primary btn-card" data-action="publish" ${!rewritten_content || published_url ? 'disabled' : ''}>
          <span class="btn-icon-static">📤</span>
          <span class="btn-icon-spin">⟳</span>
          <span class="btn-label">${published_url ? 'Đã đăng' : 'Đăng bài'}</span>
        </button>
      </div>
    </div>
  `;

  // Bind events for this card
  bindCardEvents(card, post);
  return card;
}

function bindCardEvents(card, post) {
  const id = post.id;

  // Tab switching
  card.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeTabIds[id] = btn.dataset.tab;
      updateCardTabs(card, btn.dataset.tab);
    });
  });

  // Expand/collapse
  card.querySelector('[data-expand]').addEventListener('click', e => {
    const expanded = state.expandedIds.has(id);
    if (expanded) {
      state.expandedIds.delete(id);
    } else {
      state.expandedIds.add(id);
    }
    const txt = card.querySelector('[data-content-text]');
    const btn = e.currentTarget;
    txt.classList.toggle('truncated', !state.expandedIds.has(id));
    btn.textContent = state.expandedIds.has(id) ? 'Thu gọn ↑' : 'Xem thêm ↓';
  });

  // Quick rewrite from placeholder
  const quickBtn = card.querySelector('[data-quick-rewrite]');
  if (quickBtn) {
    quickBtn.addEventListener('click', () => handleRewriteBtn(card, id));
  }

  // Image toggle
  card.querySelectorAll('[data-img-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const which = btn.dataset.imgToggle;
      const post = getPost(id);
      if (!post) return;
      const imgEl = card.querySelector('[data-img-container] img');
      if (imgEl) {
        imgEl.src = which === 'generated' ? post.generated_image : (post.images[0] || '');
      }
      card.querySelectorAll('[data-img-toggle]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Action buttons
  card.querySelector('[data-action="rewrite"]').addEventListener('click', () => handleRewriteBtn(card, id));
  card.querySelector('[data-action="genimage"]').addEventListener('click', () => handleGenImageBtn(card, id));
  card.querySelector('[data-action="publish"]').addEventListener('click', () => handlePublishBtn(card, id));

  // Save edits on blur
  const rewrittenEl = card.querySelector('[data-rewritten-text]');
  if (rewrittenEl) {
    rewrittenEl.addEventListener('blur', () => {
      const newText = rewrittenEl.textContent.trim();
      updatePost(id, { rewritten_content: newText });
    });
  }
}

// ---- Card action handlers ----
async function handleRewriteBtn(card, id) {
  const post = getPost(id);
  if (!post) return;

  const btn = card.querySelector('[data-action="rewrite"]');
  setBtnLoading(btn, true, 'Đang viết lại...');

  try {
    await doRewrite(id);
    // Re-render card
    refreshCard(id);
    toast('Đã viết lại xong!', 'success');
  } catch (err) {
    toast(`Lỗi viết lại: ${err.message}`, 'error');
  } finally {
    setBtnLoading(btn, false);
  }
}

async function handleGenImageBtn(card, id) {
  const post = getPost(id);
  if (!post) return;

  const btn = card.querySelector('[data-action="genimage"]');
  setBtnLoading(btn, true, 'Đang gen ảnh...');

  try {
    const content = post.rewritten_content || post.content;
    const res = await API.generateImage({ id, content, style: 'realistic' });
    updatePost(id, { generated_image: res.data.generated_image, status: res.data.status });
    persistPosts();
    refreshCard(id);
    toast('Đã tạo ảnh thành công!', 'success');
  } catch (err) {
    toast(`Lỗi gen ảnh: ${err.message}`, 'error');
  } finally {
    setBtnLoading(btn, false);
  }
}

async function handlePublishBtn(card, id) {
  const post = getPost(id);
  if (!post || !post.rewritten_content) {
    toast('Cần viết lại nội dung trước khi đăng', 'warning');
    return;
  }

  const ok = await confirmModal(
    'Xác nhận đăng bài',
    `Đăng bài này lên Facebook Page?\n\nNội dung sẽ được đăng bằng phiên bản đã viết lại.`
  );
  if (!ok) return;

  const btn = card.querySelector('[data-action="publish"]');
  setBtnLoading(btn, true, 'Đang đăng...');

  try {
    await doPublish(id);
    refreshCard(id);
    const published = getPost(id);
    const url = published && published.published_url;
    if (url) {
      toast(`Đã đăng bài thành công! &nbsp;<a href="${escHtml(url)}" target="_blank" style="color:#fff;text-decoration:underline;font-weight:600;">↗ Xem bài đăng</a>`, 'success', 6000, true);
    } else {
      toast('Đã đăng bài thành công!', 'success');
    }
  } catch (err) {
    toast(`Lỗi đăng bài: ${err.message}`, 'error');
  } finally {
    setBtnLoading(btn, false);
  }
}

// ---- Core operations (reusable for batch) ----
async function doRewrite(id) {
  const post = getPost(id);
  if (!post) throw new Error('Không tìm thấy bài');
  const res = await API.rewrite({ id, content: post.content, style: 'professional' });
  updatePost(id, { rewritten_content: res.data.rewritten_content, status: 'rewritten' });
  persistPosts();
}

async function doPublish(id) {
  const post = getPost(id);
  if (!post) throw new Error('Không tìm thấy bài');

  // Get latest rewritten content (may have been edited by user)
  const card = cardGrid.querySelector(`[data-id="${id}"]`);
  let content = post.rewritten_content;
  if (card) {
    const editEl = card.querySelector('[data-rewritten-text]');
    if (editEl) content = editEl.textContent.trim() || content;
  }

  const res = await API.publish({
    id,
    content,
    image_url: post.generated_image || null
  });
  updatePost(id, { status: 'published', published_url: res.data.published_url });
  persistPosts();
}

// ---- State helpers ----
function getPost(id) {
  return state.posts.find(p => p.id === id);
}

function updatePost(id, changes) {
  const idx = state.posts.findIndex(p => p.id === id);
  if (idx === -1) return;
  state.posts[idx] = { ...state.posts[idx], ...changes };
}

// Re-render a single card in-place
function refreshCard(id) {
  const post = getPost(id);
  if (!post) return;

  const existing = cardGrid.querySelector(`[data-id="${id}"]`);
  if (!existing) return;

  const newCard = buildCard(post);
  cardGrid.replaceChild(newCard, existing);

  updateToolbar();
}

// ---- Tab helpers ----
function updateCardTabs(card, activeTab) {
  card.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === activeTab);
  });
  card.querySelectorAll('.tab-pane').forEach(p => {
    p.classList.toggle('active', p.dataset.pane === activeTab);
  });
}

// ---- Toolbar ----
function updateToolbar() {
  const total = state.posts.length;
  if (total === 0) {
    toolbar.style.display = 'none';
    content.classList.remove('with-toolbar');
    return;
  }

  toolbar.style.display = 'flex';
  content.classList.add('with-toolbar');

  const rewritten = state.posts.filter(p => p.rewritten_content).length;
  const published = state.posts.filter(p => p.published_url).length;
  toolbarCount.textContent = `${total} bài · ${rewritten} đã viết lại · ${published} đã đăng`;
}

// ---- Status ----
function setStatus(msg) {
  scrapeStatus.textContent = msg;
}

// ---- Show/hide states ----
function showSkeleton() {
  emptyState.style.display = 'none';
  cardGrid.style.display = 'none';
  skeletonGrid.style.display = 'grid';
}

function hideSkeleton() {
  skeletonGrid.style.display = 'none';
}

function showEmpty() {
  emptyState.style.display = 'flex';
  cardGrid.style.display = 'none';
  skeletonGrid.style.display = 'none';
}

function hideEmpty() {
  emptyState.style.display = 'none';
}
