import { isGameRecord, mergeGameRecord } from './game-contract.js';
const legacyIds = ['first-movement', 'precision-parking', 'make-a-turn', 'sense-and-stop', 'collect-a-part', 'autonomous-docking'];
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const idPattern = /^[a-z][a-z0-9-]{0,80}$/;
function dictionary(value, valid, keyPattern = idPattern) {
  return Object.fromEntries(Object.entries(object(value)).filter(([key, entry]) => keyPattern.test(key) && valid(entry)));
}
export function normalizeProgress(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid progress file');
  const legacy = value => typeof value === 'number' ? legacyIds[value] : value;
  const drafts = Object.fromEntries(Object.entries(object(raw.drafts)).map(([key, value]) => [/^\d+$/.test(key) ? legacy(Number(key)) : key, value]).filter(([key]) => key));
  return {
    version: 5, course: 'cse121-2026',
    completed: [...new Set((Array.isArray(raw.completed) ? raw.completed : []).map(legacy).filter(id => typeof id === 'string' && idPattern.test(id)))],
    drafts: dictionary(drafts, v => typeof v === 'string' && v.length <= 40000),
    steps: dictionary(raw.steps, v => Number.isInteger(v) && v >= 0 && v < 5),
    answers: dictionary(raw.answers, v => Number.isInteger(v) && v >= 0 && v < 10, /^[a-z][a-z0-9-]{0,80}:\d+$/),
    reflections: dictionary(raw.reflections, v => typeof v === 'string' && v.length <= 20000),
    assessments: dictionary(raw.assessments, v => Number.isInteger(v) && v > 0),
    activities: dictionary(raw.activities, v => Number.isInteger(v) && v > 0),
    games: Object.fromEntries(Object.entries(object(raw.games)).filter(([key, record]) => idPattern.test(key) && isGameRecord(record, key))),
    view: { environment: ['workshop','garden','moon'].includes(raw.view?.environment) ? raw.view.environment : 'workshop', effects: raw.view?.effects !== false },
  };
}
export function mergeProgress(current, incoming) {
  const next = normalizeProgress(incoming);
  return normalizeProgress({
    ...current, ...next,
    completed: [...new Set([...current.completed, ...next.completed])],
    ...Object.fromEntries(['drafts','steps','answers','reflections','assessments','activities'].map(key => [key, { ...current[key], ...next[key] }])),
    games: Object.fromEntries([...new Set([...Object.keys(current.games || {}), ...Object.keys(next.games)])].map(id => [id, mergeGameRecord(current.games?.[id], next.games[id], id)])),
    view: { ...current.view, ...next.view },
  });
}
