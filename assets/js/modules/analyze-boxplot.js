import { DataStore, Modules } from '../core.js';

function el(tag, attrs={}, ...children){
  const n=document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)){ if(k==='class') n.className=v; else if(k==='style') Object.assign(n.style,v); else n.setAttribute(k,v); }
  for (const c of children){ if(c==null) continue; n.appendChild(typeof c==='string'?document.createTextNode(c):c); }
  return n;
}

async function ensureBoxplot(){
  if (window.Chart && window.Chart.registry?.plugins?.get('boxplot')) return;
  // 加载 chartjs-chart-boxplot 插件
  await new Promise((resolve, reject)=>{
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/chartjs-chart-boxplot@4.3.3/build/index.umd.min.js';
    s.onload=resolve; s.onerror=()=>reject(new Error('boxplot 插件加载失败'));
    document.body.appendChild(s);
  });
}

Modules.set('box', async function(){
  if (!DataStore.rows.length){
    document.getElementById('view').innerHTML='<div class="card"><div class="h">请先读取数据</div></div>'; return;
  }
  await ensureBoxplot();
  if(!window.Chart){ alert('Chart.js 未加载'); return; }

  const headers=DataStore.headers, view=document.getElementById('view');
  view.innerHTML='';
  const ui=el('div',{class:'card'},
    el('span',{class:'chip'},'分组列（可空=整体）'),
    (()=>{const s=el('select',{id:'boxGroup',class:'sm'}); s.appendChild(el('option',{},'（空=不分组）')); headers.forEach(h=>s.appendChild(el('option',{},h))); return s;})(),
    el('span',{class:'chip'},'数值列'),
    (()=>{const s=el('select',{id:'boxValue',class:'sm'}); headers.forEach(h=>s.appendChild(el('option',{},h))); return s;})(),
    el('button',{id:'boxRun',class:'btn sm'},'生成')
  );
  const meta=el('div',{class:'muted',style:{margin:'6px 0 8px'}},'—');
  const area=el('div',{class:'card'}, el('canvas',{id:'boxCanvas',style:{width:'100%',height:'380px'}}));
  view.appendChild(el('h2',{class:'h'},'箱线图'));
  view.appendChild(ui); view.appendChild(meta); view.appendChild(area);

  document.getElementById('boxRun').onclick=()=>{
    const gSel=document.getElementById('boxGroup').value;
    const vCol=document.getElementById('boxValue').value;
    const toNum = (x)=>{ const n=Number(String(x).replace(/[^\d.-]+/g,'')); return Number.isFinite(n)?n:NaN; };

    let groups = new Map([['整体', DataStore.rows]]);
    if (gSel !== '（空=不分组）'){
      groups = new Map();
      for (const r of DataStore.rows){
        const k = String(r[gSel] ?? '');
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(r);
      }
    }

    const labels=[], boxData=[];
    for (const [k, arr] of groups){
      const vals=arr.map(r=>toNum(r[vCol])).filter(Number.isFinite);
      if (!vals.length) continue;
      vals.sort((a,b)=>a-b);
      const q = (p)=>{ const idx=(vals.length-1)*p, lo=Math.floor(idx), hi=Math.ceil(idx);
        return lo===hi? vals[lo] : vals[lo]*(hi-idx)+vals[hi]*(idx-lo); };
      labels.push(k||'(空)');
      boxData.push({ min: vals[0], q1: q(0.25), median: q(0.5), q3: q(0.75), max: vals[vals.length-1] });
    }

    const ctx=document.getElementById('boxCanvas').getContext('2d');
    if (window.__boxChart) window.__boxChart.destroy();
    window.__boxChart = new Chart(ctx, {
      type: 'boxplot',
      data: { labels, datasets: [{ label: vCol, data: boxData }] },
      options: { responsive:true, maintainAspectRatio:false }
    });
    meta.textContent = `分组 ${labels.length}`;
  };
});
