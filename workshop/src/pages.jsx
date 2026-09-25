import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { modules, orderedLessons, lessons } from './curriculum.js';
import { useProgress, practiceComplete, hasPassedPart } from './context.js';
import { request, runtimeInfo, inDesktop } from './platform.js';
import CodeText from './code-text.jsx';
import Icon from './icon.jsx';
import { practiceType, lessonRoute, flowSteps } from './routes.js';

// Persistent top bar for lesson, quiz, and coding pages: a large back control, where the page sits, and optional step links.
export function TopBar({ back, trail, children }) {
  return <header className="app-topbar">
    <Link className="topbar-back" to={back.to}><Icon name="arrow-left" /> {back.label}</Link>
    <nav className="topbar-trail" aria-label="Breadcrumb"><ol>{trail.filter(Boolean).map((item, i, all) => <li key={i} aria-current={i === all.length - 1 ? 'page' : undefined}><CodeText>{item}</CodeText></li>)}</ol></nav>
    {children}
  </header>;
}

// "1 Explore · 2 Quiz · 3 Practice". Finished and unlocked steps are links; locked steps say why in their accessible name.
export function FlowSteps({ lesson, current }) {
  const { progress } = useProgress();
  return <ol className="flow-steps" aria-label="Lesson steps">{flowSteps(lesson, progress).map((step, i) => {
    const body = <><span className="flow-number" aria-hidden="true">{step.done ? <Icon name="check" /> : i + 1}</span>{step.label}</>;
    const state = step.done ? ', done' : step.open ? '' : ', locked until the earlier steps are done';
    return <li key={step.key} className={step.done ? 'is-done' : undefined}>{step.key === current ? <span className="flow-step" aria-current="step" aria-label={`Step ${i + 1}: ${step.label}, current${state}`}>{body}</span>
      : step.open ? <Link className="flow-step" to={step.to} aria-label={`Step ${i + 1}: ${step.label}${state}`}>{body}</Link>
      : <span className="flow-step" aria-disabled="true" aria-label={`Step ${i + 1}: ${step.label}${state}`}>{body}</span>}</li>;
  })}</ol>;
}

export const lessonBack = lesson => { const type = practiceType(lesson); if (type !== 'Practice') return { to: `/${type.toLowerCase()}s`, label: `${type}s` }; const module = modules.find(m => m.ids.includes(lesson.parentId || lesson.id)); return { to: module ? `/module/${module.id}` : '/', label: 'Course' }; };
export const lessonTrail = lesson => [modules.find(m => m.ids.includes(lesson.parentId || lesson.id))?.title || `${practiceType(lesson)}s`, lessons.find(l => l.id === lesson.parentId)?.title || lesson.title];
const CompletedTitle = ({children,done}) => <span className={`completion-title${done?' is-complete':''}`}><CodeText>{children}</CodeText></span>;

function LearningLinks({ lesson }) {
  const {progress}=useProgress();
  return <nav className="learning-links" aria-label={`${lesson.title} learning steps`}>{flowSteps(lesson,progress).map(step=>step.open?<Link key={step.key} to={step.to}>{step.label}{step.key==='code'&&lesson.parts?` · ${lesson.parts.length} parts`:''}</Link>:<span key={step.key} className="locked-step" aria-disabled="true">{step.label} (locked)</span>)}</nav>;
}

function CollectionPage({ type }) {
  const { progress } = useProgress();
  const items = orderedLessons.filter(lesson => practiceType(lesson) === type);
  return <main className="page-shell collection-page"><Link className="back-link" to="/"><Icon name="arrow-left" /> Course home</Link><span className="eyebrow">{type.toUpperCase()} COLLECTION</span><h1>{type}s</h1><p className="page-description">{type === 'Project' ? 'Robot challenges that combine loops, methods, conditions, and sensor feedback.' : 'Complete programs that combine the earlier topics.'}</p>
    <ol className="lesson-list">{items.map(lesson => {const done=practiceComplete(lesson,progress);return <li key={lesson.id} className={done?'lesson-complete':''}><span className="content-type">{type}</span><h2><CompletedTitle done={done}>{lesson.title}</CompletedTitle></h2><p><CodeText>{lesson.topic}</CodeText></p><span className={`lesson-status ${done ? 'done' : ''}`}>{done ? 'Completed' : 'Not complete'}</span><LearningLinks lesson={lesson} /></li>;})}</ol>
  </main>;
}

export function ProjectsPage() { return <CollectionPage type="Project" />; }
export function AssignmentsPage() { return <CollectionPage type="Assignment" />; }

