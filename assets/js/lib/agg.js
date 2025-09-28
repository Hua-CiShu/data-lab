/* agg.js: group/summarize/sort/date utils */

export const Agg = {
  // —— 基础清洗 —— //
  trim(v){ return (v==null ? '' : String(v)).trim(); },
  normCat(v){ return Agg.trim(v).toLowerCase(); }, // 分类合并用（忽略大小写 & 前后空格）

  toNumber(v){
    if (v == null || v === '') return NaN;
    // 兼容 "1,234.5" / "1 234,5" / "1.234,5" 等
    const s = String(v).trim()
      .replace(/\s+/g,'')
      .replace(/(\d)[, ](?=\d{3}\b)/g, '$1') // 千分位去掉
      .replace(/,(\d{1,2})$/, '.$1');        // 末尾逗号当小数点
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  },

  // —— 日期解析（多格式尝试） —— //
  parseDate(v){
    if (v == null) return null;
    if (v instanceof Date && !isNaN(v)) return v;
    const s = String(v).trim();
    // 常见格式：ISO、YYYY-MM-DD、YYYY/MM/DD、MM/DD/YYYY、DD/MM/YYYY
    let d = new Date(s);
    if (!isNaN(d)) return d;
    // 2025-09-26
    let m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (m){
      const dt = new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
      if (!isNaN(dt)) return dt;
    }
    // 26/09/2025 或 09/26/2025：尝试两种
    m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (m){
      // 先按本地常见：YYYY/MM/DD 已覆盖；此处尝试 MDY 再 DMY
      let dt = new Date(Number(m[3]), Number(m[1])-1, Number(m[2]));
      if (!isNaN(dt)) return dt;
      dt = new Date(Number(m[3]), Number(m[2])-1, Number(m[1]));
      if (!isNaN(dt)) return dt;
    }
    return null;
  },

  // —— 分组与聚合 —— //
  groupBy(rows, keyFn){
    const map = new Map();
    for (const r of rows){
      const k = keyFn(r);
      const bucket = map.get(k);
      if (bucket) bucket.push(r);
      else map.set(k, [r]);
    }
    return map;
  },

  summarize(map, valFn, op){
    const out = [];
    for (const [k, arr] of map){
      if (op === 'count'){
        out.push({ key: k, value: arr.length });
      }else{
        const nums = arr.map(valFn).map(Agg.toNumber).filter(n => Number.isFinite(n));
        const sum = nums.reduce((a,b)=>a+b, 0);
        if (op === 'sum') out.push({ key: k, value: sum });
        else if (op === 'avg') out.push({ key: k, value: nums.length ? sum/nums.length : 0 });
        else out.push({ key: k, value: arr.length });
      }
    }
    return out;
  },

  // —— 排序 & 截断 —— //
  sortByKeyAsc(arr){ return arr.sort((a,b)=> (a.key > b.key) - (a.key < b.key)); },
  sortByValueDesc(arr){ return arr.sort((a,b)=> b.value - a.value); },

  topNWithOther(arr, n=8){
    if (arr.length <= n) return arr;
    const head = arr.slice(0, n);
    const tailSum = arr.slice(n).reduce((a,b)=>a+(Number(b.value)||0),0);
    return head.concat([{ key:'Other', value: tailSum }]);
  },

  // —— 重采样（日期 → 日/周/月） —— //
  floorToBucket(d, granularity='day'){
    const dt = new Date(d.getTime());
    if (granularity === 'week'){
      const day = dt.getDay();           // 0=Sun
      const diff = (day+6)%7;            // 周一为一周开始
      dt.setDate(dt.getDate() - diff);
      dt.setHours(0,0,0,0);
    }else if (granularity === 'month'){
      dt.setDate(1); dt.setHours(0,0,0,0);
    }else{
      dt.setHours(0,0,0,0);              // day
    }
    return dt;
  },
};
