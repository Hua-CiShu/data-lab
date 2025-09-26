import { DataStore, registerModule } from '../core.js';

function ensure(){ if(!DataStore.rows.length){ alert('请先读取数据文件'); throw new Error('no data'); } }
async function ensureChart(){ if(!window.Chart){ await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'); } }
let chartInstance=null; function draw(canvas, type, labels, data, label){ if(chartInstance) chartInstance.destroy(); chartInstance = new window.Chart(canvas,{ type, data:{ labels, datasets:[{ label, data }] }, options:{ responsive:true }}); }
function colSel(id){ return `<label>选择列 <select id="${id}">${DataStore.headers.map(h=>`<option>${h}</option>`).join('')}</select></label>`; }
const $ = s => document.querySelector(s);

registerModule('analyze/line', async () => {
  ensure(); await ensureChart();
  const view = document.getElementById('view');
  view.innerHTML = `<h2 class="h">折线图</h2><div>${colSel('x')}${colSel('y')}</div><canvas id="c1" height="260"></canvas>`;
  const ctx = document.getElementById('c1');
  function refresh(){ const x=$('#x').value, y=$('#y').value; const labels=DataStore.rows.map(r=>String(r[x]??'')); const data=DataStore.rows.map(r=>Number(r[y]??0)); draw(ctx,'line',labels,data,y); }
  $('#x').onchange = refresh; $('#y').onchange = refresh; refresh();
});

registerModule('analyze/bar', async () => {
  ensure(); await ensureChart();
  const view = document.getElementById('view');
  view.innerHTML = `<h2 class="h">柱状图/直方图</h2><div>${colSel('x')}${colSel('y')}</div><canvas id="c2" height="260"></canvas>`;
  const ctx = document.getElementById('c2');
  function refresh(){ const x=$('#x').value, y=$('#y').value; const labels=DataStore.rows.map(r=>String(r[x]??'')); const data=DataStore.rows.map(r=>Number(r[y]??0)); draw(ctx,'bar',labels,data,y); }
  $('#x').onchange = refresh; $('#y').onchange = refresh; refresh();
});

registerModule('analyze/pie', async () => {
  ensure(); await ensureChart();
  const view = document.getElementById('view');
  view.innerHTML = `<h2 class="h">饼图</h2><div>${colSel('l')}${colSel('v')}</div><canvas id="c3" height="260"></canvas>`;
  const ctx = document.getElementById('c3');
  function refresh(){ const l=$('#l').value, v=$('#v').value; const labels=DataStore.rows.map(r=>String(r[l]??'')); const data=DataStore.rows.map(r=>Number(r[v]??0)); draw(ctx,'pie',labels,data,v); }
  $('#l').onchange = refresh; $('#v').onchange = refresh; refresh();
});

registerModule('analyze/heatmap', () => {
  ensure();
  document.getElementById('view').innerHTML = '<h2 class="h">热力图</h2><p class="muted">占位：后续可引入 chartjs-chart-matrix 或 Plotly.js。</p>';
});

registerModule('analyze/wordcloud', () => {
  ensure();
  document.getElementById('view').innerHTML = '<h2 class="h">词云</h2><p class="muted">占位：后续可引入 d3-cloud 或 wordcloud2.js。</p>';
});
