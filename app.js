const STORAGE_KEY = 'my-project-hub-data-v1';
const SETTINGS_KEY = 'my-project-hub-settings-v1';
const colors = ['#8b5cf6','#28c6a3','#f0a94b','#ec6f8c','#4ea5f6','#b6d657'];
const seedProjects = [
  {id:'welcome',name:'My Project Hub',url:'https://github.com/NguyenHop1909/my-project-hub',category:'Cá nhân',status:'active',description:'Trung tâm quản lý toàn bộ website và sản phẩm số.',tech:['HTML','CSS','Electron'],color:'#8b5cf6',favorite:true}
];
let projects = loadProjects();
let currentView = 'all';
let selectedColor = colors[0];

const $ = (id) => document.getElementById(id);
const grid = $('projectGrid');

function loadProjects(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));return Array.isArray(saved)?saved:seedProjects}catch{return seedProjects}}
function saveProjects(){localStorage.setItem(STORAGE_KEY,JSON.stringify(projects));render();}
function escapeHtml(value=''){const div=document.createElement('div');div.textContent=value;return div.innerHTML}
function getInitials(name){return name.split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'W'}
function statusLabel(status){return {active:'ĐANG HOẠT ĐỘNG',building:'ĐANG PHÁT TRIỂN',archived:'ĐÃ LƯU TRỮ'}[status]||status}

function render(){
  const query=$('searchInput').value.trim().toLowerCase();
  const category=$('categoryFilter').value;
  const filtered=projects.filter(p=>{
    const matchesView=currentView==='all'||(currentView==='favorites'&&p.favorite)||(currentView==='active'&&p.status==='active')||(currentView==='archived'&&p.status==='archived');
    const haystack=[p.name,p.description,p.category,...(p.tech||[])].join(' ').toLowerCase();
    return matchesView&&(category==='all'||p.category===category)&&haystack.includes(query);
  });
  grid.innerHTML=filtered.map(p=>`<article class="project-card" style="--card-color:${p.color}">
    <div class="card-top"><span class="project-logo">${escapeHtml(getInitials(p.name))}</span><div class="card-menu">
      <button class="${p.favorite?'favorite':''}" data-action="favorite" data-id="${p.id}" title="Yêu thích">★</button>
      <button data-action="edit" data-id="${p.id}" title="Chỉnh sửa">✎</button><button data-action="delete" data-id="${p.id}" title="Xóa">×</button>
    </div></div><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description||'Chưa có mô tả cho dự án này.')}</p>
    <div class="tags">${(p.tech||[]).slice(0,4).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
    <div class="card-footer"><span class="status ${p.status}">${statusLabel(p.status)}</span><a class="visit-link" href="${escapeHtml(p.url)}" target="_blank" rel="noopener">TRUY CẬP ↗</a></div></article>`).join('');
  $('emptyState').hidden=filtered.length>0;
  $('totalCount').textContent=projects.length;
  $('activeCount').textContent=projects.filter(p=>p.status==='active').length;
  $('categoryCount').textContent=new Set(projects.map(p=>p.category).filter(Boolean)).size;
  updateCategories();
}

function updateCategories(){const select=$('categoryFilter'),value=select.value,cats=[...new Set(projects.map(p=>p.category).filter(Boolean))].sort();select.innerHTML='<option value="all">Tất cả danh mục</option>'+cats.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');select.value=cats.includes(value)?value:'all'}
function openModal(project){
  $('projectForm').reset();$('projectId').value=project?.id||'';$('modalTitle').textContent=project?'Chỉnh sửa website':'Thêm website mới';
  if(project){$('projectName').value=project.name;$('projectUrl').value=project.url;$('projectCategory').value=project.category;$('projectStatus').value=project.status;$('projectDescription').value=project.description||'';$('projectTech').value=(project.tech||[]).join(', ');selectedColor=project.color||colors[0]}else selectedColor=colors[0];
  renderColors();$('modal').hidden=false;setTimeout(()=>$('projectName').focus(),50);
}
function closeModal(){$('modal').hidden=true}
function renderColors(){$('colorOptions').innerHTML=colors.map(c=>`<button type="button" class="color-choice ${c===selectedColor?'selected':''}" style="background:${c}" data-color="${c}" aria-label="Chọn màu ${c}"></button>`).join('')}
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2200)}

