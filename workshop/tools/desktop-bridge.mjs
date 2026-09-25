// Serves dist/ with a stand-in for the Tauri commands, so the desktop UI can be driven
// headlessly (Playwright) against real Java, real files, and the real DiagD daemon.
// Usage: node tools/desktop-bridge.mjs [port]   — state lives in $TMPDIR/pip-bridge.
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { copyFileSync, symlinkSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runProcess } from '../extension/process.js';

const root = path.resolve(import.meta.dirname, '..'), dist = path.join(root, 'dist');
const base = path.join(os.tmpdir(), 'pip-bridge'), appData = path.join(base, 'appdata'), resources = path.join(base, 'resources'), home = path.join(base, 'home');
for (const dir of [appData, resources, home]) mkdirSync(dir, { recursive: true });
for (const file of ['Robot.java', 'Runner.java', 'InspectSource.java']) copyFileSync(path.join(root, file), path.join(resources, file));
copyFileSync(path.join(root, 'desktop/DiagD.java'), path.join(resources, 'DiagD.java'));
const jre = path.join(root, 'src-tauri/jre');
if (!existsSync(path.join(resources, 'jre'))) symlinkSync(jre, path.join(resources, 'jre'));

const runs = new Map();
let daemon, queue = Promise.resolve();
function daemonCall(javaHome, header, source) {
  const run = async () => {
    const classes = path.join(appData, 'diag');
    if (!existsSync(path.join(classes, 'DiagD.class'))) execFileSync(path.join(javaHome, 'bin/javac'), ['--release', '11', '-d', classes, path.join(resources, 'DiagD.java')]);
    if (!daemon || daemon.home !== javaHome || daemon.child.exitCode !== null) {
      const child = spawn(path.join(javaHome, 'bin/java'), ['-XX:+UseSerialGC', '-Xmx256m', '-cp', classes, 'DiagD'], { stdio: ['pipe', 'pipe', 'inherit'] });
      daemon = { child, home: javaHome, buffer: '', waiting: null };
      child.stdout.on('data', chunk => { daemon.buffer += chunk; const i = daemon.buffer.indexOf('\n'); if (i >= 0 && daemon.waiting) { const line = daemon.buffer.slice(0, i); daemon.buffer = daemon.buffer.slice(i + 1); daemon.waiting(line); } });
    }
    const bytes = Buffer.from(source, 'utf8');
    return new Promise(resolve => { daemon.waiting = line => resolve(JSON.parse(line)); daemon.child.stdin.write(header.replace('#', bytes.length)); daemon.child.stdin.write(bytes); });
  };
  return (queue = queue.then(run, run));
}

const commands = {
  paths: () => ({ appData, resources, temp: os.tmpdir(), platform: process.platform, home }),
  run_process: async ({ command, args, cwd, input, timeoutMs, maxOutput, runId }) => {
    const controller = new AbortController(); if (runId) runs.set(runId, controller);
    try { return await runProcess(command, args, { cwd: cwd || undefined, input, timeout: timeoutMs, maxOutput, signal: controller.signal }); }
    finally { runs.delete(runId); }
  },
  kill_process: ({ runId }) => { runs.get(runId)?.abort(); return null; },
  fs_read: ({ path: p }) => { if (!existsSync(p)) throw `ENOENT: ${p}`; return readFileSync(p, 'utf8'); },
  fs_write: ({ path: p, contents, createNew }) => { if (createNew && existsSync(p)) throw 'EEXIST'; writeFileSync(p, contents); return null; },
  fs_mkdir: ({ path: p }) => (mkdirSync(p, { recursive: true }), null),
  fs_remove: ({ path: p }) => (rmSync(p, { recursive: true, force: true }), null),
  fs_rename: ({ from, to }) => (renameSync(from, to), null),
  fs_exists: ({ path: p }) => existsSync(p),
  fs_mkdtemp: ({ prefix }) => mkdtempSync(prefix),
  diagnose: ({ javaHome, sourceRoot, relPath, source }) => daemonCall(javaHome, `D\n${sourceRoot}\n${relPath}\n#\n`, source),
  complete: ({ javaHome, sourceRoot, relPath, source, offset }) => daemonCall(javaHome, `C\n${sourceRoot}\n${relPath}\n#\n${offset}\n`, source),
};

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
export const shim = `window.__TAURI__={core:{invoke:(cmd,args)=>fetch('/invoke/'+cmd,{method:'POST',body:JSON.stringify(args||{})}).then(async r=>{const j=await r.json();if(!r.ok)throw j.error;return j.result;})}};`;
export function start(port = 4399) {
  const server = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url.startsWith('/invoke/')) {
      let body = ''; for await (const chunk of req) body += chunk;
      const command = commands[req.url.slice(8)];
      try { const result = await command(JSON.parse(body || '{}')); res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ result: result ?? null })); }
      catch (error) { if (process.env.PIP_BRIDGE_LOG) console.error("invoke", req.url.slice(8), String(error?.message || error)); res.writeHead(500, { 'content-type': 'application/json' }).end(JSON.stringify({ error: String(error?.message || error) })); }
      return;
    }
    const file = path.join(dist, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
    if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' }).end(readFileSync(file));
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${port}/`, jre, home, stop: () => { daemon?.child.kill(); server.close(); } })));
}
if (import.meta.url === `file://${process.argv[1]}`) start(Number(process.argv[2]) || 4399).then(({ url }) => console.log(`Pip bridge on ${url} (inject the __TAURI__ shim before load)`));
