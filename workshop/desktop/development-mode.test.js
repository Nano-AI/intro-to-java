import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const shims = { 'node:fs/promises': 'node-fs.js', 'node:path': 'node-path.js', 'node:os': 'node-os.js', 'node:crypto': 'node-crypto.js' };
registerHooks({ resolve(specifier, context, next) {
  if (shims[specifier] && /\/(host|desktop)\/[\w-]+\.js(?:\?.*)?$/.test(context.parentURL || '')) return { url: new URL(shims[specifier], import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
} });

test('release and older native bridges cannot enable demo or insert solutions', async () => {
  for (const development of [false, undefined]) {
    let writes = 0;
    globalThis.window = { postMessage() {}, __TAURI__: { core: { async invoke(command) {
      if (command === 'paths') return { home: '/home', resources: '/res', temp: '/tmp', platform: 'darwin', development };
      if (command === 'fs_mkdir') return;
      if (command === 'fs_read') throw 'ENOENT: missing';
      if (command === 'fs_write') { writes++; return; }
      throw new Error(`Unexpected command: ${command}`);
    } } } };
    const { handle } = await import(`./host.js?development=${development}`);
    assert.deepEqual(await handle('demo.get'), { enabled: false, available: false });
    await assert.rejects(handle('demo.set', { enabled: true }), /development builds/);
    await assert.rejects(handle('game.solution', { gameId: 'supply-relay' }), /demo mode/);
    await assert.rejects(handle('lesson.solution', { lessonId: 'hello-java' }), /demo mode/);
    assert.equal((await handle('demo.set', { enabled: false })).enabled, false);
    assert.equal(writes, 0, 'no student files or progress are changed');
  }
});
