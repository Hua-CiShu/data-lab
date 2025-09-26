import { registerAdapter } from '../core.js';
registerAdapter('sqlite', async (file) => {
  if(!window.initSqlJs){
    await import('https://cdn.jsdelivr.net/npm/sql.js@1.10.2/dist/sql-wasm.js');
  }
  const SQL = await window.initSqlJs({ locateFile: f => `https://cdn.jsdelivr.net/npm/sql.js@1.10.2/dist/${f}` });
  const buf = new Uint8Array(await file.arrayBuffer());
  const db = new SQL.Database(buf);
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  if(!tables.length) return { headers:[], rows:[] };
  const table = tables[0].values[0][0];
  const res = db.exec(`SELECT * FROM ${table} LIMIT 10000`)[0];
  const headers = res.columns;
  const rows = res.values.map(vs => Object.fromEntries(vs.map((v,i)=>[headers[i], v])));
  return { headers, rows };
});
