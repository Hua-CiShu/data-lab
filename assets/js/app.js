// ========== app.js (覆盖版) ==========

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
import './modules/heatmap.js';   // Plotly 版
import './modules/wordcloud.js';

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* ===== 工具函数 ===== */
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
  return Math.max(1, Math.min(200, Number($('#previewRows')?.value||10)));
}

export function renderTablePreview(rows = DataStore.rows, limit=null){
  const el = $('#preview'); if(!el) return;
  if(!rows.length){ el.innerHTML = '<p class="muted">暂无数据预览。</p>'; return; }

  const headers = DataStore.headers;
  const rowLimit = selectedRowLimit();
  const top = rows.slice(0, rowLimit);

  const thead = '<tr>' + headers.map(h=>`<th>${escapeHTML(h)}</th>`).join('') + '</tr>';
  const tbody = top.map(r => '<tr>' + headers.map(h=>`<td>${escapeHTML(r[h] ?? '')}</td>`).join('') + '</tr>').join('');

  el.innerHTML = `<div class="h">数据预览（前 ${rowLimit} 行）</div>
                  <div class="grid"><div class="card" style="overflow:auto">
                  <table>${thead}${tbody}</table></div></div>`;
}

function ensureData(){
  if(!DataStore.rows.length){ alert('请先读取数据文件'); throw new Error('no data'); }
}

/* ===== 路由绑定 ===== */
$$('[data-route]').forEach(el=>{
  el.addEventListener('click', ()=>{
    const route = el.getAttribute('data-route');
    if(route === 'home'){
      $('#view').innerHTML = '<h2 class="h">欢迎</h2><p class="muted">请选择模块开始。</p><p><a class="btn secondary" href="./samples/sample.csv" download>下载示例 CSV</a></p>';
      return;
    }
    const mod = Modules.get(route);
    if(mod) mod();
  });
});

/* ===== 悬浮工具面板：事件 ===== */
const btnLoad      = $('#btnLoad');
const btnPreview   = $('#btnPreview');
const previewRowsI = $('#previewRows');

if(btnLoad){
  btnLoad.onclick = async () => {
    const type = $('#adapterSelect')?.value;
    const file = $('#fileInput')?.files?.[0];
    if(!file){ alert('请选择一个文件'); return; }
    try {
      await loadFile(type, file);
      renderMeta();
      renderTablePreview();
    } catch (e){
      alert('解析失败：' + e);
    }
  };
}
if(btnPreview){
  btnPreview.onclick = () => { ensureData(); renderTablePreview(); };
}
if(previewRowsI){
  previewRowsI.addEventListener('change', ()=> { if(DataStore.rows.length){ renderTablePreview(); } });
}

/* ===== 左侧栏底部：运行自检 ===== */
const btnTests = $('#btnTests');
if(btnTests){
  btnTests.onclick = () => {
    const NEED_QUOTE = /[",\n]/;
    const csvCell = v => {
      if(v==null) return '';
      const s = String(v).replace(/"/g,'""');
      return NEED_QUOTE.test(s) ? `"${s}"` : s;
    };
    const cases = [
      ['csvCell 普通', csvCell('a')==='a'],
      ['csvCell 逗号', csvCell('a,b')==='"a,b"'],
      ['csvCell 引号', csvCell('a"b')==='"a""b"'],
      ['csvCell 换行', csvCell('a\nb')==='"a\nb"'],
      ['escapeHTML',   escapeHTML('<x>')==='&lt;x&gt;']
    ];
    const ok = cases.filter(c=>c[1]).length;
    const t = $('#tests');
    if(t){
      t.innerHTML = `自检：<span class="pass">${ok}</span>/${cases.length} 通过<ul>` +
        cases.map(([n,p])=>`<li>${p?'<span class="pass">✔</span>':'<span class="fail">✘</span>'} ${n}</li>`).join('') +
        '</ul>';
    }
  };
}

/* ===== 初始欢迎区 ===== */
const view = $('#view');
if(view){
  view.innerHTML = '<h2 class="h">欢迎</h2><p class="muted">请选择模块开始。</p><p><a class="btn secondary" href="./samples/sample.csv" download>下载示例 CSV</a></p>';
}

/* ===== 主题切换（按钮在左上角品牌区） ===== */
const themeBtn = $('#themeToggle');
function getSystemPrefersDark(){ return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; }
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  try{ localStorage.setItem('theme', theme); }catch{}
  if(themeBtn){ themeBtn.textContent = theme === 'dark' ? '🌞 浅色' : '🌙 深色'; }

  if(window.Chart){
    const isDark = theme === 'dark';
    window.Chart.defaults.color = isDark ? '#e5e7eb' : '#111827';
    window.Chart.defaults.borderColor = isDark ? 'rgba(255,255,255,.16)' : '#e5e7eb';
    if(window.__histChart){
      const c = window.__histChart;
      ['x','y'].forEach(ax=>{
        c.options.scales[ax] = c.options.scales[ax] || {};
        c.options.scales[ax].ticks = { ...(c.options.scales[ax].ticks||{}), color: window.Chart.defaults.color };
        c.options.scales[ax].grid  = { ...(c.options.scales[ax].grid||{}),  color: isDark ? 'rgba(255,255,255,.12)' : '#e5e7eb' };
      });
      c.update();
    }
  }
  if(window.Plotly){
    const el = document.getElementById('hm-plot');
    if(el && el.data){
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
}
(function initTheme(){
  const saved = (()=>{ try{ return localStorage.getItem('theme'); }catch{ return null; } })();
  applyTheme(saved || (getSystemPrefersDark() ? 'dark' : 'light'));
  if(themeBtn){
    themeBtn.onclick = ()=> applyTheme(
      document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
    );
  }
})();

/* ===== 侧边栏：柔和展开 + 点击已展开收起 ===== */
(function setupSidebarStickyOpen(){
  const items = Array.from(document.querySelectorAll('.nav-item'));
  const heads = Array.from(document.querySelectorAll('.nav-head'));
  if(items[0]) items[0].classList.add('open');

  heads.forEach(head=>{
    const item = head.closest('.nav-item');
    head.addEventListener('mouseenter', ()=>{
      if(!item.classList.contains('open')){
        items.forEach(i=> i.classList.remove('open'));
        item.classList.add('open');
      }
    });
    head.addEventListener('click', ()=>{
      if(item.classList.contains('open')) item.classList.remove('open');
      else { items.forEach(i=> i.classList.remove('open')); item.classList.add('open'); }
    });
  });
})();

/* ===== 悬浮面板：向右柔和隐藏（只留右上角把手），展开后悬浮于页面上 ===== */
(function setupControlsFloating(){
  const row   = $('.controls-row');
  const toggleInRow = $('#controlsToggle');

  // 右上角独立把手（仅在收起状态显示）
  let fixedHandle = document.createElement('button');
  fixedHandle.id = 'controlsHandle';
  fixedHandle.type = 'button';
  fixedHandle.textContent = '⟩';
  document.body.appendChild(fixedHandle);

  function setCollapsed(on){
    document.body.classList.toggle('controls-collapsed', !!on);
    // 行内按钮箭头同步
    if(toggleInRow) toggleInRow.textContent = on ? '⟨' : '⟨';
    // 固定把手箭头同步
    fixedHandle.textContent = on ? '⟩' : '⟩';
  }

  if(toggleInRow){
    toggleInRow.addEventListener('click', ()=> setCollapsed(!document.body.classList.contains('controls-collapsed')));
  }
  fixedHandle.addEventListener('click', ()=> setCollapsed(false));

  // 初始为展开
  setCollapsed(false);
})();
