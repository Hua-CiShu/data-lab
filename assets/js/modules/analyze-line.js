import { DataStore, Modules } from '../core.js';
import { Agg } from '../lib/agg.js';

function el(tag, attrs={}, ...children){
  const n=document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)){ if(k==='class') n.className=v; else if(k==='style') Object.assign(n.style,v); else n.setAttribute(k,v); }
  for (const c of children){ if(c==null) continue; n.appendChild(typeof c==='string'?document.createTextNode(c):c); }
  return n;
}
function draw(labels, data, label){
  if(!window.Chart){ alert('Chart.js 未加载'); return; }
  const wrap=el('div',{class:'card'}); const c=el('canvas',{style:{width:'100%',height:'360px'}}); wrap.appendChild(c);
  const ctx=c.getContext('2d');
  new Chart(ctx,{type:'line',data:{labels,datasets:[{label,data,borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,elements:{line:{tension:.25}}}});
  return wrap;
}

Modules.set('line', function(){
  if (!DataStore.rows.length){
    document.getElementById('view').innerHTML='<div class="card"><div class="h">请先读取数据</div></div>'; return;
  }
  const headers=DataStore.headers, view=document.getElementById('view');
  view.innerHTML='';
  const ui=el('div',{class:'card'},
    el('span',{class:'chip'},'日期 X'), (()=>{const s=el('select',{id:'lineX',class:'sm'}); headers.forEach(h=>s.appendChild(el('option',{},h))); return s;})(),
    el('span',{class:'chip'},'数值 Y'), (()=>{const s=el('select',{id:'lineY',class:'sm'}); headers.forEach(h=>s.appendChild(el('option',{},h))); return s;})(),
    el('span',{class:'chip'},'聚合'), (()=>{const s=el('select',{id:'lineOp',class:'sm'}); ['sum','avg','count'].forEach(h=>s.appendChild(el('option',{},h))); return s;})(),
    el('span',{class:'chip'},'时间粒度'), (()=>{const s=el('select',{id:'lineGran',class:'sm'}); ['day','week','month'].forEach(h=>s.appendChild(el('option',{},h))); return s;})(),
    el('button',{id:'lineRun',class:'btn sm'},'生成')
  );
  const meta=el('div',{class:'muted',style:{margin:'6px 0 8px'}},'—');
  const area=el('div');

  view.appendChild(el('h2',{class:'h'},'折线图'));
  view.appendChild(ui); view.appendChild(meta); view.appendChild(area);

  document.getElementById('lineRun').onclick=()=>{
    const x=document.getElementById('lineX').value, y=document.getElementById('lineY').value, op=document.getElementById('lineOp').value, gran=document.getElementById('lineGran').value;
    const valid=[]; for(const r of DataStore.rows){ const d=Agg.parseDate(r[x]); if(d) valid.push({d:Agg.floorToBucket(d,gran), row:r}); }
    if(!valid.length){ alert('未能解析任何日期，请检查 X 列格式'); return; }
    const g=Agg.groupBy(valid, v=>v.d.getTime()); const arr=Agg.summarize(g, v=>v.row[y], op); arr.sort((a,b)=>+a.key-+b.key);
    const labels=arr.map(d=>{ const dt=new Date(+d.key); return gran==='month'?`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`:`${dt.getMonth()+1}/${dt.getDate()}`; });
    const data=arr.map(d=>d.value);
    area.innerHTML=''; area.appendChild(draw(labels,data,`${op}(${y})`));
    meta.textContent=`点数 ${labels.length}`;
  };
});
