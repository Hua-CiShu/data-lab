export const Agg = {
  trim(v){ return (v==null ? '' : String(v)).trim(); },
  normCat(v){ return Agg.trim(v).toLowerCase(); },

  toNumber(v){
    if (v == null || v === '') return NaN;
    const s = String(v).trim().replace(/\s+/g,'').replace(/(\d)[, ](?=\d{3}\b)/g,'$1').replace(/,(\d{1,2})$/,'.$1');
    const n = Number(s); return Number.isFinite(n) ? n : NaN;
  },

  parseDate(v){
    if (v == null) return null;
    if (v instanceof Date && !isNaN(v)) return v;
    const s = String(v).trim(); let d = new Date(s); if (!isNaN(d)) return d;
    let m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (m){ const dt=new Date(+m[1], +m[2]-1, +m[3]); if(!isNaN(dt)) return dt; }
    m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (m){ let dt=new Date(+m[3], +m[1]-1, +m[2]); if(!isNaN(dt)) return dt; dt=new Date(+m[3], +m[2]-1, +m[1]); if(!isNaN(dt)) return dt; }
    return null;
  },

  groupBy(rows, keyFn){
    const map = new Map();
    for (const r of rows){ const k=keyFn(r); const b=map.get(k); b?b.push(r):map.set(k,[r]); }
    return map;
  },

  summarize(map, valFn, op){
    const out=[]; for (const [k,arr] of map){
      if (op==='count'){ out.push({key:k, value:arr.length}); }
      else {
        const nums=arr.map(valFn).map(Agg.toNumber).filter(n=>Number.isFinite(n));
        const sum=nums.reduce((a,b)=>a+b,0);
        if (op==='sum') out.push({key:k, value:sum});
        else if (op==='avg') out.push({key:k, value: nums.length? sum/nums.length : 0});
        else out.push({key:k, value:arr.length});
      }
    } return out;
  },

  sortByKeyAsc(arr){ return arr.sort((a,b)=> (a.key>b.key)-(a.key<b.key)); },
  sortByValueDesc(arr){ return arr.sort((a,b)=> b.value-a.value); },

  topNWithOther(arr, n=8){
    if (arr.length<=n) return arr;
    const head=arr.slice(0,n), tailSum=arr.slice(n).reduce((a,b)=>a+(+b.value||0),0);
    return head.concat([{key:'Other', value:tailSum}]);
  },

  floorToBucket(d, gran='day'){
    const dt=new Date(d.getTime());
    if (gran==='week'){ const day=dt.getDay(); const diff=(day+6)%7; dt.setDate(dt.getDate()-diff); dt.setHours(0,0,0,0); }
    else if (gran==='month'){ dt.setDate(1); dt.setHours(0,0,0,0); }
    else { dt.setHours(0,0,0,0); }
    return dt;
  },
};
