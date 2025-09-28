import { registerAdapter } from '../core.js';

registerAdapter('excel', async (file)=>{
  if(!window.XLSX){
    throw new Error('需要 XLSX 库：请在 index.html 引入 https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
  }
  const data = await file.arrayBuffer();
  const wb = window.XLSX.read(data, { type:'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = window.XLSX.utils.sheet_to_json(sheet, { defval:'', raw:false });
  const headers = json.length ? Object.keys(json[0]) : [];
  return { headers, rows: json };
});
