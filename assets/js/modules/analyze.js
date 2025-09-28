/* analyze module: pie/line with grouping/sorting */

import { DataStore, Modules } from '../core.js';
import { Agg } from '../lib/agg.js';

function el(tag, attrs={}, ...children){
  const n = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)) {
    if (k==='class') n.className = v;
    else if (k==='style') Object.assign(n.style, v);
    else n.setAttribute(k, v);
  }
  for (const c of children){
    if (c==null) continue;
    if (typeof c === 'string') n.appendChild(document.createTextNode(c));
    else n.appendChild(c);
  }
  return n;
}

function chartCanvas(){
  const c = el('canvas', { id:'analyzeChart', style:{ width:'100%', height:'360px' }});
  return el('div', { class:'card' }, c);
}

function buildUI(){
  const headers = DataStore.headers || [];
  const sel = (id, opts) => el('select', { id, class:'sm' },
    ...opts.map(v => el('option', { value:String(v) }, String(v)))
  );

  const chartType = sel('chartType', ['pie','line']);
  const xCol      = sel('xCol', ['（选择…）', ...headers]);
  const yCol      = sel('yCol', ['（选择…）', ...headers]);

  const aggOp     = sel('aggOp', ['count','sum','avg']);          // 饼图/折线都用
  const sortX     = sel('sortX', ['auto','label-asc','value-desc']); // 饼图：分类排序；折线忽略（按时间）
  const topN      = sel('topN', ['no-limit','top-5','top-8','top-10']);

  const dateGran  = sel('dateGran', ['day','week','month']);      // 折线
  const dateFmtHint = el('input', { id:'dateHint', class:'sm', placeholder:'可选：日期格式提示（留空=自动）' });

  const btn = el('button', { class:'btn sm', id:'btnRender' }, '生成图表');

  const row1 = el('div', { class:'inline', style:{ gap:'10px', flexWrap:'wrap' } },
    el('span', { class:'chip' }, '图表'), chartType,
    el('span', { class:'chip' }, 'X列'), xCol,
    el('span', { class:'chip' }, 'Y列'), yCol,
    el('span', { class:'chip' }, '聚合'), aggOp,
    el('span', { class:'chip' }, '排序/TopN（饼图）'), sortX, topN,
    el('span', { class:'chip' }, '时间粒度（折线）'), dateGran,
    dateFmtHint,
    btn
  );

  const meta = el('div', { class:'muted', id:'analyzeMeta', style:{ marginTop:'6px' }});
  const area = chartCanvas();

  return el('div', null,
    el('h2', { class:'h' }, '数据分析（聚合 & 可视化）'),
    el('div', { class:'card' }, row1, meta),
    el('div', { class:'sep' }),
    area
  );
}

function inferDate(str, hint){
  // hint 仅作为未来扩展；当前走自动多格式
  return Agg.parseDate(str);
}

function renderPie(cfg){
  const { xCol, yCol, op, sort, top, rows } = cfg;

  // 1) 归一化分类（大小写/空格不敏感），并建立映射用于美观展示
  const mapKeyToPretty = new Map();
  const gmap = Agg.groupBy(rows, r => {
    const raw = r[xCol];
    const key = Agg.normCat(raw);
    if (!mapKeyToPretty.has(key)){
      // 保留首次出现的“原始样式”（例如 Web / WEB / web → 以第一个为准）
      mapKeyToPretty.set(key, Agg.trim(raw==null?'':String(raw)));
    }
    return key;
  });

  // 2) 聚合（count/sum/avg）
  const sumArr = Agg.summarize(gmap, r => r[yCol], op);

  // 3) 排序 & TopN
  let arr = sumArr;
  if (sort === 'label-asc') arr = Agg.sortByKeyAsc(arr);
  else if (sort === 'value-desc') arr = Agg.sortByValueDesc(arr);
  else arr = Agg.sortByValueDesc(arr); // auto：按值降序更容易读

  const n = top === 'top-5' ? 5 : top === 'top-8' ? 8 : top === 'top-10' ? 10 : Infinity;
  if (Number.isFinite(n)) arr = Agg.topNWithOther(arr, n);

  // 4) 输出 labels/data
  const labels = arr.map(d => mapKeyToPretty.get(d.key) || d.key || '(空)');
  const data   = arr.map(d => d.value);

  drawChart('pie', labels, [{ label: `${op}(${yCol || 'count'})`, data }]);

  return { groups: arr.length, sum: data.reduce((a,b)=>a+(Number(b)||0),0) };
}

