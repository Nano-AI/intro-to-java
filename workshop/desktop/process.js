import { invoke } from './node-fs.js';
import { randomBytes } from './node-crypto.js';

// extension/process.js on the Rust run_process command; abort kills the run by id.
export async function runProcess(command, args, { cwd, input = '', signal, timeout = 12000, maxOutput = 65536 } = {}) {
  if (signal?.aborted) throw new Error('Run cancelled.');
  const runId = randomBytes(8).toString('hex'), cancel = () => invoke('kill_process', { runId }).catch(() => {});
  signal?.addEventListener('abort', cancel, { once: true });
  try { return await invoke('run_process', { command, args, cwd: cwd ?? null, input, timeoutMs: timeout, maxOutput, runId }); }
  finally { signal?.removeEventListener('abort', cancel); }
}
