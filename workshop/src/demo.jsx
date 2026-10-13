import React, { createContext, useContext, useEffect, useState } from 'react';
import { request } from './platform.js';

const DemoContext = createContext({ demo: false, demoAvailable: false });
export const useDemo = () => useContext(DemoContext);
export default function DemoProvider({ children }) {
  const [demo, change] = useState(false);
  const [demoAvailable, setAvailable] = useState(false);
  useEffect(() => { request('demo.get').then(value => { change(value.enabled); setAvailable(value.available === true); }).catch(error => console.error('Pip demo initialization', error.message)); }, []);
  const setDemo = async enabled => { const result = await request('demo.set', { enabled }); change(result.enabled); };
  return <DemoContext.Provider value={{ demo, demoAvailable, setDemo }}>
    {demo && <aside className="demo-banner" role="status"><strong>Demo</strong><span>Temporary workspace</span><a href="#/settings">Settings</a></aside>}
    {children}
  </DemoContext.Provider>;
}
