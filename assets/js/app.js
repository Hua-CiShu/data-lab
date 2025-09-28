// ========== assets/js/app.js (FULL COVER) ==========

import { DataStore, Modules, loadFile } from './core.js';

// 适配器
import './adapters/csv.js';
import './adapters/excel.js';
import './adapters/sqlite.js';
import './adapters/json.js';

// 模块
import './modules/clean.js';
import './modules/analyze.js';
import './modules/histogram.js';
import './modules/heatmap.js';
import './modules/wordcloud.js';

const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

/* =========================================================
 * 基础工具
 * =======================================================*/
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

/* =========================================================
 * 路由绑定
 * =======================================================*/
$$('[data-route]').forEach(el => {
  el.addEventListener('click', () => {
    const route = el.getAttribute('data-route');
    if (route === 'home'){
      $('#view').innerHTML =
        '<h2 class="h">欢迎</h2><p class="muted">请选择模块开始。</p>' +
        '<p><a class="btn secondary" href="./samples/sample.csv" download>下载示例 CSV</a></p>';
      return;
    }
    const mod = Modules.get(route);
    if (mod) mod();
  });
});

/* =========================================================
 * 悬浮工具面板：读取 / 预览
 * =======================================================*/
$('#btnLoad')?.addEventListener('click', async () => {
  const type = $('#adapterSelect')?.value;
  const file = $('#fileInput')?.files?.[0];
  if (!file){ alert('请选择一个文件'); return; }
  try{
    await loadFile(type, file);
    renderMeta();
    renderTablePreview();
  }catch(e){
    alert('解析失败：' + e);
  }
});

$('#btnPreview')?.addEventListener('click', () => { ensureData(); renderTablePreview(); });

$('#previewRows')?.addEventListener('change', () => {
  if (DataStore.rows.length) renderTablePreview();
});

/* =========================================================
 * 左下：运行自检（内置用例）
 * =======================================================*/
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

/* =========================================================
 * 初始欢迎页
 * =======================================================*/
const view = $('#view');
if (view){
  view.innerHTML =
    '<h2 class="h">欢迎</h2><p class="muted">请选择模块开始。</p>' +
    '<p><a class="btn secondary" href="./samples/sample.csv" download>下载示例 CSV</a></p>';
}

/* =========================================================
 * 主题切换（展开时：带文案；紧凑时：仅图标）
 * =======================================================*/
const themeBtn = $('#themeToggle');

