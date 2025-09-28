import { DataStore, Modules } from '../core.js';
import { renderTablePreview } from '../app.js';

Modules.set('fill-missing', function(){
  if (!DataStore.rows.length){ document.getElementById('view').innerHTML='<div class="card"><div class="h">请先读取数据</div></div>'; return; }
  const headers=DataStore.headers, view=document.getElementById('view');
  view.innerHTML = `
    <h2 class="h">缺失值填充</h2>
    <div class="card">
      <span class="chip">列</span>
      <select id="col" class="sm">${headers.map(h=>`<option>${h}</option>`).join('')}</select>
      <span class="chip">方式</span>
      <select id="how" class="sm">
        <option value="const">常量</option>
        <option value="ffill">向前填充</option>
        <option value="bfill">向后填充</option>
      </select>
      <input id="constVal" class="sm" placeholder="常量值（当选择常量时生效）"/>
      <button id="btnDo" class="btn sm">执行</button>
      <span id="msg" class="muted"></span>
    </div>
    <div id="preview" class="card"></div>
  `;
  renderTablePreview();
  document.getElementById('btnDo').onclick=()=>{
    const col=document.getElementById('col').value;
    const how=document.getElementById('how').value;
    const val=document.getElementById('constVal').value;
    let cnt=0;
    if (how==='const'){
      for (const r of DataStore.rows){ if (String(r[col]??'').trim()===''){ r[col]=val; cnt++; } }
    }else if (how==='ffill'){
      let last=null;
      for (const r of DataStore.rows){ if (String(r[col]??'').trim()===''){ if(last!=null){ r[col]=last; cnt++; } } else { last=r[col]; } }
    }else{
      let nexts=new Array(DataStore.rows.length).fill(null), last=null;
      for (let i=DataStore.rows.length-1;i>=0;i--){ const v=DataStore.rows[i][col]; if (String(v??'').trim()===''){ nexts[i]=last; } else { last=v; } }
      for (let i=0;i<DataStore.rows.length;i++){ if (String(DataStore.rows[i][col]??'').trim()==='' && nexts[i]!=null){ DataStore.rows[i][col]=nexts[i]; cnt++; } }
    }
    document.getElementById('msg').textContent=` 填充 ${cnt} 个空值`;
    renderTablePreview();
  };
});
