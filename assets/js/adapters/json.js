import { registerAdapter } from '../core.js';

registerAdapter('json', async (file)=>{
  const text = await file.text();
  const obj = JSON.parse(text);
  const arr = Array.isArray(obj) ? obj : (Array.isArray(obj.data) ? obj.data : []);
  if(!arr.length) return { headers:[], rows:[] };
  const headers = Object.keys(arr[0]);
  return { headers, rows: arr.map(r=>Object.fromEntries(headers.map(h=>[h, r[h]]))) };
});
