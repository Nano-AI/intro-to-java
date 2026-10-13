// Appearance preferences stay in local storage, outside student work and progress.
export const INTERFACE_SCALES = [90, 100, 110, 125];
export const DISPLAY_KEYS = { interfaceScale: 'pip.interfaceScale', editorSize: 'pip.editorSize' };
export const DEFAULT_EDITOR_SIZE = 15;

export function interfaceScale(value) {
  const number = Number(value);
  return INTERFACE_SCALES.includes(number) ? number : 100;
}

export function editorFontSize(value) {
  const number = Number(value);
  return value !== null && value !== '' && Number.isFinite(number)
    ? Math.max(10, Math.min(28, Math.round(number))) : DEFAULT_EDITOR_SIZE;
}

export function readDisplayPreference(storage, name) {
  let value;
  try { value = storage?.getItem(DISPLAY_KEYS[name]); } catch {}
  return name === 'editorSize' ? editorFontSize(value) : interfaceScale(value);
}

export function saveDisplayPreference(storage, name, value) {
  const next = name === 'editorSize' ? editorFontSize(value) : interfaceScale(value);
  try { storage?.setItem(DISPLAY_KEYS[name], String(next)); } catch {}
  return next;
}
