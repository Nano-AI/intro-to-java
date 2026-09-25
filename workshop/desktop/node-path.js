// node:path for the desktop webview: '/' joins work on every OS Pip targets.
// ponytail: no '..' or UNC handling; nothing in the host joins those.
export default {
  join: (...parts) => parts.filter(Boolean).join('/').replace(/[\\/]+/g, '/'),
  dirname: file => file.replace(/[\\/][^\\/]*$/, '') || '/',
  basename: file => file.split(/[\\/]/).pop(),
  get delimiter() { return globalThis.process?.platform === 'win32' ? ';' : ':'; },
};
