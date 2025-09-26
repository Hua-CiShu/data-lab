import { DataStore, Adapters, Modules, registerAdapter, registerModule, loadFile } from './core.js';
import './adapters/csv.js';
import './adapters/excel.js';
import './adapters/sqlite.js';
import './adapters/json.js';
import './modules/clean.js';
import './modules/analyze.js';

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
