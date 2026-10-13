import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { Theme } from '@radix-ui/themes';
import { readDisplayPreference, saveDisplayPreference } from '../shared/display-preferences.js';
import './display-preferences.css';

const AppearanceContext = createContext(null);
export const useAppearance = () => useContext(AppearanceContext);
const displayStorage = () => { try { return globalThis.localStorage; } catch { return undefined; } };
export default function AppearanceProvider({ children }) {
  const [appearance, change] = useState(() => { try { const value = localStorage.getItem('pip.appearance'); return ['light', 'dark', 'system'].includes(value) ? value : 'light'; } catch { return 'light'; } });
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const [interfaceScale, changeScale] = useState(() => readDisplayPreference(displayStorage(), 'interfaceScale'));
  const [editorSize, changeEditorSize] = useState(() => readDisplayPreference(displayStorage(), 'editorSize'));
  const setInterfaceScale = useCallback(value => changeScale(saveDisplayPreference(displayStorage(), 'interfaceScale', value)), []);
  const setEditorSize = useCallback(value => changeEditorSize(previous => saveDisplayPreference(displayStorage(), 'editorSize', typeof value === 'function' ? value(previous) : value)), []);
  const resolved = appearance === 'system' ? systemDark ? 'dark' : 'light' : appearance;
  const setAppearance = value => { if (!['light', 'dark', 'system'].includes(value)) return; change(value); try { localStorage.setItem('pip.appearance', value); } catch {} };
  useEffect(() => { const media = matchMedia('(prefers-color-scheme: dark)'), update = () => setSystemDark(media.matches); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  useEffect(() => { document.documentElement.dataset.appearance = resolved; document.body.classList.toggle('theme-dark', resolved === 'dark'); }, [resolved]);
  useLayoutEffect(() => {
    const root = document.documentElement, scale = interfaceScale / 100;
    const resize = () => {
      root.style.setProperty('--app-viewport-height', `${window.innerHeight / scale}px`);
      root.style.setProperty('--app-viewport-width', `${window.innerWidth / scale}px`);
      root.dataset.compactUi = String(window.innerWidth / scale <= 800);
    };
    // Keep floating portal positioning in viewport coordinates. Their content
    // receives the same scale in CSS. Monaco includes #root in its zoom math.
    root.style.removeProperty('zoom');
    document.body.style.removeProperty('zoom');
    document.getElementById('root').style.zoom = String(scale);
    root.style.setProperty('--app-interface-scale', String(scale));
    root.dataset.interfaceScale = String(interfaceScale);
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [interfaceScale]);
  return <AppearanceContext.Provider value={{ appearance, setAppearance, resolved, interfaceScale, setInterfaceScale, editorSize, setEditorSize }}><Theme appearance={resolved} accentColor="blue" grayColor="slate" radius="medium" hasBackground>{children}</Theme></AppearanceContext.Provider>;
}
