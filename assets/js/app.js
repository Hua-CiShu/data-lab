// ========== app.js (可覆盖版) ==========

import { DataStore, Adapters, Modules, loadFile } from './core.js';

// 按需引入你已经有的模块
import './adapters/csv.js';
import './adapters/excel.js';
import './adapters/sqlite.js';
import './adapters/json.js';

import './modules/clean.js';
import './modules/analyze.js';

// 如果你已添加下面这些模块，请保留；未添加可以删掉对应行
import './modules/histogram.js';
import './modules/heatmap.js';   // Plotly 版
import './modules/wordcloud.js';

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* ========== 基础工具 ========== */
export function escapeHTML(s){
  return String(s).replace(/[&<>"']/g, m => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[m]));
}

function renderMeta(){
  const chip = $('#metaChip');
  if (!chip) return;
  chip.textContent = DataStore.rows.length
    ? `列 ${DataStore.headers.length} · 行 ${DataStore.rows.length}`
    : '未加载';
}

export function renderTablePreview(rows = DataStore.rows, limit=20){
  const el = $('#preview');
  if(!el) return;

  if(!rows.length){
    el.innerHTML = '<p class="muted">暂无数据预览。</p>';
    return;
  }
  const headers = DataStore.headers;
  const top = rows.slice(0, limit);
  const thead = '<tr>' + headers.map(h=>`<th>${escapeHTML(h)}</th>`).join('') + '</tr>';
  const tbody = top.map(r => '<tr>' + headers.map(h=>`<td>${escapeHTML(r[h] ?? '')}</td>`).join('') + '</tr>').join('');
  el.innerHTML = `<div class="h">数据预览（前 ${limit} 行）</div>
                  <div class="grid"><div class="card" style="overflow:auto">
                  <table>${thead}${tbody}</table></div></div>`;
}

function ensureData(){
  if(!DataStore.rows.length){
    alert('请先读取数据文件');
    throw new Error('no data');
  }
}

/* ========== 路由绑定（点击左侧子菜单触发模块） ========== */
$$('[data-route]').forEach(el=>{
  el.addEventListener('click', ()=>{
    const route = el.getAttribute('data-route');
    if(route === 'home'){
      const v = $('#view');
      if(v) v.innerHTML = '<h2 class="h">欢迎</h2><p class="muted">请选择模块开始。</p>';
      return;
    }
    const mod = Modules.get(route);
    if(mod) mod();
  });
});

/* ========== 顶部按钮：读取/预览/自检 ========== */
const btnLoad    = $('#btnLoad');
const btnPreview = $('#btnPreview');
const btnTests   = $('#btnTests');

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
  btnPreview.onclick = () => renderTablePreview();
}

if(btnTests){
  btnTests.onclick = () => {
    // 轻量自检：导出规则/转义
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

/* ========== 初始视图 ========== */
const view = $('#view');
if(view){
  view.innerHTML = '<h2 class="h">欢迎</h2><p class="muted">请选择模块开始。</p>';
}

/* ========== 主题：深/浅切换（含图表联动） ========== */
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

  // Chart.js 全局颜色
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
  // Plotly 热力图（如当前页存在）
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

/* ========== 侧边栏：柔和展开 + 保持展开（直到指向别的大模块） ========== */
/* ========== 侧边栏：柔和展开 + 保持展开；点击已展开则收起 ========== */
(function setupSidebarStickyOpen(){
  const items = Array.from(document.querySelectorAll('.nav-item'));
  const heads = Array.from(document.querySelectorAll('.nav-head'));

  // 可选：默认展开第一个
  if(items[0]) items[0].classList.add('open');

  heads.forEach(head=>{
    const item = head.closest('.nav-item');

    // 悬停：如果不是当前展开项，则切换到它（保持“指到哪个展开哪个”的体验）
    head.addEventListener('mouseenter', ()=>{
      if(!item.classList.contains('open')){
        items.forEach(i=> i.classList.remove('open'));
        item.classList.add('open');
      }
    });

    // 点击：如果已展开则收起；否则独占展开（你要的“点击已展开的大模块→缩回去”）
    head.addEventListener('click', ()=>{
      if(item.classList.contains('open')){
        item.classList.remove('open');
      }else{
        items.forEach(i=> i.classList.remove('open'));
        item.classList.add('open');
      }
    });
  });

  // 不在 mouseleave 时自动关闭；除非切到另一个大模块或手动点击
})();

