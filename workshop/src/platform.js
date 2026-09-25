const api = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;
const pending = new Map(), listeners = new Map();
let sequence = 0;
export const inVSCode = Boolean(api);
// The desktop host runs in this page; its events arrive as window messages like VS Code's.
export const inDesktop = Boolean(window.__TAURI__);
const savedRoute = () => { try { return localStorage.getItem('pip.route'); } catch { return null; } };
export const initialRoute = api?.getState()?.route || window.__PIP_INITIAL_ROUTE__ || (!api && savedRoute()) || '/';
export function rememberRoute(route) { if (api) api.setState({ route }); else try { localStorage.setItem('pip.route', route); } catch {} }
export function request(method, params = {}) {
  if (inDesktop) return import('../desktop/host.js').then(host => host.handle(method, params)).then(structuredClone);
  if (!api) return Promise.reject(new Error('Open Pip inside VS Code. The browser preview has no Java editor or extension host.'));
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('Pip did not respond. Check the Pip Workshop output channel.')); }, 90000);
    pending.set(id, { resolve, reject, timer }); api.postMessage({ id, method, params });
  });
}
window.addEventListener('message', ({ data }) => {
  if (!data || typeof data !== 'object') return;
  if (typeof data.id === 'number' && pending.has(data.id)) {
    const call = pending.get(data.id); pending.delete(data.id); clearTimeout(call.timer);
    if (data.error) call.reject(new Error(data.error)); else call.resolve(data.data);
  } else if (typeof data.event === 'string') listeners.get(data.event)?.forEach(callback => callback(data.data));
});
export function subscribe(event, callback) {
  if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(callback);
  return () => listeners.get(event).delete(callback);
}
export const runtimeInfo = () => request('runtime.info');
