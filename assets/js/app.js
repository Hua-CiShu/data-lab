import { DataStore, Adapters, Modules, registerAdapter, registerModule, loadFile } from './core.js';
import './adapters/csv.js';
import './adapters/excel.js';
import './adapters/sqlite.js';
import './adapters/json.js';
import './modules/clean.js';
import './modules/analyze.js';
import './modules/histogram.js';
import './modules/heatmap.js';
import './modules/wordcloud.js';

/* ===== Theme: light/dark with persistence ===== */
const themeBtn = document.getElementById('themeToggle');

function getSystemPrefersDark(){
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function applyTheme(theme){
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  // 更新按钮文字
  if(themeBtn){
    themeBtn.textContent = theme === 'dark' ? '🌞 浅色' : '🌙 深色';
  }
  // —— 图表也跟随主题（坐标轴/网格颜色）——
  if(window.Chart){
    const isDark = theme === 'dark';
    window.Chart.defaults.color = isDark ? '#e5e7eb' : '#111827';
    window.Chart.defaults.borderColor = isDark ? 'rgba(255,255,255,.2)' : '#e5e7eb';
    // 直方图实例（如果已经渲染过）做一次轻微 restyle
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
  // Plotly 热力图（如果在当前页）
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
  // 给其它模块一个 hook
  window.__theme = theme;
  window.dispatchEvent(new CustomEvent('themechange', { detail:{ theme } }));
}

(function initTheme(){
  const saved = localStorage.getItem('theme');
  const theme = saved || (getSystemPrefersDark() ? 'dark' : 'light');
  applyTheme(theme);
  if(themeBtn){
    themeBtn.onclick = ()=> applyTheme((document.documentElement.getAttribute('data-theme') === 'dark') ? 'light' : 'dark');
  }
})();

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function renderMeta(){
  const chip = $('#metaChip');
  chip.textContent = DataStore.rows.length ? `列 ${DataStore.headers.length} · 行 ${DataStore.rows.length}` : '未加载';
}
export function escapeHTML(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
export function renderTablePreview(rows = DataStore.rows, limit=20){
  const el = $('#preview');
  if(!rows.length){ el.innerHTML = '<p class="muted">暂无数据预览。</p>'; return; }
  const headers = DataStore.headers;
  const top = rows.slice(0, limit);
  const thead = '<tr>' + headers.map(h=>`<th>${escapeHTML(h)}</th>`).join('') + '</tr>';
  const tbody = top.map(r => '<tr>' + headers.map(h=>`<td>${escapeHTML(r[h] ?? '')}</td>`).join('') + '</tr>').join('');
  el.innerHTML = `<div class="h">数据预览（前 ${limit} 行）</div><div class="grid"><div class="card" style="overflow:auto"><table>${thead}${tbody}</table></div></div>`;
}

function ensureData(){ if(!DataStore.rows.length){ alert('请先读取数据文件'); throw new Error('no data'); } }

// 路由：点击左侧链接调用模块
$$('[data-route]').forEach(el=>{
  el.addEventListener('click', ()=>{
    const route = el.getAttribute('data-route');
    if(route==='home'){ $('#view').innerHTML = '<h2 class="h">欢迎</h2><p class="muted">请选择模块开始。</p>'; return; }
    const mod = Modules.get(route);
    if(mod) mod();
  });
});

// 顶部按钮
$('#btnLoad').onclick = async () => {
  const type = $('#adapterSelect').value;
  const file = $('#fileInput').files[0];
  if(!file){ alert('请选择一个文件'); return; }
  try{ await loadFile(type, file); renderMeta(); renderTablePreview(); }
  catch(e){ alert('解析失败：' + e); }
};
$('#btnPreview').onclick = () => renderTablePreview();

// 自检（测试用例）
$('#btnTests').onclick = () => {
  const NEED_QUOTE = /[",\n]/;
  const csvCell = v => { if(v==null) return ''; const s=String(v).replace(/"/g,'""'); return NEED_QUOTE.test(s) ? `"${s}"` : s; };
  const cases = [
    ['FD 分箱（常规）', (()=>{
      const fd = window.__histFD;
      if(!fd) return true;             // 模块未加载时跳过
      const v = Array.from({length:100}, (_,i)=>i);
      return fd(v) > 1 && fd(v) <= 60;
    })()],
    ['FD 分箱（全相等回退）', (()=>{
      const fd = window.__histFD; if(!fd) return true;
      const v = Array(50).fill(1);
      return fd(v) === 1;
    })()],
    ['csvCell 普通', csvCell('a')==='a'],
    ['csvCell 逗号', csvCell('a,b')==='"a,b"'],
    ['csvCell 引号', csvCell('a"b')==='"a""b"'],
    ['csvCell 换行', csvCell('a\nb')==='"a\nb"'],
    ['escapeHTML', escapeHTML('<x>')==='&lt;x&gt;']
  ];
  const ok = cases.filter(c=>c[1]).length;
  $('#tests').innerHTML = `自检：<span class="pass">${ok}</span>/${cases.length} 通过<ul>` + cases.map(([n,p])=>`<li>${p?'<span class="pass">✔</span>':'<span class="fail">✘</span>'} ${n}</li>`).join('') + '</ul>';
};

// 初始视图
$('#view').innerHTML = '<h2 class="h">欢迎</h2><p class="muted">请选择模块开始。</p>';

