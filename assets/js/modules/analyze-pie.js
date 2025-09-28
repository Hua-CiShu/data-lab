import { DataStore, Modules } from '../core.js';
import { Agg } from '../lib/agg.js';
function el(tag, attrs={}, ...children){ const n=document.createElement(tag); for(const [k,v] of Object.entries(attrs)){ if(k==='class') n.className=v; else if(k==='style') Object.assign(n.style,v); else n.setAttribute(k,v);} for(const c of children){ if(c==null) continue; n.appendChild(typeof c==='string'?document.createTextNode(c):c);} return n; }
function draw(labels, data, label){ if(!window.Chart){ alert('Chart.js 未加载'); return; } const wrap=el('div',{class:'card'}); const c=el('canvas',{style:{width:'100%',height:'360px'}}); wrap.appendChild(c); new Chart(c.getContext('2d'),{type:'pie',data:{labels,datasets:[{label,data}]} ,options:{responsive:true,maintainAspectRatio:false}}); return wrap; }
Modules.set('pie', function(){
  if(!DataStore.rows.length){ document.getElementById('view').innerHTML='<div class="card"><div class="h">请先读取数据</div></div>'; return; }
  const headers=DataStore.headers, view=document.getElementById('view'); view.innerHTML='';
  const ui=el('div',{class:'card'},
    el('span',{class:'chip'},'分类 X'),(()=>{const s=el('select',{id:'pieX',class:'sm'}); headers.forEach(h=>s.appendChild(el('option',{},h))); return s;})(),
    el('span',{class:'chip'},'值 Y（可空=计数）'),(()=>{const s=el('select',{id:'pieY',class:'sm'}); s.appendChild(el('option',{},'（空=计数）')); headers.forEach(h=>s.appendChild(el('option',{},h))); return s;})(),
    el('span',{class:'chip'},'聚合'),(()=>{const s=el('select',{id:'pieOp',class:'sm'}); ['count','sum','avg'].forEach(h=>s.appendChild(el('option',{},h))); return s;})(),
    el('span',{class:'chip'},'排序'),(()=>{const s=el('select',{id:'pieSort',class:'sm'}); ['auto','label-asc','value-desc'].forEach(h=>s.appendChild(el('option',{},h))); return s;})(),
    el('span',{class:'chip'},'TopN'),(()=>{const s=el('select',{id:'pieTop',class:'sm'}); ['no-limit','top-5','top-8','top-10'].forEach(h=>s.appendChild(el('option',{},h))); return s;})(),
    el('button',{id:'pieRun',class:'btn sm'},'生成')
  );
  const meta=el('div',{class:'muted',style:{margin:'6px 0 8px'}},'—'); const area=el('div');
  view.appendChild(el('h2',{class:'h'},'饼图')); view.appendChild(ui); view.appendChild(meta); view.appendChild(area);

  document.getElementById('pieRun').onclick=()=>{
    const x=document.getElementById('pieX').value; const ySel=document.getElementById('pieY').value; const y=(ySel==='（空=计数）')?null:ySel;
    const op=document.getElementById('pieOp').value, sort=document.getElementById('pieSort').value, top=document.getElementById('pieTop').value;
    const pretty=new Map(); const g=Agg.groupBy(DataStore.rows, r=>{ const raw=r[x]; const k=Agg.normCat(raw); if(!pretty.has(k)) pretty.set(k, Agg.trim(raw??'')); return k; });
    let arr=Agg.summarize(g, r=> y? r[y] : 1, y? op : 'count');
    if (sort==='label-asc') arr=Agg.sortByKeyAsc(arr); else if (sort==='value-desc') arr=Agg.sortByValueDesc(arr); else arr=Agg.sortByValueDesc(arr);
    const n=top==='top-5'?5:top==='top-8'?8:top==='top-10'?10:Infinity; if(Number.isFinite(n)) arr=Agg.topNWithOther(arr,n);
    const labels=arr.map(d=>pretty.get(d.key)||d.key||'(空)'), data=arr.map(d=>d.value);
    area.innerHTML=''; area.appendChild(draw(labels,data,`${op}(${y||'count'})`));
    meta.textContent=`分组 ${labels.length}`;
  };
});
