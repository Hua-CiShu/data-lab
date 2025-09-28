import { DataStore, Modules } from '../core.js';
import { renderTablePreview } from '../app.js';

Modules.set('drop-empty', function(){
  if (!DataStore.rows.length){ document.getElementById('view').innerHTML='<div class="card"><div class="h">请先读取数据</div></div>'; return; }
  const headers=DataStore.headers, view=document.getElementById('view');
  view.innerHTML = `
    <h2 class="h">空行删除</h2>
    <div class="card">
      <p class="muted">删除所有列都为空白/Null 的行。</p>
      <button id="btnDo" class="btn sm">执行</button>
      <span id="msg" class="muted"></span>
    </div>
    <div id="preview" class="card"></div>
  `;
  renderTablePreview();
  document.getElementById('btnDo').onclick=()=>{
    const before = DataStore.rows.length;
    DataStore.rows = DataStore.rows.filter(r => headers.some(h => String(r[h]??'').trim()!==''));
    const after = DataStore.rows.length;
    document.getElementById('msg').textContent = ` 已删除 ${before-after} 行`;
    renderTablePreview();
  };
});
