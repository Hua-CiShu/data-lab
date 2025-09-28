import { DataStore, Modules } from '../core.js';
import { escapeHTML } from '../app.js';

Modules.set('heatmap', function(){
  const view=document.getElementById('view');
  if(!DataStore.rows.length){ view.innerHTML='<div class="card"><div class="h">请先读取数据</div></div>'; return; }
  const headers=DataStore.headers;
  view.innerHTML = `
    <h2 class="h">热力图</h2>
    <div class="card">
      <span class="chip">X列</span>
      <select id="hmX" class="sm">${headers.map(h=>`<option>${escapeHTML(h)}</option>`).join('')}</select>
      <span class="chip">Y列</span>
      <select id="hmY" class="sm">${headers.map(h=>`<option>${escapeHTML(h)}</option>`).join('')}</select>
      <span class="chip">值列</span>
      <select id="hmV" class="sm">${headers.map(h=>`<option>${escapeHTML(h)}</option>`).join('')}</select>
      <button id="hmBtn" class="btn sm">生成</button>
    </div>
    <div class="card"><div id="hm-plot" style="width:100%;height:420px"></div></div>
  `;
  document.getElementById('hmBtn').addEventListener('click', ()=>{
    if(!window.Plotly){ alert('Plotly 未加载'); return; }
    const X=document.getElementById('hmX').value, Y=document.getElementById('hmY').value, V=document.getElementById('hmV').value;
    const xVals=[...new Set(DataStore.rows.map(r=>String(r[X]??'')).filter(s=>s!==''))];
    const yVals=[...new Set(DataStore.rows.map(r=>String(r[Y]??'')).filter(s=>s!==''))];
    const z=Array.from({length:yVals.length},()=>Array(xVals.length).fill(0));
    DataStore.rows.forEach(r=>{
      const xi=xVals.indexOf(String(r[X]??'')), yi=yVals.indexOf(String(r[Y]??'')); const v=Number(r[V]);
      if(xi>=0 && yi>=0 && Number.isFinite(v)) z[yi][xi]+=v;
    });
    const el=document.getElementById('hm-plot');
    const theme=document.documentElement.getAttribute('data-theme')||'light';
    window.Plotly.newPlot(el,[{z, x:xVals, y:yVals, type:'heatmap', colorscale:'Blues'}],{
      paper_bgcolor: theme==='dark'?'#0b1222':'#ffffff', plot_bgcolor: theme==='dark'?'#0b1222':'#ffffff',
      margin:{l:40,r:10,t:10,b:40}
    },{displayModeBar:false});
  });
});
