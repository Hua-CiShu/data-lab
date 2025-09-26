import { registerAdapter } from '../core.js';
registerAdapter('json', async (file) => {
  const text = await file.text();
  const data = JSON.parse(text);
  const rows = Array.isArray(data) ? data : [data];
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return { headers, rows };
});
