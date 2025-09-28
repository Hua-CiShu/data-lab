// ========== assets/js/app.js (FULL COVER) ==========

import { DataStore, Modules, loadFile } from './core.js';

// 适配器（确保这些文件存在且内部执行了 registerAdapter / Adapters.set）
import './adapters/csv.js';
import './adapters/excel.js';
import './adapters/sqlite.js';
import './adapters/json.js';

// 工具库/模块（你已有的即可）
import './lib/agg.js';
import './modules/clean.js';
import './modules/analyze.js';
import './modules/histogram.js';
import './modules/heatmap.js';
import './modules/wordcloud.js';

const $  = (s) => document.querySelector(s);

/* ========== 公共小工具 ========== */
export function escapeHTML(s){
  return String(s).replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

function renderMeta(){
  const chip = $('#metaChip');
  if (!chip) return;
  chip.textContent = DataStore.rows.length
    ? `列 ${DataStore.headers.length} · 行 ${DataStore.rows.length}`
    : '未加载';
}

function selectedRowLimit(){
  return Math.max(1, Math.min(200, Number($('#previewRows')?.value || 10)));
}

export function renderTablePreview(rows = DataStore.rows){
  const el = $('#preview'); if (!el) return;
  if (!rows.length){
    el.innerHTML = '<p class="muted">暂无数据预览。</p>';
    return;
  }
  const headers = DataStore.headers;
  const rowLimit = selectedRowLimit();
  const top = rows.slice(0, rowLimit);

  const thead = '<tr>' + headers.map(h => `<th>${escapeHTML(h)}</th>`).join('') + '</tr>';
  const tbody = top.map(r =>
    '<tr>' + headers.map(h => `<td>${escapeHTML(r[h] ?? '')}</td>`).join('') + '</tr>'
  ).join('');

  el.innerHTML = `
    <div class="h">数据预览（前 ${rowLimit} 行）</div>
    <div class="grid">
      <div class="card" style="overflow:auto">
        <table>${thead}${tbody}</table>
      </div>
    </div>`;
}

function ensureData(){
  if (!DataStore.rows.length){
    alert('请先读取数据文件');
    throw new Error('no data');
  }
}

/* ========== 路由（事件委托，支持后续渲染/移动端抽屉） ========== */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-route]');
  if (!el) return;

  e.preventDefault();
  const route = el.getAttribute('data-route');

  // 手机抽屉：点击后关闭
  document.body.classList.remove('sidebar-open');
  const mask = document.querySelector('.drawer-mask');
  if (mask) mask.style.display = 'none';

  if (route === 'home') {
    const view = document.getElementById('view');
    if (view) {
      view.innerHTML =
        '<h2 class="h">欢迎</h2><p class="muted">请选择模块开始。</p>' +
        '<p><a class="btn secondary" href="./samples/sample.csv" download>下载示例 CSV</a></p>';
    }
    return;
  }

  const mod = Modules.get(route);
  if (typeof mod === 'function') {
    try { mod(); }
    catch (err) { console.error('模块运行异常:', route, err); alert('模块运行异常：' + err); }
  } else {
    console.warn('未知的模块路由：', route);
    alert('未找到模块：' + route + '。请确认侧边栏 data-route 与 Modules.set 的 key 一致。');
  }
});

/* ========== 顶部工具组：读取 / 预览 / 自检 ========== */
$('#btnLoad')?.addEventListener('click', async () => {
  const type = $('#adapterSelect')?.value;
  const file = $('#fileInput')?.files?.[0];
  if (!file){ alert('请选择一个文件'); return; }
  try{
    await loadFile(type, file);
    renderMeta();
    renderTablePreview();
  }catch(e){
    alert('解析失败：' + (e?.message || e));
    console.error(e);
  }
});

$('#btnPreview')?.addEventListener('click', () => { ensureData(); renderTablePreview(); });

$('#previewRows')?.addEventListener('change', () => {
  if (DataStore.rows.length) renderTablePreview();
});