export function CoursePage() {
  const { progress } = useProgress();
  const finished = orderedLessons.filter(l => practiceComplete(l, progress)).length;
  const next = orderedLessons.find(l => !practiceComplete(l, progress)) || orderedLessons[0];
  return <main className="page-shell course-page">
    <section className="course-intro"><div><span className="eyebrow">CSE 121 · SPRING 2026 TOPICS</span><h1>Learn <code>Java</code>.<br />Put it to work.</h1><p><CodeText>{'A complete topic path through beginner `Java`, with short exercises and robot labs. One idea, one prediction, one program at a time.'}</CodeText></p><Link className="primary-link" to={lessonRoute(next, progress)}>{finished ? 'Continue learning' : 'Start the first lesson'} <Icon name="arrow-right" /></Link></div><div className="course-progress"><span className="mini-pip" aria-hidden="true"><Icon name="bot" /></span><strong>{finished}<small> / {orderedLessons.length}</small></strong><span>practices completed</span><progress max={orderedLessons.length} value={finished} aria-label="Course completion" /><p>Passing the code checks marks a lesson complete. The model and quiz unlock the code; notes are optional.</p></div></section>
    <div className="section-heading"><h2>Learning path</h2><span>{modules.length} modules · {orderedLessons.length} lessons · <code>Java</code> fundamentals only</span></div>
    <p className="path-legend">Each lesson has three stops, in order: <b>Explore</b>, the idea and an interactive model; <b>Quiz</b>, one prediction to answer correctly; then <b>Practice</b>, <b>Project</b>, or <b>Assignment</b>, where <code>Student.java</code> is written and run. Each stop unlocks the next.</p>
    <div className="module-grid">{modules.map((module, i) => {
      const done = module.ids.filter(id => practiceComplete(lessons.find(l => l.id === id), progress)).length;
      return <Link key={module.id} className={`module-card${done===module.ids.length?' lesson-complete':''}`} to={`/module/${module.id}`}><span className="module-number">{String(i + 1).padStart(2, '0')}</span><h3><CompletedTitle done={done===module.ids.length}>{module.title}</CompletedTitle></h3><p><CodeText>{module.description}</CodeText></p><footer><span>{done} / {module.ids.length} completed</span><Icon name="arrow-up-right" /></footer></Link>;
    })}</div>
    <p className="course-footnote">Based on the topic coverage of UW CSE 121, Spring 2026. Original exercises adapted for tutoring and robotics; not an official UW course or accreditation.</p>
  </main>;
}

export function ModulePage() {
  const { moduleId } = useParams(), { progress } = useProgress(); const module = modules.find(m => m.id === moduleId);
  if (!module) return <main className="page-shell"><h1>Module not found</h1><Link to="/">Course home</Link></main>;
  return <main className="page-shell module-page"><Link className="back-link" to="/"><Icon name="arrow-left" /> Course home</Link><span className="eyebrow">MODULE {String(modules.indexOf(module) + 1).padStart(2, '0')}</span><h1><CodeText>{module.title}</CodeText></h1><p className="page-description"><CodeText>{module.description}</CodeText></p>
    <ol className="lesson-list">{module.ids.map((id, i) => { const lesson = lessons.find(l => l.id === id), complete = practiceComplete(lesson, progress), passedParts=lesson.parts?.filter(part=>hasPassedPart(lessons.find(l=>l.id===part),progress)).length||0; return <li key={id} className={complete?'lesson-complete':''}><span className="lesson-order">{String(i + 1).padStart(2, '0')}</span><div><strong><CompletedTitle done={complete}>{lesson.title}</CompletedTitle></strong><span><CodeText>{lesson.topic}</CodeText> · {lesson.kind === 'robot' ? '3D robot lab' : <><code>Java</code> terminal</>}</span><span className="content-type">{practiceType(lesson)}</span>{lesson.debug && <span className="debug-badge">Bug hunt</span>}</div><span className={`lesson-status ${complete ? 'done' : ''}`}>{complete ? 'Completed' : passedParts ? `${passedParts} / ${lesson.parts.length} parts passed` : progress.completed.includes(id) ? 'Re-run updated checks' : progress.drafts[id] ? 'In progress' : 'Not started'}</span><LearningLinks lesson={lesson} /></li>; })}</ol>
    <p className="course-footnote">Work in order when a topic is new. Any lesson can be reopened to revisit an earlier idea.</p>
  </main>;
}

