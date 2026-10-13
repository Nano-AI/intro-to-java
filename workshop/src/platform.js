const listeners = new Map();
export const inDesktop = Boolean(window.__TAURI__);
export const initialRoute = window.__PIP_INITIAL_ROUTE__ || '/';
let host;
export function request(method, params = {}) {
  if (!inDesktop) return Promise.reject(new Error('Open the Pip Workshop desktop app to edit and run Java.'));
  // WebKit can expose an initializing module on a second concurrent import.
  return (host ??= import('../desktop/host.js')).then(host => host.handle(method, params)).then(structuredClone);
}
window.addEventListener('message', ({ data }) => {
  if (!data || typeof data !== 'object') return;
  if (typeof data.event === 'string') listeners.get(data.event)?.forEach(callback => callback(data.data));
});
export function subscribe(event, callback) {
  if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(callback);
  return () => listeners.get(event).delete(callback);
}
export const runtimeInfo = () => request('runtime.info');
