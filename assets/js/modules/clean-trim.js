import { DataStore, Modules } from '../core.js';
import { renderTablePreview } from '../app.js';

Modules.set('trim', function(){
  if (!DataStore.rows.length){ document.getElementById('view').innerHTML='<div class="card"><div class="h">请先读取数据</div></div>'; return; }
  const headers=DataStore.headers, view=document.getElementById('view');
  view.innerHTML = `
    <h2 class="h">首尾空白清理</h2>
    <div class="card">
      <p class="muted">对选中列或全部列去掉前后空白。</p>
      <span class="chip">列</span>
      <select id="cols" class="sm" multiple style="min-width:220px;min-height:120px">${headers.map(h=>`<option>${h}</option>`).join('')}</select>
      <button id="btnDo" class="btn sm">执行</button>
      <span id="msg" class="muted"></span>
    </div>
    <div id="preview" class="card"></div>
  `;
  renderTablePreview();
  document.getElementById('btnDo').onclick=()=>{
    const sel=[...document.getElementById('cols').selectedOptions].map(o=>o.value);
    const cols= sel.length? sel : headers;
    let cnt=0;
    for (const r of DataStore.rows){ for (const c of cols){ const v=r[c]; if (v!=null && typeof v==='string'){ const nv=v.trim(); if (nv!==v){ r[c]=nv; cnt++; } } } }
    document.getElementById('msg').textContent=` 已修剪 ${cnt} 个单元格`;
    renderTablePreview();
  };
});