export function ProgressPage() {
  const { progress } = useProgress(); const done = orderedLessons.filter(l => practiceComplete(l, progress)).length;
  return <main className="page-shell"><span className="eyebrow">LEARNING RECORD</span><h1>Progress.</h1><p className="page-description">{done} of {orderedLessons.length} practices completed. Passed lessons are crossed off. Optional notes stay available.</p>
    <div className="progress-summary"><strong>{done}<span>code checks passed</span></strong><strong>{orderedLessons.filter(l => (progress.reflections[l.id] || '').trim().length > 0).length}<span>optional notes saved</span></strong><strong>{orderedLessons.length - done}<span>practices remaining</span></strong></div>
    <div className="reflection-list">{orderedLessons.map(lesson => {const complete=practiceComplete(lesson,progress);return <details key={lesson.id} className={complete?'lesson-complete':''}><summary><CompletedTitle done={complete}>{lesson.title}</CompletedTitle><span className="completion-status">{complete?'Completed':'Not complete'}</span>{lesson.debug && <> <span className="debug-badge">Bug hunt</span></>}</summary><p><CodeText>{lesson.reflection}</CodeText></p><blockquote><CodeText>{progress.reflections[lesson.id] || 'No optional notes saved.'}</CodeText></blockquote><Link to={lessonRoute(lesson, progress)}>Open lesson <Icon name="arrow-right" /></Link></details>;})}</div>
    {done === orderedLessons.length && <section className="completion-card"><h2>CSE 121 topic path completed</h2><p>Every lesson stays open for review and new variations.</p></section>}
  </main>;
}

export function SettingsPage() {
  const { progress, update } = useProgress(); const [runtime, setRuntime] = useState(null), [message, setMessage] = useState(''), [javaHome, setJavaHome] = useState(''), [javaMessage, setJavaMessage] = useState('');
  const refresh = () => runtimeInfo().then(setRuntime).catch(e => setMessage(e.message));
  useEffect(() => { refresh(); if (inDesktop) request('settings.get').then(s => setJavaHome(s?.javaHome || '')).catch(e => setMessage(e.message)); }, []);
  const saveJavaHome = async () => { try { await request('settings.set', { javaHome: javaHome.trim() }); setJavaMessage('Saved. Rechecking the JDK…'); await refresh(); setJavaMessage('Saved.'); } catch (e) { setJavaMessage(e.message); } };
  const action = async method => { try { setMessage(await request(method)); } catch (e) { setMessage(e.message); } };
  return <main className="page-shell settings-page"><span className="eyebrow">WORKSHOP SETTINGS</span><h1>Settings.</h1>
    <section className="settings-section"><h2>Robot labs</h2><label>Default setting<select value={progress.view.environment} onChange={e => update(p => ({ ...p, view: { ...p.view, environment: e.target.value } }))}><option value="workshop">Workshop</option><option value="garden">Garden lab</option><option value="moon">Moon station</option></select></label><label><input type="checkbox" checked={progress.view.effects} onChange={e => update(p => ({ ...p, view: { ...p.view, effects: e.target.checked } }))} /> Collision effects and celebrations</label><p>Reduced-motion preferences always suppress shake, debris animation, and confetti.</p></section>
    <section className="settings-section"><h2>Files and backups</h2><p><CodeText>{`\`Java\` files live in the learning workspace${inDesktop ? '' : ' and work with VS Code’s Git tools'}. Export progress before changing computers. Older browser and desktop backups can be imported; existing \`Java\` files are never replaced by an import.`}</CodeText></p><div className="settings-actions"><button onClick={() => action('progress.export')}>Export progress backup</button><button onClick={() => action('progress.import')}>Import backup</button></div><p role="status"><CodeText>{message}</CodeText></p></section>
    <section className="settings-section"><h2><code>Java</code> setup</h2><p>{runtime?.java ? <><CodeText>{runtime.jdk}</CodeText> · <code>{runtime.javaHome}</code></> : <CodeText>{runtime?.error || 'Checking the JDK…'}</CodeText>}</p>{inDesktop ? <><label>Java home (JDK folder)<input value={javaHome} onChange={e => setJavaHome(e.target.value)} placeholder="Empty: detect automatically" spellCheck={false} /></label><div className="settings-actions"><button onClick={saveJavaHome}>Save</button></div><p role="status">{javaMessage}</p></> : <p><CodeText>{runtime?.javaSupport ? 'VS Code `Java` language support is installed.' : 'Install Language Support for `Java` by Red Hat for completion, formatting, and diagnostics.'}</CodeText></p>}{!inDesktop && !runtime?.workspace && <p>Open a learning folder before starting an exercise.</p>}<div className="settings-actions">{!inDesktop && <button onClick={() => action('settings.java')}>Configure <code>Java</code> home</button>}{!inDesktop && <button onClick={() => action('workspace.open')}>Open learning folder</button>}</div></section>
    <section className="settings-section"><h2>{inDesktop ? 'App' : 'Extension'}</h2><p className="storage-location">Progress file: {runtime?.storage ? <code>{runtime.storage}</code> : 'Loading…'}</p><p>Version {runtime?.version || '…'}. {inDesktop ? 'New modules ship in app updates.' : 'New modules ship in extension updates. This local build is installed from a VSIX; it has not been published to the Marketplace.'}</p><a href="https://courses.cs.washington.edu/courses/cse121/26sp/" target="_blank" rel="noreferrer">CSE 121 reference, Spring 2026 <Icon name="external-link" /></a></section>
  </main>;
}
