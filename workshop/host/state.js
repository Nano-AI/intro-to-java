import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeProgress, mergeProgress } from '../shared/progress.js';

export class ProgressStore {
  constructor(directory) { this.directory = directory; this.file = path.join(directory, 'progress.json'); this.pending = Promise.resolve(); this.data = normalizeProgress(); }
  async load() {
    try { this.data = normalizeProgress(JSON.parse(await readFile(this.file, 'utf8'))); }
    catch (error) { if (error.code !== 'ENOENT') throw new Error(`Could not read ${this.file}. The original file has been preserved. ${error.message}`); }
    return this.data;
  }
  async patch(patch) {
    const next = { ...this.data, ...patch };
    for (const key of ['drafts','steps','answers','reflections','assessments','activities','view']) next[key] = { ...this.data[key], ...patch[key] };
    this.data = normalizeProgress(next);
    const snapshot = JSON.stringify(this.data, null, 2);
    this.pending = this.pending.catch(() => {}).then(async () => {
      await mkdir(this.directory, { recursive: true });
      const temp = this.file + '.tmp'; await writeFile(temp, snapshot); await rename(temp, this.file);
    });
    await this.pending; return this.data;
  }
  async import(raw) { return this.patch(mergeProgress(this.data, raw)); }
}
