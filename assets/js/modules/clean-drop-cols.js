import { DataStore, Modules } from '../core.js';
import { renderTablePreview } from '../app.js';

Modules.set('drop-cols', function(){
  if (!DataStore.rows.length){ document.getElementById('view').innerHTML='<div class="card"><div class="h">请先读取数据</div></div>'; return; }
  const headers=DataStore.headers, view=document.getElementById('view');
  view.innerHTML = `
    <h2 class="h">删除列</h2>
    <div class="card">
      <select id="cols" class="sm" multiple style="min-width:220px;min-height:140px">${headers.map(h=>`<option>${h}</option>`).join('')}</select>
      <button id="btnDo" class="btn sm">执行</button>
      <span id="msg" class="muted"></span>
    </div>
    <div id="preview" class="card"></div>
  `;
  renderTablePreview();
  document.getElementById('btnDo').onclick=()=>{
    const sel=[...document.getElementById('cols').selectedOptions].map(o=>o.value);
    if (!sel.length){ alert('请选择至少一列'); return; }
    // 从 headers 移除
    DataStore.headers = DataStore.headers.filter(h => !sel.includes(h));
    // 从每行移除
    for (const r of DataStore.rows){ for (const c of sel){ delete r[c]; } }
    document.getElementById('msg').textContent=` 删除列：${sel.join(', ')}`;
    renderTablePreview();
  };
});
