import { DataStore, Modules } from '../core.js';
import { renderTablePreview } from '../app.js';

Modules.set('type-cast', function(){
  if (!DataStore.rows.length){ document.getElementById('view').innerHTML='<div class="card"><div class="h">请先读取数据</div></div>'; return; }
  const headers=DataStore.headers, view=document.getElementById('view');
  view.innerHTML = `
    <h2 class="h">类型转换</h2>
    <div class="card">
      <span class="chip">列</span>
      <select id="col" class="sm">${headers.map(h=>`<option>${h}</option>`).join('')}</select>
      <span class="chip">目标类型</span>
      <select id="to" class="sm">
        <option value="number">数字</option>
        <option value="string">文本</option>
        <option value="date">日期(ISO/常见格式)</option>
      </select>
      <button id="btnDo" class="btn sm">执行</button>
      <span id="msg" class="muted"></span>
    </div>
    <div id="preview" class="card"></div>
  `;
  renderTablePreview();

  document.getElementById('btnDo').onclick=()=>{
    const col=document.getElementById('col').value;
    const to=document.getElementById('to').value;
    let ok=0, bad=0;
    for (const r of DataStore.rows){
      const v=r[col];
      if (to==='number'){
        const n=Number(String(v).replace(/[^\d.-]+/g,'')); if (Number.isFinite(n)){ r[col]=n; ok++; } else bad++;
      }else if (to==='string'){
        r[col]=(v==null?'':String(v)); ok++;
      }else{
        const d=new Date(v); if(!isNaN(d)){ r[col]=d.toISOString().slice(0,10); ok++; } else bad++;
      }
    }
    document.getElementById('msg').textContent=` 转换成功 ${ok} 项，失败 ${bad} 项`;
    renderTablePreview();
  };
});
