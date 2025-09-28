import { DataStore, Modules } from '../core.js';

Modules.set('wordcloud', function(){
  const view=document.getElementById('view');
  if(!DataStore.rows.length){ view.innerHTML='<div class="card"><div class="h">请先读取数据</div></div>'; return; }
  const headers=DataStore.headers;
  view.innerHTML = `
    <h2 class="h">词云</h2>
    <div class="card">
      <span class="chip">文本列</span>
      <select id="wcCol" class="sm">${headers.map(h=>`<option>${h}</option>`).join('')}</select>
      <button id="wcBtn" class="btn sm">生成</button>
    </div>
    <div class="card" style="height:420px"><div id="wc" style="width:100%;height:100%"></div></div>
  `;
  document.getElementById('wcBtn').addEventListener('click', ()=>{
    if(!window.WordCloud){ alert('wordcloud2 未加载'); return; }
    const col=document.getElementById('wcCol').value;
    const text=DataStore.rows.map(r=>r[col]).filter(Boolean).join(' ');
    const words=Array.from(text.split(/\s+/).reduce((m,w)=>{w=w.toLowerCase(); m.set(w,(m.get(w)||0)+1); return m;}, new Map()));
    window.WordCloud(document.getElementById('wc'), { list: words.slice(0,200), gridSize:10, weightFactor:2 });
  });
});
