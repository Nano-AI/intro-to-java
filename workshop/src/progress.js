import { request } from './platform.js';
export { normalizeProgress } from '../shared/progress.js';
export function saveChanges(previous, next) {
  const patch = {};
  for (const field of ['steps','answers','reflections','activities','view']) {
    const changes = Object.fromEntries(Object.entries(next[field] || {}).filter(([key, value]) => previous[field]?.[key] !== value));
    if (Object.keys(changes).length) patch[field] = changes;
  }
  return Object.keys(patch).length ? request('progress.patch', patch) : Promise.resolve();
}