$('#btnTests')?.addEventListener('click', () => {
  const NEED=/[",\n]/;
  const csvCell = (v) => {
    if (v==null) return '';
    const s = String(v).replace(/"/g,'""');
    return NEED.test(s) ? `"${s}"` : s;
  };
  const cases = [
    ['csvCell 普通', csvCell('a')==='a'],
    ['csvCell 逗号', csvCell('a,b')==='"a,b"'],
    ['csvCell 引号', csvCell('a"b')==='"a""b"'],
    ['csvCell 换行', csvCell('a\nb')==='"a\nb"'],
    ['escapeHTML', escapeHTML('<x>')==='&lt;x&gt;'],
  ];
  const ok = cases.filter(c=>c[1]).length;
  const t = $('#tests');
  if (t){
    t.innerHTML = `自检：<span class="pass">${ok}</span>/${cases.length} 通过<ul>` +
      cases.map(([n,p]) => `<li>${p?'<span class="pass">✔</span>':'<span class="fail">✘</span>'} ${n}</li>`).join('') +
      '</ul>';
  }
});

/* ========== 初始欢迎 ========== */
const view = $('#view');
if (view){
  view.innerHTML =
    '<h2 class="h">欢迎</h2><p class="muted">请选择模块开始。</p>' +
    '<p><a class="btn secondary" href="./samples/sample.csv" download>下载示例 CSV</a></p>';
}

/* ========== 主题切换 + 图表主题适配 ========== */
const themeBtn = $('#themeToggle');
function prefersDark(){
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
window.applyTheme = function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  try{ localStorage.setItem('theme', theme); }catch{}
  const compact = document.body.classList.contains('sidebar-compact');
  if (themeBtn){
    themeBtn.textContent = compact
      ? (theme==='dark' ? '🌞' : '🌙')
      : (theme==='dark' ? '🌞 浅色' : '🌙 深色');
  }
  if (window.Chart){
    const dark = theme==='dark';
    window.Chart.defaults.color = dark ? '#e5e7eb' : '#111827';
    window.Chart.defaults.borderColor = dark ? 'rgba(255,255,255,.16)' : '#e5e7eb';
  }
  if (window.Plotly){
    const el = document.getElementById('hm-plot');
    if (el && el.data){
      window.Plotly.relayout(el, {
        paper_bgcolor: theme==='dark' ? '#0b1222' : '#ffffff',
        plot_bgcolor:   theme==='dark' ? '#0b1222' : '#ffffff',
        'xaxis.tickfont.color': theme==='dark' ? '#e5e7eb' : '#111827',
        'yaxis.tickfont.color': theme==='dark' ? '#e5e7eb' : '#111827',
        'xaxis.gridcolor': theme==='dark' ? 'rgba(255,255,255,.12)' : '#e5e7eb',
        'yaxis.gridcolor': theme==='dark' ? 'rgba(255,255,255,.12)' : '#e5e7eb'
      });
    }
  }
};
(function initTheme(){
  const saved = (()=>{ try{ return localStorage.getItem('theme'); }catch{ return null; } })();
  window.applyTheme(saved || (prefersDark() ? 'dark' : 'light'));
  themeBtn?.addEventListener('click', ()=>{
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    window.applyTheme(cur==='dark' ? 'light' : 'dark');
  });
})();

/* ========== 子菜单（桌面 hover，移动端 click） ========== */
(function setupSidebarHover(){
  const items = [...document.querySelectorAll('.nav-item')];
  const heads = [...document.querySelectorAll('.nav-head')];
  if (items[0]) items[0].classList.add('open');

  const isTouch = matchMedia('(hover: none)').matches;

  heads.forEach(head=>{
    const item = head.closest('.nav-item');
    if (!isTouch){
      head.addEventListener('mouseenter', ()=>{
        if (!item.classList.contains('open')){
          items.forEach(i=>i.classList.remove('open'));
          item.classList.add('open');
        }
      });
    }
    head.addEventListener('click', ()=>{
      if (item.classList.contains('open')) item.classList.remove('open');
      else { items.forEach(i=>i.classList.remove('open')); item.classList.add('open'); }
    });
  });
})();

/* ========== 悬浮工具组（测高 + 扇形缓收） ========== */
(function setupControlsFloating(){
  const wrap      = document.getElementById('controlsWrap');
  const panel     = document.getElementById('controlsPanel');
  const btnInline = document.getElementById('controlsToggle');

  document.querySelectorAll('#controlsHandle').forEach((n,i)=>{ if (i>0) n.remove(); });

  let handle = document.getElementById('controlsHandle');
  if (!handle){
    handle = document.createElement('button');
    handle.id = 'controlsHandle';
    handle.type = 'button';
    handle.textContent = '⟨';
    document.body.appendChild(handle);
  }

  let measured = 64;
  function measure(){
    if (!panel) return;
    const h = Math.round(panel.getBoundingClientRect().height + 12);
    measured = h;
    document.documentElement.style.setProperty('--controls-h', measured + 'px');
  }

  function setCollapsed(collapsed){
    if (!wrap) return;
    wrap.classList.toggle('is-collapsed', !!collapsed);
    document.body.classList.toggle('controls-collapsed', !!collapsed);
    if (btnInline) btnInline.textContent = collapsed ? '⟨' : '⟩';
    handle.textContent = collapsed ? '⟩' : '⟨';
    document.documentElement.style.setProperty('--controls-h', measured + 'px');
  }

  btnInline?.addEventListener('click', ()=> setCollapsed(!wrap.classList.contains('is-collapsed')));
  handle.addEventListener('click', ()=> setCollapsed(false));

  setCollapsed(false);
  const remeasure = ()=>{ if (!wrap.classList.contains('is-collapsed')) measure(); };
  window.addEventListener('resize', remeasure, { passive:true });
  setTimeout(remeasure, 0);
  setTimeout(remeasure, 150);
  window.addEventListener('load', remeasure);
})();

/* ========== 侧栏把手（品牌区内部右上角；展开 ↔ 紧凑） ========== */
(function setupSidebarPin(){
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  const brand = sidebar.querySelector('.brand');
  if (brand && !brand.querySelector('.badge-dl')){
    const dl = document.createElement('div');
    dl.className = 'badge-dl';
    dl.textContent = 'DL';
    brand.insertBefore(dl, brand.firstChild);
  }

  const themeBtnLocal = document.getElementById('themeToggle');
  function setThemeBtnForCompact(compact){
    if (!themeBtnLocal) return;
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    themeBtnLocal.textContent = compact
      ? (theme==='dark' ? '🌞' : '🌙')
      : (theme==='dark' ? '🌞 浅色' : '🌙 深色');
  }

  document.querySelectorAll('#sidebarPin').forEach((n,i)=>{ if (i>0) n.remove(); });
  let pin = document.getElementById('sidebarPin');
  if (!pin){
    pin = document.createElement('button');
    pin.id = 'sidebarPin';
    pin.type = 'button';
    pin.textContent = '⟨';
    (brand || sidebar).appendChild(pin);
  }

  function setCompact(compact){
    document.body.classList.toggle('sidebar-compact', !!compact);
    pin.textContent = compact ? '⟩' : '⟨';
    setThemeBtnForCompact(!!compact);
  }

  pin.addEventListener('click', ()=>{
    const compact = !document.body.classList.contains('sidebar-compact');
    setCompact(compact);
  });

  setCompact(false);

  const origApply = window.applyTheme;
  if (typeof origApply === 'function'){
    window.applyTheme = function(theme){
      origApply(theme);
      setThemeBtnForCompact(document.body.classList.contains('sidebar-compact'));
    };
  }
})();

/* ========== Mobile 抽屉 ========== */
(function mobileDrawer(){
  const mq = matchMedia('(max-width: 900px)');
  function setup(){
    const isTouch = mq.matches;
    let mask = document.querySelector('.drawer-mask');
    if (!mask){
      mask = document.createElement('div');
      mask.className = 'drawer-mask';
      document.body.appendChild(mask);
    }
    if (!isTouch){
      document.body.classList.remove('sidebar-open');
      mask.style.display = 'none';
      return;
    }
    const pin = document.getElementById('sidebarPin');
    if (pin && !pin.__drawerBound){
      pin.__drawerBound = true;
      pin.addEventListener('click', (e)=>{
        e.stopPropagation();
        const opened = document.body.classList.toggle('sidebar-open');
        mask.style.display = opened ? 'block' : 'none';
      }, {capture:true});
    }
    mask.onclick = ()=>{
      document.body.classList.remove('sidebar-open');
      mask.style.display = 'none';
    };
  }
  setup();
  mq.addEventListener?.('change', setup);
})();
