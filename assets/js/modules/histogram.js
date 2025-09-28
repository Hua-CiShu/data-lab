import { DataStore, Modules } from '../core.js';
import { escapeHTML } from '../app.js';

Modules.set('histogram', function(){
  const view=document.getElementById('view');
  if(!DataStore.rows.length){ view.innerHTML='<div class="card"><div class="h">请先读取数据</div></div>'; return; }
  const headers=DataStore.headers;
  view.innerHTML = `
    <h2 class="h">直方图（自动分箱）</h2>
    <div class="card">
      <span class="chip">数值列</span>
      <select id="hisCol" class="sm">${headers.map(h=>`<option>${escapeHTML(h)}</option>`).join('')}</select>
      <button id="hisBtn" class="btn sm">生成</button>
    </div>
    <div class="card"><canvas id="hisChart" style="width:100%;height:360px"></canvas></div>
  `;
  const btn=document.getElementById('hisBtn');
  btn.addEventListener('click', ()=>{
    const col=document.getElementById('hisCol').value;
    const nums=DataStore.rows.map(r=>Number(r[col])).filter(n=>Number.isFinite(n));
    if(!nums.length){ alert('该列无数值'); return; }
    const k=Math.ceil(Math.log2(nums.length)+1);
    const min=Math.min(...nums), max=Math.max(...nums);
    const bin=(max-min)/k || 1; const edges=Array.from({length:k+1},(_,i)=>min+i*bin);
    const counts=new Array(k).fill(0);
    nums.forEach(v=>{ const idx=Math.min(k-1, Math.max(0, Math.floor((v-min)/bin))); counts[idx]++; });
    const labels=edges.slice(0,-1).map((e,i)=>`${edges[i].toFixed(1)}~${edges[i+1].toFixed(1)}`);
    const ctx=document.getElementById('hisChart').getContext('2d');
    if(window.__histChart) window.__histChart.destroy();
    // global Chart
    window.__histChart=new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:`${col} 频数`,data:counts}]} ,options:{responsive:true,maintainAspectRatio:false}});
  });
});
