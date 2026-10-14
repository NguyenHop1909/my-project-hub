const STORAGE_KEY = 'my-project-hub-data-v1';
const SETTINGS_KEY = 'my-project-hub-settings-v1';
const CHECK_INTERVAL = 60_000;
const colors = ['#8b5cf6', '#28c6a3', '#f0a94b', '#ec6f8c', '#4ea5f6', '#b6d657'];
const seedProjects = [{
  id: 'welcome', name: 'My Project Hub', url: 'https://github.com/NguyenHop1909/my-project-hub',
  category: 'Cá nhân', status: 'unknown', description: 'Trung tâm quản lý toàn bộ website và sản phẩm số.',
  tech: ['HTML', 'CSS', 'Electron'], color: '#8b5cf6', favorite: true
}];
let projects = loadProjects();
let currentView = 'all';
let selectedColor = colors[0];
let healthBusy = false;
const $ = (id) => document.getElementById(id);
const grid = $('projectGrid');

function loadProjects() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const data = Array.isArray(saved) ? saved : seedProjects;
    return data.map((project) => ({ ...project, status: project.status === 'archived' ? 'archived' : ['online', 'failed', 'unknown'].includes(project.status) ? project.status : 'unknown' }));
  } catch { return seedProjects; }
}
function saveProjects(shouldRender = true) { localStorage.setItem(STORAGE_KEY, JSON.stringify(projects)); if (shouldRender) render(); }
function escapeHtml(value = '') { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
function getInitials(name) { return name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'W'; }
function statusLabel(status) { return { online: 'ONLINE', failed: 'FAILED', checking: 'ĐANG KIỂM TRA', unknown: 'CHƯA KIỂM TRA', archived: 'ĐÃ LƯU TRỮ' }[status] || status; }
function healthMeta(project) {
  if (project.status === 'checking') return '';
  if (project.statusCode) return `${project.statusCode} · ${project.latency || 0}ms`;
  if (project.latency && project.status === 'online') return `${project.latency}ms`;
  return project.lastChecked ? new Date(project.lastChecked).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
}

function render() {
  const query = $('searchInput').value.trim().toLowerCase();
  const category = $('categoryFilter').value;
  const filtered = projects.filter((project) => {
    const matchesView = currentView === 'all' || (currentView === 'favorites' && project.favorite) || (currentView === 'active' && project.status === 'online') || (currentView === 'archived' && project.status === 'archived');
    const haystack = [project.name, project.description, project.category, ...(project.tech || [])].join(' ').toLowerCase();
    return matchesView && (category === 'all' || project.category === category) && haystack.includes(query);
  });
  grid.innerHTML = filtered.map((project) => `<article class="project-card" style="--card-color:${project.color}">
    <div class="card-top"><span class="project-logo">${escapeHtml(getInitials(project.name))}</span><div class="card-menu">
      <button class="${project.favorite ? 'favorite' : ''}" data-action="favorite" data-id="${project.id}" title="Yêu thích">★</button>
      <button data-action="archive" data-id="${project.id}" title="${project.status === 'archived' ? 'Khôi phục' : 'Lưu trữ'}">▣</button>
      <button data-action="edit" data-id="${project.id}" title="Chỉnh sửa">✎</button><button data-action="delete" data-id="${project.id}" title="Xóa">×</button>
    </div></div><h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.description || 'Chưa có mô tả cho dự án này.')}</p>
    <div class="tags">${(project.tech || []).slice(0, 4).map((tech) => `<span class="tag">${escapeHtml(tech)}</span>`).join('')}</div>
    <div class="card-footer"><span class="status ${project.status}">${statusLabel(project.status)} <small class="health-meta">${healthMeta(project)}</small></span><a class="visit-link" href="${escapeHtml(project.url)}" target="_blank" rel="noopener">TRUY CẬP ↗</a></div></article>`).join('');
  $('emptyState').hidden = filtered.length > 0;
  $('totalCount').textContent = projects.filter((project) => project.status !== 'archived').length;
  $('activeCount').textContent = projects.filter((project) => project.status === 'online').length;
  $('failedCount').textContent = projects.filter((project) => project.status === 'failed').length;
  $('monitorMode').textContent = window.hubAPI ? 'DESKTOP · HTTP' : 'WEB · CONNECT';
  updateCategories();
}

function updateCategories() {
  const select = $('categoryFilter'); const value = select.value;
  const categories = [...new Set(projects.map((project) => project.category).filter(Boolean))].sort();
  select.innerHTML = '<option value="all">Tất cả danh mục</option>' + categories.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
  select.value = categories.includes(value) ? value : 'all';
}

async function browserHealthCheck(url) {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 10000); const startedAt = Date.now();
  try { await fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store', signal: controller.signal }); return { ok: true, latency: Date.now() - startedAt }; }
  catch (error) { return { ok: false, latency: Date.now() - startedAt, error: error.name === 'AbortError' ? 'Hết thời gian phản hồi' : 'Không thể kết nối' }; }
  finally { clearTimeout(timeout); }
}
async function checkProject(project) {
  const previousStatus = project.status; project.status = 'checking'; render();
  const result = window.hubAPI?.checkHealth ? await window.hubAPI.checkHealth(project.url) : await browserHealthCheck(project.url);
  project.status = result.ok ? 'online' : 'failed'; project.statusCode = result.statusCode || null; project.latency = result.latency || null; project.healthError = result.error || null; project.lastChecked = new Date().toISOString();
  if (previousStatus === 'online' && project.status === 'failed') {
    toast(`⚠ ${project.name} vừa mất kết nối`);
    if (document.hidden && Notification.permission === 'granted') new Notification('Website gặp sự cố', { body: `${project.name} hiện không thể truy cập.` });
  }
}
async function checkAllHealth(manual = false) {
  if (healthBusy) return; const targets = projects.filter((project) => project.status !== 'archived'); if (!targets.length) return;
  healthBusy = true; $('checkAllBtn').classList.add('checking'); $('checkAllBtn').disabled = true;
  await Promise.allSettled(targets.map(checkProject)); saveProjects();
  healthBusy = false; $('checkAllBtn').classList.remove('checking'); $('checkAllBtn').disabled = false;
  if (manual) { const failed = targets.filter((project) => project.status === 'failed').length; toast(failed ? `${failed} website đang gặp sự cố` : 'Tất cả website đang hoạt động'); }
}

function openModal(project) {
  $('projectForm').reset(); $('projectId').value = project?.id || ''; $('modalTitle').textContent = project ? 'Chỉnh sửa website' : 'Thêm website mới';
  if (project) { $('projectName').value = project.name; $('projectUrl').value = project.url; $('projectCategory').value = project.category; $('projectDescription').value = project.description || ''; $('projectTech').value = (project.tech || []).join(', '); selectedColor = project.color || colors[0]; } else selectedColor = colors[0];
  renderColors(); $('modal').hidden = false; setTimeout(() => $('projectName').focus(), 50);
}
function closeModal() { $('modal').hidden = true; }
function renderColors() { $('colorOptions').innerHTML = colors.map((color) => `<button type="button" class="color-choice ${color === selectedColor ? 'selected' : ''}" style="background:${color}" data-color="${color}" aria-label="Chọn màu ${color}"></button>`).join(''); }
function toast(message) { const el = $('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2600); }

$('projectForm').addEventListener('submit', (event) => {
  event.preventDefault(); const id = $('projectId').value; const existing = projects.find((project) => project.id === id);
  const data = { ...existing, id: id || crypto.randomUUID(), name: $('projectName').value.trim(), url: $('projectUrl').value.trim(), category: $('projectCategory').value.trim(), status: existing?.status === 'archived' ? 'archived' : 'unknown', description: $('projectDescription').value.trim(), tech: $('projectTech').value.split(',').map((value) => value.trim()).filter(Boolean), color: selectedColor, favorite: existing?.favorite || false, lastChecked: null, statusCode: null, latency: null };
  if (id) projects = projects.map((project) => project.id === id ? data : project); else projects.unshift(data);
  saveProjects(); closeModal(); toast(id ? 'Đã cập nhật website' : 'Đã thêm website mới'); if (data.status !== 'archived') setTimeout(() => checkAllHealth(), 100);
});
grid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]'); if (!button) return; const project = projects.find((item) => item.id === button.dataset.id);
  if (button.dataset.action === 'edit') openModal(project);
  if (button.dataset.action === 'favorite') { project.favorite = !project.favorite; saveProjects(); toast(project.favorite ? 'Đã thêm vào yêu thích' : 'Đã bỏ yêu thích'); }
  if (button.dataset.action === 'archive') { project.status = project.status === 'archived' ? 'unknown' : 'archived'; saveProjects(); toast(project.status === 'archived' ? 'Đã lưu trữ website' : 'Đã khôi phục website'); if (project.status === 'unknown') checkAllHealth(); }
  if (button.dataset.action === 'delete' && confirm(`Xóa “${project.name}” khỏi hub?`)) { projects = projects.filter((item) => item.id !== project.id); saveProjects(); toast('Đã xóa website'); }
});
document.querySelectorAll('.nav-item[data-view]').forEach((button) => button.addEventListener('click', () => {
  currentView = button.dataset.view; document.querySelectorAll('.nav-item[data-view]').forEach((item) => item.classList.toggle('active', item === button));
  const meta = { all: ['Tất cả dự án', 'Tự động kiểm tra mỗi 60 giây'], favorites: ['Dự án yêu thích', 'Những dự án bạn quan tâm nhất'], active: ['Đang hoạt động', 'Các website đang online'], archived: ['Kho lưu trữ', 'Các dự án đã được lưu trữ'] }[currentView];
  $('viewTitle').textContent = meta[0]; $('viewSubtitle').textContent = meta[1]; render(); if (innerWidth < 900) document.querySelector('.sidebar').classList.remove('open');
}));
$('addBtn').onclick = $('emptyAddBtn').onclick = () => openModal(); $('closeModal').onclick = $('cancelBtn').onclick = closeModal;
$('modal').addEventListener('click', (event) => { if (event.target === $('modal')) closeModal(); });
$('colorOptions').addEventListener('click', (event) => { const button = event.target.closest('[data-color]'); if (button) { selectedColor = button.dataset.color; renderColors(); } });
$('searchInput').addEventListener('input', render); $('categoryFilter').addEventListener('change', render); $('checkAllBtn').addEventListener('click', () => checkAllHealth(true));
$('menuBtn').onclick = () => document.querySelector('.sidebar').classList.toggle('open');
document.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('searchInput').focus(); } if (event.key === 'Escape') closeModal(); });
$('themeBtn').onclick = () => { document.body.classList.toggle('light'); localStorage.setItem(SETTINGS_KEY, JSON.stringify({ light: document.body.classList.contains('light') })); };
try { if (JSON.parse(localStorage.getItem(SETTINGS_KEY))?.light) document.body.classList.add('light'); } catch {}
$('exportBtn').onclick = () => { const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' }); const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(blob); anchor.download = `my-project-hub-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(anchor.href); toast('Đã xuất dữ liệu'); };
$('importInput').addEventListener('change', async (event) => { try { const data = JSON.parse(await event.target.files[0].text()); if (!Array.isArray(data)) throw new Error(); projects = data; saveProjects(); toast('Đã nhập dữ liệu thành công'); checkAllHealth(); } catch { toast('Tệp dữ liệu không hợp lệ'); } event.target.value = ''; });
$('dateLabel').textContent = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(new Date()).toUpperCase();
render(); setTimeout(() => checkAllHealth(), 700); setInterval(() => checkAllHealth(), CHECK_INTERVAL);
