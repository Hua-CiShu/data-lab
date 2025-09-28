// ========== assets/js/app.js (FULL) ==========

import { DataStore, Modules, loadFile } from './core.js';
import './adapters/csv.js';
import './adapters/excel.js';
import './adapters/sqlite.js';
import './adapters/json.js';
import './modules/clean.js';
import './modules/analyze.js';
import './modules/histogram.js';
import './modules/heatmap.js';
import './modules/wordcloud.js';

const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

/* ---------- 工具 ---------- */
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
function selectedRowLimit(){ return Math.max(1, Math.min(200, Number($('#previewRows')?.value||10))); }
export function renderTablePreview(rows = DataStore.rows){
  const el = $('#preview'); if(!el) return;
  if(!rows.length){ el.innerHTML = '<p class="muted">暂无数据预览。</p>'; return; }
  const headers = DataStore.headers, rowLimit = selectedRowLimit();
  const top = rows.slice(0, rowLimit);
  const thead = '<tr>'+headers.map(h=>`<th>${escapeHTML(h)}</th>`).join('')+'</tr>';
  const tbody = top.map(r=>'<tr>'+headers.map(h=>`<td>${escapeHTML(r[h]??'')}</td>`).join('')+'</tr>').join('');
  el.innerHTML = `<div class="h">数据预览（前 ${rowLimit} 行）</div>
    <div class="grid"><div class="card" style="overflow:auto"><table>${thead}${tbody}</table></div></div>`;
}
function ensureData(){ if(!DataStore.rows.length){ alert('请先读取数据文件'); throw new Error('no data'); } }

/* ---------- 路由 ---------- */
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

/* ---------- 读取/预览 ---------- */
$('#btnLoad')?.addEventListener('click', async ()=>{
  const type = $('#adapterSelect')?.value;
  const file = $('#fileInput')?.files?.[0];
  if(!file){ alert('请选择一个文件'); return; }
  try{
    await loadFile(type, file);
    renderMeta(); renderTablePreview();
  }catch(e){ alert('解析失败：'+e); }
});
$('#btnPreview')?.addEventListener('click', ()=>{ ensureData(); renderTablePreview(); });
$('#previewRows')?.addEventListener('change', ()=>{ if(DataStore.rows.length) renderTablePreview(); });

/* ---------- 自检 ---------- */
$('#btnTests')?.addEventListener('click', ()=>{
  const NEED=/[",\n]/, cell=v=>{ if(v==null) return ''; const s=String(v).replace(/"/g,'""'); return NEED.test(s)?`"${s}"`:s; };
  const cases=[
    ['csvCell 普通', cell('a')==='a'],
    ['csvCell 逗号', cell('a,b')==='"a,b"'],
    ['csvCell 引号', cell('a"b')==='"a""b"'],
    ['csvCell 换行', cell('a\nb')==='"a\nb"'],
    ['escapeHTML', escapeHTML('<x>')==='&lt;x&gt;'],
  ];
  const ok=cases.filter(c=>c[1]).length;
  const t=$('#tests');
  if(t){
    t.innerHTML=`自检：<span class="pass">${ok}</span>/${cases.length} 通过<ul>`
      +cases.map(([n,p])=>`<li>${p?'<span class="pass">✔</span>':'<span class="fail">✘</span>'} ${n}</li>`).join('')
      +'</ul>';
  }
});

/* ---------- 初始欢迎 ---------- */
const view=$('#view');
if(view){
  view.innerHTML='<h2 class="h">欢迎</h2><p class="muted">请选择模块开始。</p><p><a class="btn secondary" href="./samples/sample.csv" download>下载示例 CSV</a></p>';
}

