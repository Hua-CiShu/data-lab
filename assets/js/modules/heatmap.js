import { DataStore, registerModule } from '../core.js';

const $ = s => document.querySelector(s);
function ensure(){ if(!DataStore.rows.length){ alert('请先读取数据文件'); throw new Error('no data'); } }
async function ensurePlotly(){
  if(!window.Plotly){
    await new Promise((resolve, reject)=>{
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/plotly.js-dist-min@2.35.2/plotly.min.js';
      s.onload = resolve; s.onerror = ()=>reject(new Error('Plotly load failed'));
      document.head.appendChild(s);
    });
  }
}

registerModule('analyze/heatmap', async () => {
  ensure();
  try { await ensurePlotly(); } catch(e){ alert('热力图依赖加载失败'); return; }

  const headers = DataStore.headers;
  const view = document.getElementById('view');
  view.innerHTML = `
    <h2 class="h">热力图（类别×类别 频次）</h2>
    <div>
      <label>X 列 <select id="hm-x">${headers.map(h=>`<option>${h}</option>`).join('')}</select></label>
      <label style="margin-left:8px">Y 列 <select id="hm-y">${headers.map(h=>`<option>${h}</option>`).join('')}</select></label>
      <label style="margin-left:8px">Top 类别上限 <input id="hm-top" type="number" value="20" min="2" max="100" style="width:80px"/></label>
    </div>
    <div id="hm-plot" style="height:420px;margin-top:10px"></div>
  `;

  function topCategories(values, topN){
    const m = new Map();
    values.forEach(v=>{
      const k = String(v ?? '').trim(); if(!k) return;
      m.set(k, (m.get(k)||0)+1);
    });
    return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0, topN).map(([k])=>k);
  }
  function buildMatrix(xKey, yKey, topN){
    const xs = topCategories(DataStore.rows.map(r=>r[xKey]), topN);
    const ys = topCategories(DataStore.rows.map(r=>r[yKey]), topN);
    const xi = new Map(xs.map((v,i)=>[v,i]));
    const yi = new Map(ys.map((v,i)=>[v,i]));
    const z = Array.from({length:ys.length}, ()=>Array(xs.length).fill(0));
    DataStore.rows.forEach(r=>{
      const x = String(r[xKey] ?? '').trim();
      const y = String(r[yKey] ?? '').trim();
      if(xi.has(x) && yi.has(y)) z[yi.get(y)][xi.get(x)]++;
    });
    return { xs, ys, z };
  }

  function render(){
    const xCol = $('#hm-x').value;
    const yCol = $('#hm-y').value;
    const topN = Math.max(2, Math.min(100, Number($('#hm-top').value || 20)));
    const { xs, ys, z } = buildMatrix(xCol, yCol, topN);
    if(xs.length===0 || ys.length===0){ $('#hm-plot').innerHTML = '<p class="muted">无足够类别数据</p>'; return; }

    const data = [{
      type:'heatmap', z, x:xs, y:ys,
      colorscale: [
        [0.0,'#eff6ff'], [0.2,'#cfe0fd'], [0.5,'#93c5fd'], [0.8,'#3b82f6'], [1.0,'#1d4ed8']
      ],
      hovertemplate: `${yCol}=%{y}<br>${xCol}=%{x}<br>count=%{z}<extra></extra>`
    }];
    const layout = {
      paper_bgcolor:'#ffffff', plot_bgcolor:'#ffffff',
      margin:{l:60,r:20,t:10,b:60},
      xaxis:{ tickfont:{color:'#111827'}, gridcolor:'#e5e7eb' },
      yaxis:{ tickfont:{color:'#111827'}, gridcolor:'#e5e7eb' }
    };
    window.Plotly.newPlot('hm-plot', data, layout, {displayModeBar:false, responsive:true});
  }

  $('#hm-x').onchange = render;
  $('#hm-y').onchange = render;
  $('#hm-top').oninput = render;
  render();
});
