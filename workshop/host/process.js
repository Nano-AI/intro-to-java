import { spawn } from 'node:child_process';

// The desktop build aliases this module to desktop/process.js.
export function runProcess(command, args, { cwd, input = '', signal, timeout = 12000, maxOutput = 65536 } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Run cancelled.'));
    const child = spawn(command, args, { cwd, shell: false, detached: process.platform !== 'win32', env: { ...process.env, LC_ALL: 'C' } });
    let stdout = '', stderr = '', bytes = 0, reason = '';
    const stop = message => {
      reason ||= message;
      try { if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch { child.kill('SIGKILL'); }
    };
    const cancel = () => stop('Run cancelled.');
    signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(() => stop('Time limit reached. Check for an infinite loop.'), timeout);
    const capture = which => chunk => {
      const room = Math.max(0, maxOutput - bytes); bytes += chunk.length;
      if (which === 'stdout') stdout += chunk.subarray(0, room).toString(); else stderr += chunk.subarray(0, room).toString();
      if (bytes > maxOutput) stop('Output limit reached. Check for an accidental printing loop.');
    };
    child.stdout.on('data', capture('stdout')); child.stderr.on('data', capture('stderr'));
    child.stdin.on('error', () => {}); child.stdin.end(input);
    const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', cancel); };
    child.on('error', error => { cleanup(); reject(error); });
    child.on('close', code => { cleanup(); resolve({ code: reason ? -1 : code, stdout, stderr, error: reason || stderr }); });
  });
}
