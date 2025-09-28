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
 * 左下：运行自检
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
 * 初始欢迎
 * =======================================================*/
const view = $('#view');
if (view){
  view.innerHTML =
    '<h2 class="h">欢迎</h2><p class="muted">请选择模块开始。</p>' +
    '<p><a class="btn secondary" href="./samples/sample.csv" download>下载示例 CSV</a></p>';
}

/* =========================================================
 * 主题切换（展开=带文案；紧凑=仅图标）
 * =======================================================*/
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

  // Chart.js 主题联动（可选）
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

  // Plotly 主题联动（可选）
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
 * 侧栏：桌面 hover，移动端 click（不依赖 hover）
 * =======================================================*/
(function setupSidebarHover(){
  const items = [...document.querySelectorAll('.nav-item')];
  const heads = [...document.querySelectorAll('.nav-head')];
  if (items[0]) items[0].classList.add('open');

  const isTouch = matchMedia('(hover: none)').matches;

  heads.forEach(head=>{
    const item = head.closest('.nav-item');

    if (!isTouch){
      // 桌面：hover 展开 + click 切换
      head.addEventListener('mouseenter', ()=>{
        if (!item.classList.contains('open')){
          items.forEach(i=>i.classList.remove('open'));
          item.classList.add('open');
        }
      });
    }

    // 两端都允许 click 切换
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

/* =========================================================
 * 侧栏把手：在品牌区内部右上角；展开 ↔ 紧凑(压缩宽度，不全隐藏)
 *  - 紧凑：品牌显示 DL 圆徽，主题按钮仅图标
 *  - 展开：品牌显示 "Data Lab"，主题按钮带文案
 * =======================================================*/
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
    pin.textContent = '⟨';                 // 展开状态（点击进入紧凑）
    (brand || sidebar).appendChild(pin);   // 放进品牌区，保证与标题对齐
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

  // 初始：展开 & 恢复带文案
  setCompact(false);

  // 主题变化时，同步按钮文本
  const origApply = window.applyTheme;
  if (typeof origApply === 'function'){
    window.applyTheme = function(theme){
      origApply(theme);
      setThemeBtnForCompact(document.body.classList.contains('sidebar-compact'));
    };
  }
})();

/* =========================================================
 * Mobile drawer：手机上把侧边栏作为抽屉显示
 * =======================================================*/
(function mobileDrawer(){
  const isTouch = matchMedia('(max-width: 900px)').matches;
  if (!isTouch) return;

  // 遮罩
  let mask = document.querySelector('.drawer-mask');
  if (!mask){
    mask = document.createElement('div');
    mask.className = 'drawer-mask';
    document.body.appendChild(mask);
  }

  // 品牌区内的把手（已在 setupSidebarPin 里创建，这里只绑定手机行为）
  const pin = document.getElementById('sidebarPin');
  if (pin){
    pin.addEventListener('click', (e)=>{
      e.stopPropagation();
      const opened = document.body.classList.toggle('sidebar-open');
      // 打开抽屉时，顺便进入“紧凑/展开”的你自己既定状态，这里不改 sidebar-compact
      mask.style.display = opened ? 'block' : 'none';
    }, {capture:true});
  }

  // 点击遮罩关闭
  mask.addEventListener('click', ()=>{
    document.body.classList.remove('sidebar-open');
    mask.style.display = 'none';
  });

  // 视口尺寸变化时关闭抽屉
  window.addEventListener('resize', ()=>{
    document.body.classList.remove('sidebar-open');
    mask.style.display = 'none';
  }, {passive:true});
})();
