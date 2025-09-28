import { registerAdapter } from '../core.js';

function parseCSV(text){
  // 简洁健壮 CSV 解析：支持引号/逗号/换行
  const rows=[]; let i=0, cur='', cell=[], inQ=false;
  const push=()=>{ cell.push(cur); cur=''; };
  const newRow=()=>{ rows.push(cell); cell=[]; };
  while(i<text.length){
    const ch=text[i++];
    if(inQ){
      if(ch==='"' && text[i]==='"'){ cur+='"'; i++; }
      else if(ch=== '"'){ inQ=false; }
      else cur+=ch;
    }else{
      if(ch=== '"'){ inQ=true; }
      else if(ch=== ','){ push(); }
      else if(ch=== '\n'){ push(); newRow(); }
      else if(ch=== '\r'){ /* skip */ }
      else cur+=ch;
    }
  }
  push(); newRow();
  if(rows.length && rows[rows.length-1].length===1 && rows[rows.length-1][0]==='') rows.pop();
  return rows;
}

registerAdapter('csv', async (file)=>{
  const text = await file.text();
  const rows = parseCSV(text);
  if(!rows.length) return { headers:[], rows:[] };
  const headers = rows[0];
  const data = rows.slice(1).filter(r=>r.length && r.some(v=>String(v).trim()!==''))
    .map(r => Object.fromEntries(headers.map((h,idx)=>[h, r[idx] ?? ''])));
  return { headers, rows: data };
});
