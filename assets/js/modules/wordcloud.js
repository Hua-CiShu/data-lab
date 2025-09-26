import { DataStore, registerModule } from '../core.js';

const $ = s => document.querySelector(s);
function ensure(){ if(!DataStore.rows.length){ alert('请先读取数据文件'); throw new Error('no data'); } }
function loadScript(src){ return new Promise((res, rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }

registerModule('analyze/wordcloud', async () => {
  ensure();
  if(!window.WordCloud){ await loadScript('https://cdn.jsdelivr.net/npm/wordcloud@1.2.2/src/wordcloud2.js'); }

  const headers = DataStore.headers;
  const view = document.getElementById('view');
  view.innerHTML = `
    <h2 class="h">词云</h2>
    <div>
      <label>文本列 <select id="wc-col">${headers.map(h=>`<option>${h}</option>`).join('')}</select></label>
      <label style="margin-left:8px">Top 词数 <input id="wc-top" type="number" value="100" min="10" max="500" style="width:80px"/></label>
      <label style="margin-left:8px">最小长度 <input id="wc-minlen" type="number" value="2" min="1" max="10" style="width:60px"/></label>
    </div>
    <canvas id="wc-canvas" width="800" height="400" style="margin-top:8px;background:transparent"></canvas>
    <p class="muted">说明：默认用简单分词（字母/数字/常见中文），可按最小长度过滤；需要更精准中文分词时可后续接入 TinySegmenter 或其它库。</p>
  `;

  const canvas = document.getElementById('wc-canvas');

  function tokenize(text){
    if(!text) return [];
    // 匹配：字母/数字/常见中文块
    const m = String(text).match(/[\p{L}\p{N}\u4e00-\u9fa5]+/gu);
    return m || [];
  }

  function buildList(col, topN, minLen){
    const freq = new Map();
    DataStore.rows.forEach(r=>{
      const tokens = tokenize(r[col]);
      tokens.forEach(t=>{
        const w = t.trim();
        if(w.length >= minLen) freq.set(w, (freq.get(w)||0)+1);
      });
    });
    const list = [...freq.entries()].sort((a,b)=> b[1]-a[1]).slice(0, topN);
    // 归一化大小范围（10~60）
    const max = list[0]?.[1] || 1;
    return list.map(([w,c])=> [w, Math.max(10, Math.round(10 + 50*c/max))]);
  }

  function render(){
    const col = $('#wc-col').value;
    const topN = Math.max(10, Math.min(500, Number($('#wc-top').value||100)));
    const minLen = Math.max(1, Math.min(10, Number($('#wc-minlen').value||2)));
    const list = buildList(col, topN, minLen);
    if(!list.length){ canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height); return; }
    window.WordCloud(canvas, {
      list,
      backgroundColor: 'rgba(0,0,0,0)',
      color: () => `hsl(${Math.floor(Math.random()*300)}, 80%, 60%)`,
      rotateRatio: .1,
      drawOutOfBound: false,
      shrinkToFit: true,
      weightFactor: 1
    });
  }

  $('#wc-col').onchange = render;
  $('#wc-top').oninput = render;
  $('#wc-minlen').oninput = render;
  render();
});