/* ---------- 主题切换（按钮文本仅图标切换） ---------- */
const themeBtn=$('#themeToggle');
function prefersDark(){ return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; }
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  try{ localStorage.setItem('theme', theme); }catch{}
  if(themeBtn){ themeBtn.textContent = theme==='dark' ? '🌞' : '🌙'; }

  // 可选：图表主题适配
  if(window.Chart){
    const dark=theme==='dark';
    window.Chart.defaults.color = dark ? '#e5e7eb' : '#111827';
    window.Chart.defaults.borderColor = dark ? 'rgba(255,255,255,.16)' : '#e5e7eb';
    if(window.__histChart){
      const c=window.__histChart;
      ['x','y'].forEach(ax=>{
        c.options.scales[ax]=c.options.scales[ax]||{};
        c.options.scales[ax].ticks={...(c.options.scales[ax].ticks||{}), color:window.Chart.defaults.color};
        c.options.scales[ax].grid={...(c.options.scales[ax].grid||{}), color:dark?'rgba(255,255,255,.12)':'#e5e7eb'};
      });
      c.update();
    }
  }
  if(window.Plotly){
    const el=document.getElementById('hm-plot');
    if(el && el.data){
      window.Plotly.relayout(el,{
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
  const saved=(()=>{ try{ return localStorage.getItem('theme'); }catch{ return null; } })();
  applyTheme(saved || (prefersDark() ? 'dark' : 'light'));
  themeBtn?.addEventListener('click', ()=>{
    applyTheme(document.documentElement.getAttribute('data-theme')==='dark' ? 'light' : 'dark');
  });
})();

/* ---------- 侧栏 hover 展开/点击保持 ---------- */
(function setupSidebarHover(){
  const items=[...document.querySelectorAll('.nav-item')];
  const heads=[...document.querySelectorAll('.nav-head')];
  if(items[0]) items[0].classList.add('open');

  heads.forEach(head=>{
    const item=head.closest('.nav-item');
    head.addEventListener('mouseenter', ()=>{
      if(!item.classList.contains('open')){
        items.forEach(i=>i.classList.remove('open'));
        item.classList.add('open');
      }
    });
    head.addEventListener('click', ()=>{
      if(item.classList.contains('open')) item.classList.remove('open');
      else{ items.forEach(i=>i.classList.remove('open')); item.classList.add('open'); }
    });
  });
})();

/* ---------- 工具组：测高 + 占位固定 + 扇形缓收（把手固定坐标） ---------- */
(function setupControlsFloating(){
  const wrap=document.getElementById('controlsWrap');
  const panel=document.getElementById('controlsPanel');
  const btnInline=document.getElementById('controlsToggle');

  // 清除重复把手
  document.querySelectorAll('#controlsHandle').forEach((n,i)=>{ if(i>0) n.remove(); });

  // 固定坐标的把手（右上角）
  let handle=document.getElementById('controlsHandle');
  if(!handle){
    handle=document.createElement('button');
    handle.id='controlsHandle';
    handle.type='button';
    handle.textContent='⟨';  // 展开时向左（点击=收起）
    document.body.appendChild(handle);
  }

  // 记录“展开时”的真实高度，正文始终按此留白
  let measured=64;
  function measure(){
    if(!panel) return;
    const h=Math.round(panel.getBoundingClientRect().height+12);
    measured=h;
    document.documentElement.style.setProperty('--controls-h', measured+'px');
  }

  function setCollapsed(collapsed){
    if(!wrap) return;
    wrap.classList.toggle('is-collapsed', !!collapsed);
    document.body.classList.toggle('controls-collapsed', !!collapsed);  // 控制把手显隐
    if(btnInline) btnInline.textContent = collapsed ? '⟨' : '⟩';
    handle.textContent = collapsed ? '⟩' : '⟨';
    document.documentElement.style.setProperty('--controls-h', measured+'px');
  }

  btnInline?.addEventListener('click', ()=> setCollapsed(!wrap.classList.contains('is-collapsed')));
  handle.addEventListener('click', ()=> setCollapsed(false));

  // 初始展开 + 反复测高
  setCollapsed(false);
  const remeasure=()=>{ if(!wrap.classList.contains('is-collapsed')) measure(); };
  window.addEventListener('resize', remeasure, {passive:true});
  setTimeout(remeasure,0); setTimeout(remeasure,150); window.addEventListener('load', remeasure);
})();

/* ---------- 侧栏把手：内部右上角；展开 ↔ 紧凑(50%) ---------- */
(function setupSidebarPin(){
  const sidebar=document.querySelector('.sidebar');
  if(!sidebar) return;

  // 清除历史
  document.querySelectorAll('#sidebarPin').forEach((n,i)=>{ if(i>0) n.remove(); });

  // 创建把手（内部右上角）
  let pin=document.getElementById('sidebarPin');
  if(!pin){
    pin=document.createElement('button');
    pin.id='sidebarPin';
    pin.type='button';
    pin.textContent='⟨';          // 展开状态显示“向左”，点击进入紧凑
    sidebar.appendChild(pin);
  }

  // 切换侧栏模式：展开 <-> 紧凑
  function setCompact(compact){
    document.body.classList.toggle('sidebar-compact', !!compact);
    // 紧凑时，仍显示把手（依然在内部右上角），点击可回到展开
    pin.textContent = compact ? '⟩' : '⟨';
  }

  pin.addEventListener('click', ()=>{
    const compact = !document.body.classList.contains('sidebar-compact');
    setCompact(compact);
  });

  // 初始：展开
  setCompact(false);
})();