$('projectForm').addEventListener('submit',e=>{e.preventDefault();const id=$('projectId').value;const data={id:id||crypto.randomUUID(),name:$('projectName').value.trim(),url:$('projectUrl').value.trim(),category:$('projectCategory').value.trim(),status:$('projectStatus').value,description:$('projectDescription').value.trim(),tech:$('projectTech').value.split(',').map(v=>v.trim()).filter(Boolean),color:selectedColor,favorite:projects.find(p=>p.id===id)?.favorite||false};if(id)projects=projects.map(p=>p.id===id?data:p);else projects.unshift(data);saveProjects();closeModal();toast(id?'Đã cập nhật website':'Đã thêm website mới')});
grid.addEventListener('click',e=>{const btn=e.target.closest('[data-action]');if(!btn)return;const p=projects.find(x=>x.id===btn.dataset.id);if(btn.dataset.action==='edit')openModal(p);if(btn.dataset.action==='favorite'){p.favorite=!p.favorite;saveProjects();toast(p.favorite?'Đã thêm vào yêu thích':'Đã bỏ yêu thích')}if(btn.dataset.action==='delete'&&confirm(`Xóa “${p.name}” khỏi hub?`)){projects=projects.filter(x=>x.id!==p.id);saveProjects();toast('Đã xóa website')}});
document.querySelectorAll('.nav-item[data-view]').forEach(btn=>btn.addEventListener('click',()=>{currentView=btn.dataset.view;document.querySelectorAll('.nav-item[data-view]').forEach(x=>x.classList.toggle('active',x===btn));const meta={all:['Tất cả dự án','Các website trong workspace của bạn'],favorites:['Dự án yêu thích','Những dự án bạn quan tâm nhất'],active:['Đang hoạt động','Các website đang online'],archived:['Kho lưu trữ','Các dự án đã được lưu trữ']}[currentView];$('viewTitle').textContent=meta[0];$('viewSubtitle').textContent=meta[1];render();if(innerWidth<900)document.querySelector('.sidebar').classList.remove('open')}));
$('addBtn').onclick=$('emptyAddBtn').onclick=()=>openModal();$('closeModal').onclick=$('cancelBtn').onclick=closeModal;$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal()});
$('colorOptions').addEventListener('click',e=>{const btn=e.target.closest('[data-color]');if(btn){selectedColor=btn.dataset.color;renderColors()}});
$('searchInput').addEventListener('input',render);$('categoryFilter').addEventListener('change',render);$('menuBtn').onclick=()=>document.querySelector('.sidebar').classList.toggle('open');
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('searchInput').focus()}if(e.key==='Escape')closeModal()});
$('themeBtn').onclick=()=>{document.body.classList.toggle('light');localStorage.setItem(SETTINGS_KEY,JSON.stringify({light:document.body.classList.contains('light')}))};
try{if(JSON.parse(localStorage.getItem(SETTINGS_KEY))?.light)document.body.classList.add('light')}catch{}
$('exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(projects,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`my-project-hub-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);toast('Đã xuất dữ liệu')};
$('importInput').addEventListener('change',async e=>{try{const data=JSON.parse(await e.target.files[0].text());if(!Array.isArray(data))throw new Error();projects=data;saveProjects();toast('Đã nhập dữ liệu thành công')}catch{toast('Tệp dữ liệu không hợp lệ')}e.target.value=''});
$('dateLabel').textContent=new Intl.DateTimeFormat('vi-VN',{month:'long',year:'numeric'}).format(new Date()).toUpperCase();
render();
