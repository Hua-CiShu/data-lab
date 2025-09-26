import { registerAdapter } from '../core.js';
registerAdapter('csv', file => new Promise((resolve, reject) => {
  // 懒加载 PapaParse
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js';
  s.onload = () => {
    window.Papa.parse(file, {
      header:true, skipEmptyLines:true,
      transform:v => typeof v === 'string' ? v.trim() : v,
      complete: (res) => {
        const rows = res.data;
        const headers = res.meta.fields || Object.keys(rows[0]||{});
        resolve({ headers, rows });
      },
      error: reject
    });
  };
  s.onerror = reject; document.head.appendChild(s);
}));
