export const DataStore = { headers:[], rows:[], set(d){ this.headers=d.headers||[]; this.rows=d.rows||[]; } };
export const Adapters  = new Map();
export const Modules   = new Map();
export function registerAdapter(name, fn){ Adapters.set(name, fn); }
export function registerModule(route, fn){ Modules.set(route, fn); }

export async function loadFile(adapterName, file){
  const ad = Adapters.get(adapterName);
  if(!ad) throw new Error('未知数据源: '+adapterName);
  const { headers, rows } = await ad(file);
  DataStore.set({ headers, rows });
}

export function exportCSV(rows=DataStore.rows, headers=DataStore.headers){
  const NEED_QUOTE = /[",\n]/;               // 修复：正则单行，避免“missing /”
  const cell = v => { if(v==null) return ''; const s = String(v).replace(/"/g,'""'); return NEED_QUOTE.test(s) ? `"${s}"` : s; };
  const csv = [headers.join(',')].concat(rows.map(r => headers.map(h => cell(r[h])).join(','))).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='export.csv'; a.click(); URL.revokeObjectURL(a.href);
}
