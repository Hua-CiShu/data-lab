import { DataStore, Modules } from '../core.js';
import { Agg } from '../lib/agg.js';

function el(tag, attrs={}, ...children){
  const n=document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)){ if(k==='class') n.className=v; else if(k==='style') Object.assign(n.style,v); else n.setAttribute(k,v); }
  for (const c of children){ if(c==null) continue; n.appendChild(typeof c==='string'?document.createTextNode(c):c); }
  return n;
}
function chartCanvas(){ const c=el('canvas',{id:'analyzeChart',style:{width:'100%',height:'360px'}}); return el('div',{class:'card'},c); }
function buildUI(){
  const headers=DataStore.headers||[]; const sel=(id,opts)=>el('select',{id,class:'sm'},...opts.map(v=>el('option',{value:String(v)},String(v))));
  const chartType=sel('chartType',['pie','line','bar']); const xCol=sel('xCol',['（选择…）',...headers]); const yCol=sel('yCol',['（选择…）',...headers]);
  const aggOp=sel('aggOp',['count','sum','avg']); const sortX=sel('sortX',['auto','label-asc','value-desc']); const topN=sel('topN',['no-limit','top-5','top-8','top-10']); const dateGran=sel('dateGran',['day','week','month']);
  const btn=el('button',{class:'btn sm',id:'btnRender'},'生成图表');
  const row1=el('div',{class:'inline',style:{gap:'10px',flexWrap:'wrap'}},
    el('span',{class:'chip'},'图表'),chartType, el('span',{class:'chip'},'X列'),xCol, el('span',{class:'chip'},'Y列'),yCol,
    el('span',{class:'chip'},'聚合'),aggOp, el('span',{class:'chip'},'排序/TopN（饼&柱）'),sortX, topN,
    el('span',{class:'chip'},'时间粒度（折线）'),dateGran, btn
  );
  const meta=el('div',{class:'muted',id:'analyzeMeta',style:{marginTop:'6px'}}); const area=chartCanvas();
  return el('div',null, el('h2',{class:'h'},'数据分析（聚合 & 可视化）'), el('div',{class:'card'},row1,meta), el('div',{class:'sep'}), area);
}
let _chart;
function drawChart(type, labels, datasets, extraOpts={}){
  if(!window.Chart){ const m=document.getElementById('analyzeMeta'); if(m) m.textContent='⚠️ Chart.js 未加载'; return; }
  const canvas=document.getElementById('analyzeChart'); if(!canvas) return; const ctx=canvas.getContext('2d');
  const isDark=(document.documentElement.getAttribute('data-theme')==='dark'); if(_chart) _chart.destroy();
  /* global Chart */
  _chart=new Chart(ctx,{ type, data:{ labels, datasets:datasets.map(ds=>({...ds, fill:false, borderWidth:(type==='bar'?0:2), hoverOffset:(type==='pie'?6:0) })) },
    options:{ responsive:true, maintainAspectRatio:false, parsing:false,
      plugins:{ legend:{ position:'top', labels:{ color:isDark?'#e5e7eb':'#111827' } }, tooltip:{enabled:true} },
      scales:(type==='pie')?{}:{ x:{ ticks:{color:isDark?'#e5e7eb':'#111827'}, grid:{color:isDark?'rgba(255,255,255,.12)':'#e5e7eb'} },
                                 y:{ beginAtZero:true, ticks:{color:isDark?'#e5e7eb':'#111827'}, grid:{color:isDark?'rgba(255,255,255,.12)':'#e5e7eb'} } },
      elements:{ line:{ tension: extraOpts.tension ?? 0 } }
  });
}
function renderPie({xCol,yCol,op,sort,top,rows}){
  const pretty=new Map(); const g=Agg.groupBy(rows, r=>{ const raw=r[xCol]; const k=Agg.normCat(raw); if(!pretty.has(k)) pretty.set(k, Agg.trim(raw??'')); return k; });
  let arr=Agg.summarize(g, r=> yCol? r[yCol] : 1, op); if (sort==='label-asc') arr=Agg.sortByKeyAsc(arr); else if (sort==='value-desc') arr=Agg.sortByValueDesc(arr); else arr=Agg.sortByValueDesc(arr);
  const n=top==='top-5'?5:top==='top-8'?8:top==='top-10'?10:Infinity; if(Number.isFinite(n)) arr=Agg.topNWithOther(arr,n);
  const labels=arr.map(d=>pretty.get(d.key)||d.key||'(空)'), data=arr.map(d=>d.value); drawChart('pie',labels,[{label:`${op}(${yCol||'count'})`,data}]); return {groups:arr.length};
}
function renderBar({xCol,yCol,op,sort,top,rows}){
  const pretty=new Map(); const g=Agg.groupBy(rows, r=>{ const raw=r[xCol]; const k=Agg.normCat(raw); if(!pretty.has(k)) pretty.set(k, Agg.trim(raw??'')); return k; });
  let arr=Agg.summarize(g, r=> yCol? r[yCol] : 1, op); if (sort==='label-asc') arr=Agg.sortByKeyAsc(arr); else if (sort==='value-desc') arr=Agg.sortByValueDesc(arr); else arr=Agg.sortByValueDesc(arr);
  const n=top==='top-5'?5:top==='top-8'?8:top==='top-10'?10:Infinity; if(Number.isFinite(n)) arr=Agg.topNWithOther(arr,n);
  const labels=arr.map(d=>pretty.get(d.key)||d.key||'(空)'), data=arr.map(d=>d.value); drawChart('bar',labels,[{label:`${op}(${yCol||'count'})`,data}]); return {bars:arr.length};
}
function renderLine({xCol,yCol,op,gran,rows}){
  const valid=[]; for(const r of rows){ const d=Agg.parseDate(r[xCol]); if(d) valid.push({d:Agg.floorToBucket(d,gran), row:r}); }
  if(!valid.length) throw new Error('未能解析任何日期，请检查 X 列是否为日期。');
  const g=Agg.groupBy(valid, v=>v.d.getTime()); const arr=Agg.summarize(g, v=>v.row[yCol], op); arr.sort((a,b)=>+a.key-+b.key);
  const labels=arr.map(d=>{ const dt=new Date(+d.key); return gran==='month' ? `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}` : `${dt.getMonth()+1}/${dt.getDate()}`; });
  const data=arr.map(d=>d.value); drawChart('line',labels,[{label:`${op}(${yCol})`,data}],{tension:.25}); return {points:data.length};
}
Modules.set('analyze', function(){
  if (!DataStore.rows.length){ document.getElementById('view').innerHTML='<div class="card"><div class="h">请先在上方工具组读取数据文件</div></div>'; return; }
  const view=document.getElementById('view'); view.innerHTML=''; view.appendChild(buildUI());
  const meta=document.getElementById('analyzeMeta'); const btn=document.getElementById('btnRender');
  btn.addEventListener('click',()=>{
    const chartType=document.getElementById('chartType').value, xCol=document.getElementById('xCol').value, yCol=document.getElementById('yCol').value;
    const aggOp=document.getElementById('aggOp').value, sortX=document.getElementById('sortX').value, topN=document.getElementById('topN').value, dateGran=document.getElementById('dateGran').value;
    const rows=DataStore.rows.filter(Boolean);
    try{
      if(chartType==='pie'){ if(xCol==='（选择…）') throw new Error('请选择 X 列（分类）。'); const info=renderPie({xCol,yCol:yCol==='（选择…）'?null:yCol,op:(yCol==='（选择…）'?'count':aggOp),sort:sortX,top:topN,rows}); meta.textContent=`已分组 ${info.groups} 类。`; }
      else if(chartType==='bar'){ if(xCol==='（选择…）') throw new Error('请选择 X 列（分类）。'); const info=renderBar({xCol,yCol:yCol==='（选择…）'?null:yCol,op:(yCol==='（选择…）'?'count':aggOp),sort:sortX,top:topN,rows}); meta.textContent=`柱数 ${info.bars}。`; }
      else { if(xCol==='（选择…）'||yCol==='（选择…）') throw new Error('折线图需要 X=日期列、Y=数值列。'); const info=renderLine({xCol,yCol,op:aggOp,gran:dateGran,rows}); meta.textContent=`点数 ${info.points}。`; }
    }catch(err){ meta.textContent='⚠️ '+(err.message||err); }
  });
});
