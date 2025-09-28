// ========== assets/js/core.js (stable ESM, no globals) ==========
// 统一导出：DataStore / Modules / loadFile / registerAdapter / Adapters / resetData

/** 运行时数据单例 */
export const DataStore = {
  headers: [],
  rows:    [],
  fileInfo: { name: '', size: 0, type: '' },
};

/** 页面模块路由表：Modules.set('analyze', fn) */
export const Modules = new Map();

/** 适配器注册中心（csv/excel/sqlite/json……） */
const _adapters = new Map();

/** 函数式注册：registerAdapter('csv', async(file)=>({headers,rows})) */
export function registerAdapter(name, handler){
  const key = String(name || '').toLowerCase();
  if (!key) throw new Error('registerAdapter(name, handler): name 不能为空');
  if (typeof handler !== 'function') throw new Error(`适配器 ${key} 的 handler 必须是函数`);
  _adapters.set(key, handler);
}

/** 对象式注册：Adapters.set('csv', handler) 等 */
export const Adapters = {
  set(name, handler){ registerAdapter(name, handler); },
  get(name){ return _adapters.get(String(name || '').toLowerCase()); },
  has(name){ return _adapters.has(String(name || '').toLowerCase()); },
  list(){ return Array.from(_adapters.keys()); },
};

/** 清空数据（当你重新加载文件时可选） */
export function resetData(){
  DataStore.headers = [];
  DataStore.rows = [];
  DataStore.fileInfo = { name:'', size:0, type:'' };
}

/**
 * 读取文件：会调用对应适配器，并把结果写入 DataStore
 * @param {string} type - 适配器名，如 'csv' | 'excel' | 'sqlite' | 'json'
 * @param {File|Blob} fileOrBlob - 浏览器 <input type=file> 选择的文件
 * @returns {Promise<{headers:string[], rows:Object[]}>}
 */
export async function loadFile(type, fileOrBlob){
  const key = String(type || '').toLowerCase();
  if (!_adapters.has(key)){
    const reg = Adapters.list();
    throw new Error(`未找到适配器：${key}。已注册：${reg.length? reg.join(', ') : '（空）'}`);
  }
  if (!fileOrBlob){
    throw new Error('没有选择文件。');
  }

  const handler = _adapters.get(key);
  const result  = await handler(fileOrBlob);

  // 结果校验
  if (!result || !Array.isArray(result.headers) || !Array.isArray(result.rows)){
    throw new Error(`适配器 ${key} 返回格式不正确，应为 { headers:[], rows:[] }`);
  }

  // 写入 DataStore
  DataStore.headers = result.headers;
  DataStore.rows    = result.rows;
  DataStore.fileInfo = {
    name: fileOrBlob.name || '(blob)',
    size: fileOrBlob.size || 0,
    type: fileOrBlob.type || '',
  };

  return { headers: DataStore.headers, rows: DataStore.rows };
}
