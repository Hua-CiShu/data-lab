import { DataStore, registerModule } from '../core.js';

const $ = s => document.querySelector(s);

function ensure(){ if(!DataStore.rows.length){ alert('请先读取数据文件'); throw new Error('no data'); } }

// —— 稳健的按需加载：先保证 Chart.js，再保证 matrix 控制器 —— //
async function ensureChartMatrix(){
  // 1) Chart.js
  if(!window.Chart){
    await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js');
  }
  // 2) matrix 控制器（chartjs-chart-matrix）
  // 在 Chart.js v4 里是“controller”，而不是“plugin”
  const hasMatrix = !!(window.Chart?.registry?.getController?.('matrix'));
  if(!hasMatrix){
    await loadScript('https://cdn.jsdelivr.net/npm/chartjs-chart-matrix@2.0.1/dist/chartjs-chart-matrix.umd.min.js');
  }
}

function loadScript(src){
  return new Promise((resolve, reject)=>{
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('failed to load ' + src));
    document.head.appendChild(s);
  });
}

registerModule('analyze/heatmap', async () => {
  ensure();
  try{
    await ensureChartMatrix();
  }catch(e){
    console.error(e);
    alert('热力图依赖加载失败，请刷新重试或检查网络。');
    return;
  }

  const headers = DataStore.headers;
  const view = document.getElementById('view');
  view.innerHTML = `
    <h2 class="h">热力图（频次）</h2>
    <div>
      <label>X 列 <select id="hm-x">${headers.map(h=>`<option>${h}</option>`).join('')}</select></label>
      <label style="margin-left:8px">Y 列 <select id="hm-y">${headers.map(h=>`<option>${h}</option>`).join('')}</select></label>
      <label style="margin-left:8px">Top 类别上限 <input id="hm-top" type="number" value="20" min="2" max="100" style="width:80px"/></label>
    </div>
    <canvas id="hm-canvas" height="320" style="margin-top:8px"></canvas>
    <p class="muted">说明：对非数值列按“类别”统计交叉频次；若类别过多，仅取出现频次最高的 Top N。</p>
  `;

  const ctx = document.getElementById('hm-canvas');

  function categoryList(values, topN){
    const freq = new Map();
    values.forEach(v => {
      const key = String(v ?? '').trim();
      if(!key) return;
      freq.set(key, (freq.get(key)||0)+1);
    });
    return [...freq.entries()].sort((a,b)=> b[1]-a[1]).slice(0, topN).map(([k])=>k);
  }

  function buildMatrix(xKey, yKey, topN){
    const xs = categoryList(DataStore.rows.map(r=>r[xKey]), topN);
    const ys = categoryList(DataStore.rows.map(r=>r[yKey]), topN);
    const idxX = new Map(xs.map((v,i)=>[v,i]));
    const idxY = new Map(ys.map((v,i)=>[v,i]));
    const mat = Array.from({length:ys.length}, ()=> Array(xs.length).fill(0));
    DataStore.rows.forEach(r=>{
      const xv = String(r[xKey] ?? '').trim();
      const yv = String(r[yKey] ?? '').trim();
      if(idxX.has(xv) && idxY.has(yv)){ mat[idxY.get(yv)][idxX.get(xv)]++; }
    });
    const data = [];
    for(let yi=0; yi<ys.length; yi++){
      for(let xi=0; xi<xs.length; xi++){
        data.push({ x: xs[xi], y: ys[yi], v: mat[yi][xi] });
      }
    }
    const vmax = data.reduce((m,d)=>Math.max(m,d.v), 0)||1;
    return { xs, ys, data, vmax };
  }

  function render(){
    const x = $('#hm-x').value, y = $('#hm-y').value, topN = Math.max(2, Math.min(100, Number($('#hm-top').value||20)));
    const { xs, ys, data, vmax } = buildMatrix(x, y, topN);

    if(window.__hmChart) window.__hmChart.destroy();
    window.__hmChart = new Chart(ctx, {
      type: 'matrix',
      data: {
        datasets: [{
          label: `${x} × ${y}`,
          data,
          width: ({chart}) => (chart.chartArea.right - chart.chartArea.left) / Math.max(1, xs.length),
          height: ({chart}) => (chart.chartArea.bottom - chart.chartArea.top) / Math.max(1, ys.length),
          backgroundColor: c => {
            const t = (c.raw.v / vmax);
            const alpha = Math.max(0.08, t); // 低值也有淡色
            return `rgba(0,255,198,${alpha})`; // 霓虹青
          },
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,.12)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { type: 'category', labels: xs, ticks:{ color:'#cfe8ff' }, grid:{ color:'rgba(255,255,255,.08)' } },
          y: { type: 'category', labels: ys, ticks:{ color:'#cfe8ff' }, grid:{ color:'rgba(255,255,255,.08)' } }
        },
        plugins: { legend:{ labels:{ color:'#cfe8ff' } }, tooltip:{ callbacks:{ label: ctx => ` ${ctx.raw.y} × ${ctx.raw.x}: ${ctx.raw.v}` } } }
      }
    });
  }

  $('#hm-x').onchange = render;
  $('#hm-y').onchange = render;
  $('#hm-top').oninput = render;
  render();
});
