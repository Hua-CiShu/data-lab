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

function selectedPreviewColumns(){
  const sel = $('#previewCols');
  if(!sel || sel.selectedOptions.length===0) return null; // null 表示“全部列”
  return Array.from(sel.selectedOptions).map(o => o.value);
}

export function renderTablePreview(rows = DataStore.rows, limit=null, cols=null){
  const el = $('#preview'); if(!el) return;
  const headersAll = DataStore.headers;

  if(!rows.length){
    el.innerHTML = '<p class="muted">暂无数据预览。</p>';
    return;
  }
  const rowLimit = Math.max(1, Math.min(200, Number(limit||$('#previewRows')?.value||10)));
  const headers = Array.isArray(cols) && cols.length ? cols : headersAll;

  const top = rows.slice(0, rowLimit);
  const thead = '<tr>' + headers.map(h=>`<th>${escapeHTML(h)}</th>`).join('') + '</tr>';
  const tbody = top.map(r => '<tr>' + headers.map(h=>`<td>${escapeHTML(r[h] ?? '')}</td>`).join('') + '</tr>').join('');
  el.innerHTML = `<div class="h">数据预览（前 ${rowLimit} 行；列：${headers.length}/${headersAll.length}）</div>
                  <div class="grid"><div class="card" style="overflow:auto">
                  <table>${thead}${tbody}</table></div></div>`;
}

function ensureData(){
  if(!DataStore.rows.length){
    alert('请先读取数据文件');
    throw new Error('no data');
  }
}

/* ===== 路由：左侧子菜单点击 ===== */
$$('[data-route]').forEach(el=>{
  el.addEventListener('click', ()=>{
    const route = el.getAttribute('data-route');
    if(route === 'home'){
      const v = $('#view');
      if(v) v.innerHTML = '<h2 class="h">欢迎</h2><p class="muted">请选择模块开始。</p><p><a class="btn secondary" href="./samples/sample.csv" download>下载示例 CSV</a></p>';
      return;
    }
    const mod = Modules.get(route);
    if(mod) mod();
  });
});

/* ===== 顶部工具面板：读取/预览/自检 + 预览行数 & 列选择 ===== */
const btnLoad      = $('#btnLoad');
const btnPreview   = $('#btnPreview');
const btnTests     = $('#btnTests');
const previewRowsI = $('#previewRows');
const previewColsS = $('#previewCols');

if(btnLoad){
  btnLoad.onclick = async () => {
    const type = $('#adapterSelect')?.value;
    const file = $('#fileInput')?.files?.[0];
    if(!file){ alert('请选择一个文件'); return; }
    try {
      await loadFile(type, file);
      renderMeta();

      // 填充“预览列（多选）”
      if(previewColsS){
        const headers = DataStore.headers;
        previewColsS.innerHTML = headers.map(h=>`<option value="${escapeHTML(h)}">${escapeHTML(h)}</option>`).join('');
        // 默认全选效果：不选任何项即表示“全部列”，更符合浏览直觉
        previewColsS.size = Math.min(6, Math.max(1, headers.length)); // 自适应高度
      }

      renderTablePreview();
    } catch (e){
      alert('解析失败：' + e);
    }
  };
}

if(btnPreview){
  btnPreview.onclick = () => {
    ensureData();
    renderTablePreview(DataStore.rows, Number(previewRowsI?.value||10), selectedPreviewColumns());
  };
}
if(previewRowsI){
  previewRowsI.addEventListener('change', ()=>{
    if(!DataStore.rows.length) return;
    renderTablePreview(DataStore.rows, Number(previewRowsI.value||10), selectedPreviewColumns());
  });
}
if(previewColsS){
  previewColsS.addEventListener('change', ()=>{
    if(!DataStore.rows.length) return;
    renderTablePreview(DataStore.rows, Number(previewRowsI?.value||10), selectedPreviewColumns());
  });
}

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

/* ===== 主题切换（按钮现在在侧边栏品牌区） ===== */
const themeBtn = $('#themeToggle');

function getSystemPrefersDark(){
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function applyTheme(theme){
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  try { localStorage.setItem('theme', theme); } catch {}

  if(themeBtn){
    themeBtn.textContent = theme === 'dark' ? '🌞 浅色' : '🌙 深色';
  }

  // Chart.js 全局颜色联动
  if(window.Chart){
    const isDark = theme === 'dark';
    window.Chart.defaults.color = isDark ? '#e5e7eb' : '#111827';
    window.Chart.defaults.borderColor = isDark ? 'rgba(255,255,255,.16)' : '#e5e7eb';
    if(window.__histChart){
      const c = window.__histChart;
      c.options.scales = c.options.scales || {};
      ['x','y'].forEach(ax=>{
        c.options.scales[ax] = c.options.scales[ax] || {};
        c.options.scales[ax].ticks = c.options.scales[ax].ticks || {};
        c.options.scales[ax].grid  = c.options.scales[ax].grid  || {};
        c.options.scales[ax].ticks.color = window.Chart.defaults.color;
        c.options.scales[ax].grid.color  = isDark ? 'rgba(255,255,255,.12)' : '#e5e7eb';
      });
      c.update();
    }
  }
  // Plotly 热力图联动
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

  window.__theme = theme;
  window.dispatchEvent(new CustomEvent('themechange', { detail:{ theme } }));
}
(function initTheme(){
  const saved = (()=>{ try{ return localStorage.getItem('theme'); }catch{ return null; } })();
  const theme = saved || (getSystemPrefersDark() ? 'dark' : 'light');
  applyTheme(theme);
  if(themeBtn){
    themeBtn.onclick = ()=> applyTheme(
      document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
    );
  }
})();

/* ===== 侧边栏：柔和展开 + 点击已展开收起（之前你要的行为） ===== */
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
      if(item.classList.contains('open')){
        item.classList.remove('open');
      }else{
        items.forEach(i=> i.classList.remove('open'));
        item.classList.add('open');
      }
    });
  });
})();

/* ===== 工具面板：向右柔和隐藏/展开 + 粘顶滚动玻璃态 ===== */
(function setupControlsPanel(){
  const wrap   = $('#controlsWrap');
  const panel  = $('#controlsPanel');
  const handle = $('#controlsHandle');
  if(!wrap || !panel || !handle) return;

  // 折叠/展开
  handle.addEventListener('click', ()=>{
    wrap.classList.toggle('is-collapsed');
    // 切换箭头：⟨ 展开 -> ⟩
    handle.textContent = wrap.classList.contains('is-collapsed') ? '⟩' : '⟨';
  });

  // 滚动时切换玻璃态
  const onScroll = ()=>{
    const sc = window.scrollY || document.documentElement.scrollTop;
    wrap.classList.toggle('scrolled', sc > 10);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive:true });
})();
