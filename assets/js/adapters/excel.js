import { registerAdapter } from '../core.js';
registerAdapter('excel', async (file) => {
  await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
  const ab = await file.arrayBuffer();
  const wb = window.XLSX.read(ab, { type:'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = window.XLSX.utils.sheet_to_json(sheet, { defval:'', raw:false });
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return { headers, rows };
});
