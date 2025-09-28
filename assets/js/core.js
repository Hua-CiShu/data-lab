// ========== assets/js/core.js (FULL COVER) ==========
// 统一导出：DataStore / Modules / loadFile / registerAdapter
// 兼容两种注册方式：registerAdapter('csv', fn) 或 Adapters.set('csv', fn)

export const DataStore = {
  headers: [],
  rows:    [],
  fileInfo: { name: '', size: 0, type: '' },
};

export const Modules = new Map();

// 适配器注册中心
const _adapters = new Map();

// 对外导出两种风格的注册方法（适配你现有的 adapters 写法）
export function registerAdapter(name, handler){
  _adapters.set(String(name), handler);
}
// 也暴露一个对象风格
export const Adapters = {
  set: (name, handler) => _adapters.set(String(name), handler),
  get: (name) => _adapters.get(String(name)),
  has: (name) => _adapters.has(String(name)),
  list: () => Array.from(_adapters.keys()),
};

// 同时挂到 window，防止老代码用全局注册
try{
  window.registerAdapter = registerAdapter;
  window.Adapters = Adapters;
}catch{ /* 在 SSR 场景忽略 */ }

// 重置数据
export function resetData(){
  DataStore.headers = [];
  DataStore.rows = [];
  DataStore.fileInfo = { name:'', size:0, type:'' };
}

// 读取文件：根据 adapterSelect 选择的类型去调用对应适配器
export async function loadFile(type, fileOrBlob){
  const key = String(type || '').toLowerCase();
  if (!_adapters.has(key)){
    throw new Error(`未找到适配器：${key}。已注册：${Adapters.list().join(', ') || '（空）'}`);
  }
  if (!fileOrBlob){
    throw new Error('没有选择文件。');
  }

  // 适配器约定：返回 { headers:[], rows:[] }
  const handler = _adapters.get(key);
  const result  = await handler(fileOrBlob);

  if (!result || !Array.isArray(result.headers) || !Array.isArray(result.rows)){
    throw new Error(`适配器 ${key} 返回格式不正确，应为 {headers:[], rows:[]}`);
  }

  DataStore.headers = result.headers;
  DataStore.rows    = result.rows;
  DataStore.fileInfo = {
    name: fileOrBlob.name || '(blob)',
    size: fileOrBlob.size || 0,
    type: fileOrBlob.type || '',
  };

  return { ...DataStore };
}
