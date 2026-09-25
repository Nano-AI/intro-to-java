import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const desktop = file => new URL(`./desktop/${file}`, import.meta.url).pathname;
export default defineConfig({
  // Only the extension's runner gets the desktop process shim; Monaco has its own ./process.js.
  plugins: [react(), { name: 'desktop-process', enforce: 'pre', resolveId: (id, importer) => id === './process.js' && importer?.endsWith('/extension/runner.js') ? desktop('process.js') : null }],
  base: './',
  clearScreen: false,
  server: { host: '127.0.0.1', port: 4310, strictPort: true },
  build: { target: 'es2022', chunkSizeWarningLimit: 800 },
  // desktop/host.js reuses the extension's runner and store on these shims.
  resolve: { alias: [
    { find: /^node:fs\/promises$/, replacement: desktop('node-fs.js') },
    { find: /^node:path$/, replacement: desktop('node-path.js') },
    { find: /^node:os$/, replacement: desktop('node-os.js') },
    { find: /^node:crypto$/, replacement: desktop('node-crypto.js') },
  ] },
});
