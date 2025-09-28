import { DataStore, Modules } from '../core.js';
import { renderTablePreview } from '../app.js';

Modules.set('dedupe', function(){
  if (!DataStore.rows.length){ document.getElementById('view').innerHTML='<div class="card"><div class="h">请先读取数据</div></div>'; return; }
  const headers=DataStore.headers, view=document.getElementById('view');
  view.innerHTML = `
    <h2 class="h">重复行去重</h2>
    <div class="card">
      <span class="chip">按列组合去重（默认所有列）</span>
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
    const seen=new Set(); const out=[]; let drop=0;
    for (const r of DataStore.rows){
      const key = JSON.stringify(cols.map(c=>r[c]));
      if (seen.has(key)) drop++; else { seen.add(key); out.push(r); }
    }
    DataStore.rows = out;
    document.getElementById('msg').textContent=` 删除重复 ${drop} 行`;
    renderTablePreview();
  };
});
