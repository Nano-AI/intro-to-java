import React, { useCallback, useEffect, useRef, useState, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { saveChanges } from './progress.js';
import { request, subscribe, inVSCode, inDesktop, initialRoute, rememberRoute } from './platform.js';
import { CoursePage, ModulePage, ProgressPage, SettingsPage, ProjectsPage, AssignmentsPage } from './pages.jsx';
import { ProgressContext } from './context.js';
import { lessons } from './curriculum.js';
import { practicePath } from './routes.js';
import Icon from './icon.jsx';
import '../web/style.css';
import './style.css';
import './extension.css';
import './desktop.css';

const Workspace = lazy(() => import('./workspace.jsx'));
const LearningPage = lazy(() => import('./learn.jsx'));
const QuizPage = lazy(() => import('./quiz.jsx'));
const GamePage = lazy(() => import('./game-page.jsx'));
const GamesPage = lazy(() => import('./games-page.jsx'));

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
  const location = useLocation(); const coding = /^\/(lesson|learn|quiz|practice|project|assignment|game)\//.test(location.pathname);
  useEffect(() => { const stop = subscribe('progress', acceptProgress); request('progress.load').then(acceptProgress).catch(e => setError(e.message)); return stop; }, [acceptProgress]);
  useEffect(() => {
    return subscribe('navigate', ({ route }) => navigate(route));
  }, []);
  useEffect(() => { window.scrollTo(0, 0); rememberRoute(location.pathname); }, [location.pathname]);
  if (!inVSCode && !inDesktop) return <main className="page-shell"><h1>Pip lives in VS Code.</h1><p>Install the Pip Workshop VSIX, open a learning folder, and run <b>Pip: Open Course</b> from the Command Palette.</p><p>This page is only a visual preview. Java editing and execution are provided by VS Code.</p></main>;
  if (error) return <main className="page-shell"><h1>Progress needs attention</h1><p role="alert">{error}</p><p>The existing file has not been replaced. See the storage recovery instructions in the local documentation.</p><button onClick={() => window.location.reload()}>Retry</button></main>;
  if (!progress) return <main className="page-shell"><h1>Opening the workshop…</h1></main>;
  return <ProgressContext.Provider value={{ progress, update }}>
    {!coding && <a className="skip" href="#" onClick={e => { e.preventDefault(); const main = document.querySelector('main'); if (main) { main.tabIndex = -1; main.focus(); } }}>Skip to content</a>}
    {!coding && <header className="site-header"><Link className="brand" to="/"><span className="brand-bot"><Icon name="bot" /></span> pip <span className="brand-sub">JAVA FOUNDATIONS</span></Link><nav className="app-nav" aria-label="Application"><NavLink to="/" end>Course</NavLink><NavLink to="/games">Games</NavLink><NavLink to="/projects">Projects</NavLink><NavLink to="/assignments">Assignments</NavLink><NavLink to="/progress">Progress</NavLink><NavLink to="/settings">Settings</NavLink></nav></header>}
    {saveError && <p className="save-error" role="alert">{saveError}</p>}
    <Suspense fallback={<main className="page-shell"><h1>Opening the workbench…</h1></main>}><Routes>
      <Route path="/" element={<CoursePage />} />
      <Route path="/module/:moduleId" element={<ModulePage />} />
      <Route path="/learn/:lessonId" element={<LearningPage />} />
      <Route path="/quiz/:lessonId" element={<QuizPage />} />
      <Route path="/practice/:lessonId" element={<Workspace />} />
      <Route path="/project/:lessonId" element={<Workspace />} />
      <Route path="/assignment/:lessonId" element={<Workspace />} />
      <Route path="/lesson/:lessonId" element={<LegacyLessonRedirect />} />
      <Route path="/games" element={<GamesPage />} />
      <Route path="/game/:gameId" element={<GamePage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/assignments" element={<AssignmentsPage />} />
      <Route path="/progress" element={<ProgressPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<main className="page-shell"><h1>Page not found</h1><Link to="/">Return to the course</Link></main>} />
    </Routes></Suspense>
  </ProgressContext.Provider>;
}
// The dark palette keys off VS Code's body class, so the desktop app follows the OS theme through the same class.
if (inDesktop) { const dark = matchMedia('(prefers-color-scheme: dark)'), apply = () => document.body.classList.toggle('vscode-dark', dark.matches); apply(); dark.addEventListener('change', apply); }
window.location.hash = initialRoute;
createRoot(document.getElementById('root')).render(<HashRouter><App /></HashRouter>);
