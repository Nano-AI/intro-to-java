import React, { useCallback, useEffect, useRef, useState, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { saveChanges } from './progress.js';
import { request, subscribe, inDesktop, initialRoute } from './platform.js';
import { CoursePage, ModulePage, ProgressPage, SettingsPage, ProjectsPage } from './pages.jsx';
import { ProgressContext } from './context.js';
import { lessons } from './curriculum.js';
import { practicePath } from './routes.js';
import Icon from './icon.jsx';
import AppearanceProvider from './appearance.jsx';
import DemoProvider from './demo.jsx';
import '../web/style.css';
import './style.css';
import './workbench.css';
import './desktop.css';
import '@radix-ui/themes/styles.css';
import './appearance.css';

const Workspace = lazy(() => import('./workspace.jsx'));
const LearningPage = lazy(() => import('./learn.jsx'));
const QuizPage = lazy(() => import('./quiz.jsx'));
const GamePage = lazy(() => import('./game-page.jsx'));

function LegacyLessonRedirect() {
  const { lessonId } = useParams();
  const lesson = lessons.find(l => l.id === lessonId);
  return lesson ? <Navigate replace to={practicePath(lesson)} /> : <main className="page-shell"><h1>Lesson not found</h1><Link to="/">Course home</Link></main>;
}

function App() {
  const [progress, setProgress] = useState(null), [error, setError] = useState(''), [saveError, setSaveError] = useState('');
  const current = useRef(null), navigate = useNavigate();
  const acceptProgress = useCallback(value => { current.current = value; setProgress(value); }, []);
  const update = useCallback(change => {
    const previous = current.current, next = typeof change === 'function' ? change(previous) : change;
    acceptProgress(next);
    saveChanges(previous, next).then(() => setSaveError('')).catch(e => setSaveError(`Could not save: ${e.message}`));
  }, [acceptProgress]);
  const location = useLocation();
  const inCourse = /^\/(module|learn|quiz|practice|lesson|challenge)\//.test(location.pathname);
  const inProjects = /^\/(project|game)\//.test(location.pathname);
  useEffect(() => { const stop = subscribe('progress', acceptProgress); request('progress.load').then(acceptProgress).catch(e => setError(e.message)); return stop; }, [acceptProgress]);
  useEffect(() => {
    return subscribe('navigate', ({ route }) => navigate(route));
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  if (!inDesktop) return <main className="page-shell"><h1>Open Pip Workshop.</h1><p>Use the desktop app to explore lessons, write Java, and run projects.</p><p>For development, start the app with <code>npm run dev:desktop</code>.</p></main>;
  if (error) return <main className="page-shell"><h1>Pip couldn't open</h1><p role="alert">{error}</p><button onClick={() => window.location.reload()}>Retry</button></main>;
  if (!progress) return <main className="page-shell"><h1>Opening the workshop…</h1></main>;
  return <ProgressContext.Provider value={{ progress, update }}><div className={inProjects ? 'project-focus' : undefined}>
    {<a className="skip" href="#" onClick={e => { e.preventDefault(); const main = document.querySelector('main'); if (main) { main.tabIndex = -1; main.focus(); } }}>Skip to content</a>}
    {!inProjects && <header className="site-header"><Link className="brand" to="/"><span className="brand-bot"><Icon name="bot" /></span> Pip</Link><nav className="app-nav" aria-label="Application"><NavLink to="/" end className={({ isActive }) => isActive || inCourse ? 'active' : undefined}><Icon name="book-open" />Course</NavLink><NavLink to="/projects"><Icon name="package" />Projects</NavLink><NavLink to="/progress"><Icon name="circle-check" />Progress</NavLink><NavLink to="/settings"><Icon name="sliders-horizontal" />Settings</NavLink></nav></header>}
    {saveError && <p className="save-error" role="alert">{saveError}</p>}
    <Suspense fallback={<main className="page-shell"><h1>Opening the workbench…</h1></main>}><Routes>
      <Route path="/" element={<CoursePage />} />
      <Route path="/module/:moduleId" element={<ModulePage />} />
      <Route path="/learn/:lessonId" element={<LearningPage />} />
      <Route path="/quiz/:lessonId" element={<QuizPage />} />
      <Route path="/practice/:lessonId" element={<Workspace />} />
      <Route path="/challenge/:lessonId" element={<Workspace />} />
      <Route path="/project/:lessonId" element={<Workspace />} />
      <Route path="/assignment/:lessonId" element={<LegacyLessonRedirect />} />
      <Route path="/lesson/:lessonId" element={<LegacyLessonRedirect />} />
      <Route path="/games" element={<Navigate replace to="/projects" />} />
      <Route path="/game/:gameId" element={<GamePage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/assignments" element={<Navigate replace to="/projects" />} />
      <Route path="/progress" element={<ProgressPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<main className="page-shell"><h1>Page not found</h1><Link to="/">Return to the course</Link></main>} />
    </Routes></Suspense>
  </div></ProgressContext.Provider>;
}
window.location.hash = initialRoute;
createRoot(document.getElementById('root')).render(<AppearanceProvider><DemoProvider><HashRouter><App /></HashRouter></DemoProvider></AppearanceProvider>);
