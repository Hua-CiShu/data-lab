// core.js — 统一状态 & 适配器注册 & 加载
// 使用方式：import { DataStore, Modules, loadFile, registerAdapter, Adapters } from './core.js';

export const DataStore = {
  headers: [],
  rows: [],
  fileInfo: { name: '', size: 0, type: '' },
};

export const Modules = new Map(); // Modules.set('route', fn)

const _adapters = new Map(); // 'csv' -> handler(File|Blob) => {headers, rows}

export function registerAdapter(name, handler){
  const key = String(name || '').toLowerCase();
  if (!key) throw new Error('registerAdapter(name, handler): name 不能为空');
  if (typeof handler !== 'function') throw new Error(`适配器 ${key} 的 handler 必须是函数`);
  _adapters.set(key, handler);
}

export const Adapters = {
  set(name, handler){ registerAdapter(name, handler); },
  get(name){ return _adapters.get(String(name || '').toLowerCase()); },
  has(name){ return _adapters.has(String(name || '').toLowerCase()); },
  list(){ return Array.from(_adapters.keys()); },
};

export function resetData(){
  DataStore.headers = [];
  DataStore.rows = [];
  DataStore.fileInfo = { name:'', size:0, type:'' };
}

/**
 * 加载文件：调用对应适配器，并写入 DataStore
 * @param {string} type  如 'csv' | 'excel' | 'sqlite' | 'json'
 * @param {File|Blob} fileOrBlob
 */
export async function loadFile(type, fileOrBlob){
  const key = String(type || '').toLowerCase();
  if (!_adapters.has(key)){
    const reg = Adapters.list();
    throw new Error(`未找到适配器：${key}。已注册：${reg.length ? reg.join(', ') : '（空）'}`);
  }
  if (!fileOrBlob) throw new Error('没有选择文件。');

  const handler = _adapters.get(key);
  const result = await handler(fileOrBlob);

  if (!result || !Array.isArray(result.headers) || !Array.isArray(result.rows)){
    throw new Error(`适配器 ${key} 返回格式不正确，应为 { headers:[], rows:[] }`);
  }

  DataStore.headers = result.headers;
  DataStore.rows = result.rows;
  DataStore.fileInfo = {
    name: fileOrBlob.name || '(blob)',
    size: fileOrBlob.size || 0,
    type: fileOrBlob.type || '',
  };

  return { headers: DataStore.headers, rows: DataStore.rows };
}


