// ══════════════════════════════════════
//  FOLIO — Blog CMS Frontend JS
// ══════════════════════════════════════
const API = '/api';
let currentCategory = '';
let currentPage = 1;
let totalPages   = 1;
let allPosts     = [];
let editingId    = null;
let searchQuery  = '';

// ── HELPERS ──
const $  = id => document.getElementById(id);
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

async function apiFetch(url, opts = {}) {
  const res = await fetch(API + url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function readTime(content) {
  const words = (content || '').trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200)) + ' min read';
}

// ── TOAST ──
let toastTimer;
function toast(msg, type = 'success') {
  const el = $('toast');
  el.textContent = msg; el.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.className = 'toast', 3000);
}

// ── STATS (sidebar) ──
async function loadStats() {
  const s = await apiFetch('/stats');
  $('side-stats').innerHTML = `
    <div class="side-stat"><strong>${s.published}</strong>Published</div>
    <div class="side-stat"><strong>${s.drafts}</strong>Drafts</div>
    <div class="side-stat"><strong>${s.views.toLocaleString()}</strong>Views</div>
  `;
}

// ── CATEGORIES ──
async function loadCategories() {
  const cats = await apiFetch('/categories');
  // Pills
  const pills = $('category-pills');
  cats.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'pill'; btn.dataset.category = c; btn.textContent = c;
    btn.onclick = () => setCategory(c);
    pills.appendChild(btn);
  });
  // Side nav
  const sideNav = $('side-categories');
  cats.forEach(c => {
    const a = document.createElement('a');
    a.className = 'side-link'; a.dataset.category = c; a.textContent = c;
    a.onclick = () => { setCategory(c); closeMenu(); };
    sideNav.appendChild(a);
  });
  // Editor select
  const sel = $('ef-category');
  cats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o); });
}

function setCategory(cat) {
  currentCategory = cat; currentPage = 1;
  // pills
  document.querySelectorAll('.pill').forEach(p => p.classList.toggle('active', p.dataset.category === cat));
  // side links
  document.querySelectorAll('.side-link').forEach(l => l.classList.toggle('active', l.dataset.category === cat));
  loadPosts();
}

// ── POSTS ──
async function loadPosts(append = false) {
  const params = new URLSearchParams({
    status: 'all', page: currentPage, per_page: 6,
    ...(currentCategory && { category: currentCategory }),
    ...(searchQuery && { search: searchQuery }),
  });
  const data = await apiFetch(`/posts?${params}`);
  totalPages = data.pages;
  if (!append) allPosts = data.posts; else allPosts = [...allPosts, ...data.posts];

  renderFeatured(currentPage === 1 && !searchQuery && !currentCategory ? data.posts[0] : null);
  renderGrid(append ? data.posts : data.posts.slice(currentPage === 1 && !searchQuery && !currentCategory ? 1 : 0), append);
  $('load-more-wrap').style.display = currentPage < totalPages ? 'block' : 'none';
  $('empty-state').style.display = (data.total === 0) ? 'block' : 'none';
}

function renderFeatured(post) {
  const sec = $('featured-section');
  if (!post) { sec.innerHTML = ''; return; }
  sec.innerHTML = `
    <div class="featured-card" data-id="${post.id}">
      <div class="featured-cover" style="background:${post.cover_color}">
        <div class="featured-cover-inner">
          <span class="featured-label">Featured</span>
        </div>
      </div>
      <div class="featured-body">
        <div class="featured-category">${esc(post.category)}</div>
        <h2 class="featured-title">${esc(post.title)}</h2>
        <p class="featured-excerpt">${esc(post.excerpt || '')}</p>
        <div class="featured-meta">
          <span>${esc(post.author)}</span>
          <span>${formatDate(post.published_at)}</span>
          <span>${readTime(post.content)}</span>
        </div>
      </div>
    </div>`;
  sec.querySelector('.featured-card').onclick = () => openPost(post.id);
}

function renderGrid(posts, append = false) {
  const grid = $('post-grid');
  if (!append) grid.innerHTML = '';
  posts.forEach((post, i) => {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.style.animationDelay = (i * 0.05) + 's';
    card.dataset.id = post.id;
    card.innerHTML = `
      <div class="card-cover-strip" style="background:${post.cover_color}"></div>
      <div class="card-category">${esc(post.category)}</div>
      <h3 class="card-title">${esc(post.title)}</h3>
      <p class="card-excerpt">${esc(post.excerpt || post.content || '')}</p>
      <div class="card-meta">
        <span class="card-author">${esc(post.author)}</span>
        <span>${formatDate(post.published_at || post.created_at)}</span>
        ${post.status === 'draft' ? '<span class="card-draft">Draft</span>' : ''}
      </div>`;
    card.onclick = () => openPost(post.id);
    grid.appendChild(card);
  });
}

