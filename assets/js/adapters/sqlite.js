import { registerAdapter } from '../core.js';

registerAdapter('sqlite', async (file)=>{
  if(!window.initSqlJs){
    throw new Error('需要 sql.js：请在 index.html 引入 https://cdn.jsdelivr.net/npm/sql.js@1.10.2/dist/sql-wasm.js 并按文档初始化');
  }
  const SQL = await window.initSqlJs({ locateFile: f => `https://cdn.jsdelivr.net/npm/sql.js@1.10.2/dist/${f}` });
  const buf = new Uint8Array(await file.arrayBuffer());
  const db = new SQL.Database(buf);
  const res = db.exec('SELECT name FROM sqlite_master WHERE type="table" LIMIT 1');
  if(!res.length) throw new Error('数据库无表');
  const table = res[0].values[0][0];
  const rows = db.exec(`SELECT * FROM ${table}`)[0];
  const headers = rows.columns;
  const data = rows.values.map(arr => Object.fromEntries(headers.map((h,i)=>[h, arr[i]])));
  return { headers, rows: data };
});
