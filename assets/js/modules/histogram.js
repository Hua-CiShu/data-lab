import { DataStore, registerModule } from '../core.js';

const $ = s => document.querySelector(s);

function ensure(){ if(!DataStore.rows.length){ alert('请先读取数据文件'); throw new Error('no data'); } }
async function ensureChart(){ if(!window.Chart){ await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'); } }

function freedmanDiaconisBinCount(values){
  const v = values.filter(n => Number.isFinite(n)).sort((a,b)=>a-b);
  const n = v.length; if(n<2) return 1;
  const q = p => v[Math.floor((n-1)*p)];
  const IQR = q(0.75)-q(0.25);
  if(IQR===0) return Math.ceil(Math.sqrt(n));
  const h = 2*IQR*Math.pow(n,-1/3);
  if(h<=0) return Math.ceil(Math.sqrt(n));
  const bins = Math.ceil((v[n-1]-v[0])/h);
  return Math.min(Math.max(bins,1),60);
}
window.__histFD = freedmanDiaconisBinCount;

registerModule('analyze/hist', async () => {
  ensure(); await ensureChart();
  const headers = DataStore.headers;
  const view = document.getElementById('view');

  view.innerHTML = `
    <h2 class="h">直方图（自动分箱）</h2>
    <div><label>数值列 <select id="hist-col">
      ${headers.map(h=>`<option>${h}</option>`).join('')}
    </select></label>
    <label style="margin-left:8px">最大桶数 <input id="hist-max" type="number" value="60" min="1" max="200" style="width:80px"/></label>
    </div>
    <canvas id="hist-canvas" height="260" style="margin-top:8px"></canvas>
  `;

  const ctx = document.getElementById('hist-canvas');

  function render(){
    const col = $('#hist-col').value;
    const raw = DataStore.rows.map(r => Number(r[col]));
    const vals = raw.filter(n => Number.isFinite(n));
    if(!vals.length){ alert('所选列不是数值列或为空'); return; }
    let k = freedmanDiaconisBinCount(vals);
    const kMax = Math.max(1, Math.min(200, Number($('#hist-max').value || 60)));
    k = Math.min(k, kMax);
    const min = Math.min(...vals), max = Math.max(...vals);
    const width = (max - min) / k || 1;
    const edges = Array.from({length:k+1}, (_,i)=> min + i*width);
    const counts = Array(k).fill(0);
    vals.forEach(x => { const idx = Math.min(Math.floor((x-min)/width), k-1); counts[idx] += 1; });
    const labels = counts.map((_,i)=> `${edges[i].toFixed(2)}–${edges[i+1].toFixed(2)}`);

    if(window.__histChart) window.__histChart.destroy();
    window.__histChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: col, data: counts, backgroundColor:'#2563eb' }] },
      options: { responsive:true } // 使用默认坐标轴颜色（黑/灰），更适配白底
    });
  }

  $('#hist-col').onchange = render;
  $('#hist-max').oninput = render;
  render();
});
