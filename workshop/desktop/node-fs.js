// node:fs/promises for the desktop webview, on the Rust fs_* commands.
// Rust errors are strings; ENOENT/EEXIST become error.code as existing code expects.
export const invoke = (command, args) => globalThis.window.__TAURI__.core.invoke(command, args).catch(error => {
  const wrapped = new Error(String(error?.message ?? error));
  wrapped.code = /^(ENOENT|EEXIST)/.exec(wrapped.message)?.[1];
  throw wrapped;
});
// Always text: every caller reads Java, JSON, or passes the result straight to writeFile.
export const readFile = path => invoke('fs_read', { path });
export const writeFile = (path, contents, options) => invoke('fs_write', { path, contents: String(contents), createNew: options?.flag === 'wx' });
export const mkdir = path => invoke('fs_mkdir', { path });
export const rm = path => invoke('fs_remove', { path });
export const rename = (from, to) => invoke('fs_rename', { from, to });
export const mkdtemp = prefix => invoke('fs_mkdtemp', { prefix });
export async function access(path) {
  if (!await invoke('fs_exists', { path })) throw Object.assign(new Error(`ENOENT: ${path}`), { code: 'ENOENT' });
}