function renderLine(cfg){
  const { xCol, yCol, op, gran, rows } = cfg;

  // 1) 解析日期并落桶（日/周/月）
  const valid = [];
  for (const r of rows){
    const d = inferDate(r[xCol]);
    if (d) valid.push({ d: Agg.floorToBucket(d, gran), row: r });
  }
  if (valid.length === 0) throw new Error('未能解析任何日期，请检查 X 列是否为日期。');

  // 2) 分组到桶
  const gmap = Agg.groupBy(valid, v => v.d.getTime());

  // 3) 聚合
  const sumArr = Agg.summarize(gmap, v => v.row[yCol], op);

  // 4) 按时间升序
  sumArr.sort((a,b)=> Number(a.key) - Number(b.key));

  const labels = sumArr.map(d => {
    const dt = new Date(Number(d.key));
    // 简洁日期格式：月/日 或 年-月
    if (gran === 'month') return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
    return `${dt.getMonth()+1}/${dt.getDate()}`;
  });
  const data   = sumArr.map(d => d.value);

  drawChart('line', labels, [{ label: `${op}(${yCol})`, data }], { tension: 0.25 });

  return { points: data.length, min: Math.min(...data), max: Math.max(...data) };
}

let _chart; // Chart.js 实例
function drawChart(type, labels, datasets, extraOpts={}){
  const ctx = document.getElementById('analyzeChart').getContext('2d');

  // 主题自适配
  const isDark = (document.documentElement.getAttribute('data-theme') === 'dark');

  if (_chart) _chart.destroy();
  _chart = new Chart(ctx, {
    type,
    data: { labels, datasets: datasets.map(ds => ({
      ...ds,
      fill: false,
      borderWidth: 2,
      hoverOffset: (type==='pie'? 6 : 0),
    })) },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,
      plugins: {
        legend: { position: 'top', labels: { color: isDark ? '#e5e7eb' : '#111827' } },
        tooltip: { enabled: true }
      },
      scales: (type==='pie') ? {} : {
        x: {
          ticks: { color: isDark ? '#e5e7eb' : '#111827' },
          grid:  { color: isDark ? 'rgba(255,255,255,.12)' : '#e5e7eb' },
        },
        y: {
          beginAtZero: true,
          ticks: { color: isDark ? '#e5e7eb' : '#111827' },
          grid:  { color: isDark ? 'rgba(255,255,255,.12)' : '#e5e7eb' },
        },
      },
      elements: { line: { tension: extraOpts.tension ?? 0 } },
    }
  });
}

function analyzeModule(){
  if (!DataStore.rows.length){
    document.getElementById('view').innerHTML =
      '<div class="card"><div class="h">请先在上方工具组读取数据文件</div></div>';
    return;
  }

  // —— 渲染 UI —— //
  const view = document.getElementById('view');
  view.innerHTML = '';
  view.appendChild(buildUI());

  // —— 绑定 —— //
  const meta = document.getElementById('analyzeMeta');
  const btn  = document.getElementById('btnRender');

  btn.addEventListener('click', ()=>{
    const chartType = document.getElementById('chartType').value;      // pie / line
    const xCol      = document.getElementById('xCol').value;
    const yCol      = document.getElementById('yCol').value;
    const aggOp     = document.getElementById('aggOp').value;           // count/sum/avg
    const sortX     = document.getElementById('sortX').value;           // pie only
    const topN      = document.getElementById('topN').value;            // pie only
    const dateGran  = document.getElementById('dateGran').value;        // line only
    // const hint      = document.getElementById('dateHint').value;      // 预留

    // 过滤掉空行
    const rows = DataStore.rows.filter(r => r != null);

    try{
      let info;
      if (chartType === 'pie'){
        if (xCol === '（选择…）') throw new Error('请选择 X 列（分类）。');
        // yCol 可选：为空时按 count
        info = renderPie({
          xCol,
          yCol: yCol==='（选择…）' ? null : yCol,
          op: (yCol==='（选择…）' ? 'count' : aggOp),
          sort: sortX,
          top: topN,
          rows
        });
        meta.textContent = `已分组 ${info.groups} 类。`;

      }else{ // line
        if (xCol === '（选择…）' || yCol === '（选择…）')
          throw new Error('折线图需要 X=日期列、Y=数值列。');
        info = renderLine({
          xCol, yCol, op: aggOp, gran: dateGran, rows
        });
        meta.textContent = `点数 ${info.points}，范围 [${info.min.toFixed(2)} ~ ${info.max.toFixed(2)}]。`;
      }
    }catch(err){
      meta.textContent = '⚠️ ' + (err.message || err);
    }
  });
}

// 注册模块：侧边栏 “数据分析” 点击会运行此模块
Modules.set('analyze', analyzeModule);