function prefersDark(){
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// 暴露到 window，供其它逻辑 hook（如侧栏紧凑模式切换时同步文案/图标）
window.applyTheme = function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  try{ localStorage.setItem('theme', theme); }catch{}

  const compact = document.body.classList.contains('sidebar-compact');
  if (themeBtn){
    // 紧凑：仅图标；展开：带文案
    themeBtn.textContent = compact
      ? (theme==='dark' ? '🌞' : '🌙')
      : (theme==='dark' ? '🌞 浅色' : '🌙 深色');
  }

  // —— 可选：图表主题联动（Chart.js）
  if (window.Chart){
    const dark = theme==='dark';
    window.Chart.defaults.color = dark ? '#e5e7eb' : '#111827';
    window.Chart.defaults.borderColor = dark ? 'rgba(255,255,255,.16)' : '#e5e7eb';
    if (window.__histChart){
      const c = window.__histChart;
      ['x','y'].forEach(ax=>{
        c.options.scales[ax] = c.options.scales[ax] || {};
        c.options.scales[ax].ticks = { ...(c.options.scales[ax].ticks||{}), color: window.Chart.defaults.color };
        c.options.scales[ax].grid  = { ...(c.options.scales[ax].grid||{}),  color: dark ? 'rgba(255,255,255,.12)' : '#e5e7eb' };
      });
      c.update();
    }
  }

  // —— 可选：Plotly 主题联动（热力图）
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

/* =========================================================
 * 侧栏：悬停展开 + 点击保持（子菜单）
 * =======================================================*/
(function setupSidebarHover(){
  const items = [...document.querySelectorAll('.nav-item')];
  const heads = [...document.querySelectorAll('.nav-head')];
  if (items[0]) items[0].classList.add('open');

  heads.forEach(head=>{
    const item = head.closest('.nav-item');
    head.addEventListener('mouseenter', ()=>{
      if (!item.classList.contains('open')){
        items.forEach(i=>i.classList.remove('open'));
        item.classList.add('open');
      }
    });
    head.addEventListener('click', ()=>{
      if (item.classList.contains('open')) item.classList.remove('open');
      else { items.forEach(i=>i.classList.remove('open')); item.classList.add('open'); }
    });
  });
})();

/* =========================================================
 * 悬浮工具组：测高 + 占位固定 + 扇形缓收（右上把手固定）
 * =======================================================*/
(function setupControlsFloating(){
  const wrap      = document.getElementById('controlsWrap');
  const panel     = document.getElementById('controlsPanel');
  const btnInline = document.getElementById('controlsToggle');

  // 清理重复把手，确保唯一
  document.querySelectorAll('#controlsHandle').forEach((n,i)=>{ if (i>0) n.remove(); });

  // 固定坐标把手（右上角），展开态通过 CSS 隐藏至 opacity:0
  let handle = document.getElementById('controlsHandle');
  if (!handle){
    handle = document.createElement('button');
    handle.id = 'controlsHandle';
    handle.type = 'button';
    handle.textContent = '⟨';  // 展开时向左（点击=收起）
    document.body.appendChild(handle);
  }

  // 记录“展开时”真实高度，正文留白始终按该值（折叠不改变）
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
    document.body.classList.toggle('controls-collapsed', !!collapsed); // 控制把手显隐
    if (btnInline) btnInline.textContent = collapsed ? '⟨' : '⟩';
    handle.textContent = collapsed ? '⟩' : '⟨';
    document.documentElement.style.setProperty('--controls-h', measured + 'px');
  }

  btnInline?.addEventListener('click', ()=> setCollapsed(!wrap.classList.contains('is-collapsed')));
  handle.addEventListener('click', ()=> setCollapsed(false));

  // 初始：展开 + 多次测高（抗字体回流）
  setCollapsed(false);
  const remeasure = ()=>{ if (!wrap.classList.contains('is-collapsed')) measure(); };
  window.addEventListener('resize', remeasure, { passive:true });
  setTimeout(remeasure, 0);
  setTimeout(remeasure, 150);
  window.addEventListener('load', remeasure);
})();

/* =========================================================
 * 侧栏把手：内部右上角；展开 ↔ 紧凑(仅压缩宽度，不全隐藏)
 *  - 紧凑时：品牌显示 DL 圆徽，主题按钮仅图标
 *  - 展开时：品牌显示 "Data Lab"，主题按钮带文案
 * =======================================================*/
(function setupSidebarPin(){
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  // —— 品牌区：自动补一个 DL 徽章（.badge-dl），不要求你改 HTML
  const brand = sidebar.querySelector('.brand');
  if (brand && !brand.querySelector('.badge-dl')){
    const dl = document.createElement('div');
    dl.className = 'badge-dl';
    dl.textContent = 'DL';
    brand.insertBefore(dl, brand.firstChild);
  }

  // —— 主题按钮：根据展开/紧凑切换“带文案/仅图标”
  const themeBtnLocal = document.getElementById('themeToggle');
  function setThemeBtnForCompact(compact){
    if (!themeBtnLocal) return;
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    themeBtnLocal.textContent = compact
      ? (theme==='dark' ? '🌞' : '🌙')
      : (theme==='dark' ? '🌞 浅色' : '🌙 深色');
  }

  // —— 保证只有一个把手（内部右上角）
  document.querySelectorAll('#sidebarPin').forEach((n,i)=>{ if (i>0) n.remove(); });
  const brand = sidebar.querySelector('.brand');  // 上面已有 brand 变量就复用
  let pin = document.getElementById('sidebarPin');
  if (!pin){
    pin = document.createElement('button');
    pin.id = 'sidebarPin';
    pin.type = 'button';
    pin.textContent = '⟨';
    (brand || sidebar).appendChild(pin);          // ← 优先放进品牌区
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

  // 初始：展开模式 & 恢复“带文案”
  setCompact(false);

  // 当主题变更时，同步按钮文本（hook 全局 applyTheme）
  const origApply = window.applyTheme;
  if (typeof origApply === 'function'){
    window.applyTheme = function(theme){
      origApply(theme);
      setThemeBtnForCompact(document.body.classList.contains('sidebar-compact'));
    };
  }
})();