// ── SINGLE POST VIEW ──
async function openPost(id) {
  const post = await apiFetch(`/posts/${id}`);
  $('main-view').style.display = 'none';
  $('post-view').style.display  = 'block';
  window.scrollTo(0, 0);

  $('article-content').innerHTML = `
    <div class="article-cover" style="background:${post.cover_color}">
      <div class="article-cover-overlay"></div>
    </div>
    <div class="article-category">${esc(post.category)}</div>
    <h1 class="article-title">${esc(post.title)}</h1>
    ${post.excerpt ? `<p class="article-excerpt">${esc(post.excerpt)}</p>` : ''}
    <div class="article-byline">
      <span class="byline-author">${esc(post.author)}</span>
      <span>${formatDate(post.published_at || post.created_at)}</span>
      <span>${readTime(post.content)}</span>
      <span>${post.views} views</span>
    </div>
    <div class="article-body">${post.content.split('\n\n').map(p => `<p>${esc(p)}</p>`).join('')}</div>
    ${post.tags.length ? `<div class="article-tags">${post.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
    <div class="article-actions">
      <button class="btn-article-action" onclick="openEdit('${post.id}')">Edit Post</button>
      <button class="btn-article-action delete" onclick="deletePost('${post.id}')">Delete</button>
    </div>`;
}

function closePost() {
  $('post-view').style.display  = 'none';
  $('main-view').style.display  = 'block';
  window.scrollTo(0, 0);
}

// ── EDITOR ──
function openEditor(title = 'New Post') {
  $('modal-title').textContent = title;
  $('modal-save').textContent  = editingId ? 'Save Changes' : 'Publish Post';
  $('modal-overlay').classList.add('open');
}
function closeEditor() {
  $('modal-overlay').classList.remove('open');
  editingId = null;
  ['ef-title','ef-excerpt','ef-content','ef-author','ef-tags'].forEach(id => $(id).value = '');
  $('ef-color').value = '#2c3e50';
  $('ef-status').value = 'draft';
}

async function openEdit(id) {
  const post = allPosts.find(p => p.id === id) || await apiFetch(`/posts/${id}`);
  editingId = id;
  $('ef-title').value    = post.title;
  $('ef-excerpt').value  = post.excerpt;
  $('ef-content').value  = post.content;
  $('ef-author').value   = post.author;
  $('ef-category').value = post.category;
  $('ef-color').value    = post.cover_color;
  $('ef-status').value   = post.status;
  $('ef-tags').value     = (post.tags || []).join(', ');
  openEditor('Edit Post');
}
window.openEdit = openEdit;

async function savePost() {
  const title = $('ef-title').value.trim();
  if (!title) { toast('Title is required', 'error'); return; }
  const body = {
    title,
    excerpt:      $('ef-excerpt').value.trim(),
    content:      $('ef-content').value.trim(),
    category:     $('ef-category').value,
    author:       $('ef-author').value.trim() || 'Anonymous',
    cover_color:  $('ef-color').value,
    status:       $('ef-status').value,
    tags:         $('ef-tags').value.split(',').map(t => t.trim()).filter(Boolean),
  };
  try {
    if (editingId) {
      await apiFetch(`/posts/${editingId}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('Post updated');
    } else {
      await apiFetch('/posts', { method: 'POST', body: JSON.stringify(body) });
      toast('Post published');
    }
    closeEditor();
    currentPage = 1;
    await Promise.all([loadPosts(), loadStats()]);
  } catch (err) { toast(err.message, 'error'); }
}

async function deletePost(id) {
  if (!confirm('Delete this post? This cannot be undone.')) return;
  try {
    await apiFetch(`/posts/${id}`, { method: 'DELETE' });
    toast('Post deleted');
    closePost();
    currentPage = 1;
    await Promise.all([loadPosts(), loadStats()]);
  } catch (err) { toast(err.message, 'error'); }
}
window.deletePost = deletePost;

// ── MENU ──
function openMenu()  { $('side-menu').classList.add('open'); $('menu-overlay').classList.add('open'); }
function closeMenu() { $('side-menu').classList.remove('open'); $('menu-overlay').classList.remove('open'); }

// ── SEARCH ──
let searchTimer;
function openSearch()  { $('search-bar').classList.add('open'); $('search-input').focus(); }
function closeSearch() { $('search-bar').classList.remove('open'); searchQuery = ''; $('search-input').value = ''; currentPage = 1; loadPosts(); }

// ── EVENT WIRING ──
$('menu-toggle').onclick = openMenu;
$('menu-close').onclick  = closeMenu;
$('menu-overlay').onclick = closeMenu;
$('search-toggle').onclick = openSearch;
$('search-close').onclick  = closeSearch;
$('home-link').onclick = (e) => { e.preventDefault(); setCategory(''); closePost(); };
$('new-post-btn').onclick = () => { editingId = null; openEditor('New Post'); };
$('modal-close').onclick  = closeEditor;
$('modal-cancel').onclick = closeEditor;
$('modal-save').onclick   = savePost;
$('back-btn').onclick     = closePost;
$('load-more-btn').onclick = () => { currentPage++; loadPosts(true); };

$('search-input').addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = e.target.value.trim();
    currentPage = 1;
    loadPosts();
  }, 320);
});

// Scroll shadow on nav
window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 10);
});

// ── INIT ──
(async () => {
  await Promise.all([loadCategories(), loadStats()]);
  await loadPosts();
})();
