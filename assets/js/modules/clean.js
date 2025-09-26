import { DataStore, registerModule, exportCSV } from '../core.js';
import { renderTablePreview, escapeHTML } from '../app.js';

function ensure(){ if(!DataStore.rows.length){ alert('请先读取数据文件'); throw new Error('no data'); } }

registerModule('clean/remove-empty', () => {
  ensure();
  const before = DataStore.rows.length;
  const rows = DataStore.rows.filter(r => DataStore.headers.some(h => String(r[h]||'').trim() !== ''));
  DataStore.set({ headers: DataStore.headers, rows });
  renderTablePreview();
  document.getElementById('view').innerHTML = `<h2 class="h">删除空行</h2><p class="muted">删除 ${before-rows.length} 行空记录。</p>`;
});

registerModule('clean/dedupe', () => {
  ensure();
  const view = document.getElementById('view');
  view.innerHTML = `<h2 class="h">按列去重</h2>
    <div><label>选择列 <select id="dedupeCol">${DataStore.headers.map(h=>`<option>${escapeHTML(h)}</option>`).join('')}</select></label>
    <button class="btn" id="runDedupe">执行</button></div>
    <div id="dedupeResult" class="muted" style="margin-top:8px">待执行</div>`;
  document.getElementById('runDedupe').onclick = () => {
    const col = document.getElementById('dedupeCol').value;
    const seen = new Set();
    const before = DataStore.rows.length;
    const rows = DataStore.rows.filter(r => { const k = String(r[col]??''); if(seen.has(k)) return false; seen.add(k); return true; });
    DataStore.set({ headers: DataStore.headers, rows }); renderTablePreview();
    document.getElementById('dedupeResult').textContent = `去重完成：从 ${before} → ${rows.length}`;
  };
});

registerModule('clean/export', () => {
  ensure(); exportCSV();
  document.getElementById('view').innerHTML = `<h2 class="h">导出 CSV</h2><p class="muted">已开始下载 export.csv</p>`;
});
