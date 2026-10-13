import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, Progress, SegmentedControl, Select, Switch, Tabs, TextField } from '@radix-ui/themes';
import { modules, orderedLessons, lessons } from './curriculum.js';
import { useProgress, practiceComplete, hasPassedPart } from './context.js';
import { useAppearance } from './appearance.jsx';
import { useDemo } from './demo.jsx';
import { request, runtimeInfo } from './platform.js';
import CodeText from './code-text.jsx';
import Icon from './icon.jsx';
import LockedControl from './lock-control.jsx';
import { practiceType, lessonRoute, practicePath, flowSteps } from './routes.js';
import { games } from './games/index.js';
import { gameComplete } from '../shared/completion.js';
import { gameRoute, subtopicUnit } from '../shared/game-contract.js';
import { missingProjectPrerequisites, projectPrerequisites } from '../shared/project-access.js';
import './dashboard.css';
import './challenge.css';
import { INTERFACE_SCALES } from '../shared/display-preferences.js';

const plain = text => String(text || '').replaceAll('`', '');
const lookup = id => lessons.find(lesson => lesson.id === id);
export const moduleTopics = {
  basics: { title: 'Java basics', summary: 'Printing, variables, arithmetic, and strings.', icon: 'file-code' },
  loops: { title: 'Loops', summary: 'For loops, nested loops, and running totals.', icon: 'rotate-cw' },
  methods: { title: 'Methods', summary: 'Parameters, return values, and reusable code.', icon: 'file-code' },
  decisions: { title: 'Decisions', summary: 'Conditions, while loops, and input.', icon: 'traffic-light' },
  arrays: { title: 'Arrays', summary: 'Indexing, array traversal, and 2D grids.', icon: 'grid' },
  finish: { title: 'Final projects', summary: 'Robot navigation, cargo delivery, and a final report.', icon: 'bot' },
};
const moduleTopic = module => moduleTopics[module.id];
const codingProgress = (ids, progress) => {
  const tasks = [...new Set(ids.flatMap(id => lookup(id).parts || [id]))];
  return { passed: tasks.filter(id => hasPassedPart(lookup(id), progress)).length, total: tasks.length };
};
function CodingProgress({ ids, progress, label = 'Coding practice', compact = false }) {
  const { passed, total } = codingProgress(ids, progress);
  return <div className={`coding-progress${compact ? ' is-compact' : ''}`}>
    <div className="coding-progress-label"><span>{label}</span><span>{passed} / {total} passed</span></div>
    <Progress value={total ? passed / total * 100 : 0} aria-label={`${label}: ${passed} of ${total} coding practices passed`} />
  </div>;
}
const requirementsFor = (ids, progress) => ids.map(id => ({ label: plain(lookup(id)?.title || id), to: lookup(id) ? lessonRoute(lookup(id), progress) : undefined }));

export function TopBar({ back, trail = [], children }) {
  const items = trail.filter(Boolean);
  if (items[0] === back.label) items.shift();
  return <header className="app-topbar">
    <Button asChild variant="surface" color="gray" className="topbar-back"><Link to={back.to}><Icon name="arrow-left" />{back.label}</Link></Button>
    <nav className="topbar-trail" aria-label="Breadcrumb"><ol>{items.map((item, i) => <li key={i} aria-current={i === items.length - 1 ? 'page' : undefined}>{plain(item)}</li>)}</ol></nav>
    {children}
  </header>;
}

export function FlowSteps({ lesson, current }) {
  const { progress } = useProgress(), { demo } = useDemo();
  const steps = flowSteps(lesson, progress);
  return <ol className="flow-steps" aria-label="Lesson steps">{steps.map((step, i) => {
    const open = step.open || demo, selected = step.key === current;
    const label = `${step.label}${step.done ? ', complete' : ''}`;
    const body = <>{step.done && <Icon name="check" />}<span>{step.label}</span></>;
    return <li key={step.key} className={step.done ? 'is-done' : undefined}>
      {open || selected ? <Button asChild variant={selected ? 'solid' : 'surface'} color={selected ? undefined : 'gray'} className="flow-step"><Link to={step.to} aria-current={selected ? 'step' : undefined} aria-label={label}>{body}</Link></Button>
        : <LockedControl className="flow-step" label={step.label} requirements={steps.slice(0, i).filter(previous => !previous.done).map(previous => ({ label: previous.label, to: previous.to }))}>{step.label}</LockedControl>}
    </li>;
  })}</ol>;
}

export const lessonBack = lesson => { if (lesson.independent) return { to: `/module/${lesson.unit}`, label: moduleTopics[lesson.unit].title }; const type = practiceType(lesson); if (type !== 'Practice') return { to: '/projects', label: 'Projects' }; const module = modules.find(m => m.ids.includes(lesson.parentId || lesson.id)); return { to: module ? `/module/${module.id}` : '/', label: 'Course' }; };
export const lessonTrail = lesson => [moduleTopics[modules.find(m => m.ids.includes(lesson.parentId || lesson.id))?.id]?.title || `${practiceType(lesson)}s`, lessons.find(l => l.id === lesson.parentId)?.title || lesson.title];
const gameIds = new Set(games.map(game => game.id));
export const projectCatalog = [...games, ...orderedLessons.filter(lesson => practiceType(lesson) === 'Project')];
const projectUnit = project => modules.find(module => module.id === project.unit)?.id || (project.subtopic ? subtopicUnit(project.subtopic) : modules.find(module => module.ids.includes(project.id))?.id);
const moduleProjects = module => projectCatalog.filter(project => projectUnit(project) === module.id);
const projectPath = project => gameIds.has(project.id) ? gameRoute(project.id) : practicePath(project);
const projectDone = (project, progress) => gameIds.has(project.id) ? gameComplete(project.id, progress) : practiceComplete(project, progress);
const timeFor = project => Array.isArray(project.estimatedMinutes) ? `${project.estimatedMinutes.join('–')} min` : project.duration || '';
const projectIcons = { 'hello-arena': 'bot', 'hoop-streak': 'target', 'supply-relay': 'package', 'staircase-arena': 'stairs', 'tower-rescue': 'tower', 'signal-patrol': 'traffic-light', 'mosaic-survey': 'grid' };

export function ProjectCard({ project }) {
  const { progress } = useProgress(), { demo } = useDemo();
  const done = projectDone(project, progress), missing = missingProjectPrerequisites(project, progress, lookup);
  const locked = !demo && missing.length > 0;
  const prerequisites = projectPrerequisites(project), topics = project.topics || (project.id === 'java-final-report' ? ['Loops', 'Methods', 'Arrays'] : project.topic ? [project.topic] : []);
  return <article className={`project-card${locked ? ' is-locked' : ''}${done ? ' is-complete' : ''}`} aria-labelledby={`project-title-${project.id}`}>
    <div className="project-card-heading"><span className="project-icon"><Icon name={projectIcons[project.id] || 'bot'} /></span><div><h3 id={`project-title-${project.id}`}>{plain(project.title)}</h3><span className="project-time"><span className="project-type">{gameIds.has(project.id) && !project.project ? 'Minigame' : 'Project'}</span>{timeFor(project) && <span>{timeFor(project)}</span>}</span></div>{done && <Icon name="check" label="Completed" />}</div>
    {topics.length > 0 && <ul className="topic-tags" aria-label="Topics">{topics.map(topic => <li key={topic}><Badge color="gray" variant="soft">{plain(topic)}</Badge></li>)}</ul>}
    <div className="project-card-bottom">
      {prerequisites.length > 0 && <details className="project-requirements"><summary>Required topics</summary><ul>{prerequisites.map(id => <li key={id}>{lookup(id) ? <Link to={lessonRoute(lookup(id), progress)}>{plain(lookup(id).title)}{!missing.includes(id) && <Icon name="check" label="Completed" />}</Link> : <span>{id}</span>}</li>)}</ul></details>}
      {locked ? <LockedControl label={project.title} requirements={requirementsFor(missing, progress)}>Open</LockedControl>
        : <Button asChild variant={done ? 'surface' : 'solid'} color={done ? 'gray' : undefined}><Link to={projectPath(project)} aria-label={`${done ? 'Reopen' : 'Open'} ${project.title}`}>{done ? 'Review' : 'Open'}<Icon name="arrow-right" /></Link></Button>}
    </div>
  </article>;
}

function ModuleProjectLinks({ module }) {
  const { progress } = useProgress(), { demo } = useDemo();
  const projects = moduleProjects(module);
  if (!projects.length) return null;
  return <div className="module-project-links"><ul>{projects.map(project => {
    const done = projectDone(project, progress), missing = missingProjectPrerequisites(project, progress, lookup);
    return <li key={project.id}>{!demo && missing.length ? <LockedControl label={project.title} requirements={requirementsFor(missing, progress)}>{plain(project.title)}</LockedControl> : <Link to={projectPath(project)} aria-label={`${project.title}${done ? ', complete' : ''}`}><Icon name={projectIcons[project.id] || 'bot'} />{plain(project.title)}{done && <Icon name="check" />}</Link>}</li>;
  })}</ul></div>;
}

export function ProjectsPage() {
  const { progress } = useProgress();
  const grouped = modules.map(module => ({ module, projects: moduleProjects(module).filter(project => !projectDone(project, progress)) })).filter(group => group.projects.length);
  const completed = projectCatalog.filter(project => projectDone(project, progress));
  return <main className="page-shell dashboard projects-dashboard">
    <header className="dashboard-heading"><h1>Projects</h1></header>
    <div className="catalog-layout"><aside className="catalog-sidebar"><nav aria-label="Jump to project module">{grouped.map(({ module }) => <Button key={module.id} variant="ghost" color="gray" onClick={() => document.getElementById(`projects-${module.id}`)?.scrollIntoView({ block: 'start' })}><Icon name={moduleTopic(module).icon} />{moduleTopic(module).title}</Button>)}{completed.length > 0 && <Button variant="ghost" color="gray" onClick={() => document.getElementById('projects-review')?.scrollIntoView({ block: 'start' })}><Icon name="check" />Review</Button>}</nav></aside>
      <div className="catalog-groups">{grouped.map(({ module, projects }) => <section key={module.id} id={`projects-${module.id}`} className="catalog-group" aria-labelledby={`projects-heading-${module.id}`}>
        <div className="section-heading"><div className="catalog-heading"><Icon name={moduleTopic(module).icon} /><h2 id={`projects-heading-${module.id}`}>{moduleTopic(module).title}</h2></div><Link to={`/module/${module.id}`}>Open module<Icon name="arrow-up-right" /></Link></div>
        <div className="project-grid">{projects.map(project => <ProjectCard key={project.id} project={project} />)}</div>
      </section>)}{completed.length > 0 && <section id="projects-review" className="catalog-group catalog-review" aria-labelledby="projects-review-heading"><div className="section-heading"><h2 id="projects-review-heading">Review</h2></div><div className="project-grid">{completed.map(project => <ProjectCard key={project.id} project={project} />)}</div></section>}</div>
    </div>
  </main>;
}

export function CoursePage() {
  const { progress } = useProgress();
  const next = orderedLessons.find(lesson => !practiceComplete(lesson, progress));
  return <main className="page-shell dashboard course-dashboard">
    <header className="dashboard-heading"><h1>Course</h1>{next && <Button asChild size="3"><Link to={lessonRoute(next, progress)}>Continue<Icon name="arrow-right" /></Link></Button>}</header>
    <CodingProgress ids={orderedLessons.map(lesson => lesson.id)} progress={progress} />
    <ol className="module-grid">{modules.map(module => {
      const topic = moduleTopic(module), counts = codingProgress(module.ids, progress), complete = counts.passed === counts.total;
      return <li key={module.id}><Link className={`module-card${complete ? ' lesson-complete' : ''}`} to={`/module/${module.id}`} aria-label={`${topic.title}${complete ? ', complete' : ''}`}>
        <span className="module-topic-icon"><Icon name={topic.icon} /></span><div className="module-card-copy"><h2>{topic.title}</h2><p>{topic.summary}</p></div>
        <CodingProgress ids={module.ids} progress={progress} label={topic.title} compact />
        <Icon name={complete ? 'check' : 'arrow-right'} />
      </Link></li>;
    })}</ol>
  </main>;
}

function ModuleLesson({ lesson }) {
  const { progress } = useProgress();
  const complete = practiceComplete(lesson, progress), passedParts = lesson.parts?.filter(id => hasPassedPart(lookup(id), progress)).length || 0;
  return <article className={`module-lesson${complete ? ' lesson-complete' : ''}`}>
    <div className="module-lesson-title"><h3>{plain(lesson.title)}</h3>{lesson.debug && <Badge color="gray" variant="soft">Bug fix</Badge>}{complete && <Icon name="check" label="Completed" />}{!complete && passedParts > 0 && <span>{passedParts} / {lesson.parts.length} parts</span>}</div>
    <FlowSteps lesson={lesson} />
  </article>;
}

function ModuleChallenges({ module }) {
  const { progress } = useProgress(), { demo } = useDemo();
  const challenges = lessons.filter(lesson => lesson.independent && lesson.unit === module.id);
  if (!challenges.length) return null;
  return <section id="module-challenges" className="module-challenges" aria-labelledby="module-challenges-heading"><h2 id="module-challenges-heading" tabIndex={-1}><Icon name="flag" />Challenges</h2>
    <div className="challenge-grid">{[...challenges].sort((a, b) => Number(practiceComplete(a, progress)) - Number(practiceComplete(b, progress))).map(challenge => {
      const done = practiceComplete(challenge, progress), missing = missingProjectPrerequisites(challenge, progress, lookup);
      return <article className={`challenge-card${done ? ' is-complete' : ''}`} key={challenge.id}>
        <div className="challenge-card-heading"><span className="challenge-badge"><Icon name="flag" />Challenge</span>{done && <Icon name="check" label="Completed" />}</div>
        <h3>{challenge.title}</h3><p>{challenge.topic}</p><div className="challenge-card-bottom"><span>{challenge.estimatedMinutes} min</span>
          {!demo && missing.length ? <LockedControl label={challenge.title} requirements={requirementsFor(missing, progress)}>Start</LockedControl> : <Button asChild variant={done ? 'surface' : 'solid'} color={done ? 'gray' : undefined}><Link to={practicePath(challenge)} aria-label={`${done ? 'Review' : 'Start challenge:'} ${challenge.title}`}>{done ? 'Review' : 'Start challenge'}</Link></Button>}
        </div>
      </article>;
    })}</div>
  </section>;
}

export function ModulePage() {
  const { moduleId } = useParams(), { progress } = useProgress();
  const module = modules.find(item => item.id === moduleId);
  if (!module) return <main className="page-shell"><h1>Module not found</h1><Link to="/">Course</Link></main>;
  const topic = moduleTopic(module), practice = module.ids.map(lookup).filter(lesson => practiceType(lesson) === 'Practice'), projects = moduleProjects(module);
  const pendingLessons = practice.filter(lesson => !practiceComplete(lesson, progress)), completedLessons = practice.filter(lesson => practiceComplete(lesson, progress));
  const pendingProjects = projects.filter(project => !projectDone(project, progress)), completedProjects = projects.filter(project => projectDone(project, progress));
  const sections = [
    { id: 'lessons', label: 'Lessons', icon: 'book-open', visible: practice.length > 0 },
    { id: 'projects', label: 'Projects', icon: 'bot', visible: projects.length > 0 },
    { id: 'challenges', label: 'Challenges', icon: 'flag', visible: lessons.some(lesson => lesson.independent && lesson.unit === module.id) },
  ].filter(section => section.visible);
  return <main className="page-shell dashboard module-dashboard"><Button asChild variant="ghost" color="gray" className="module-back"><Link to="/"><Icon name="arrow-left" />Course</Link></Button>
    <header className="dashboard-heading"><div className="module-topic-heading"><span className="module-topic-icon"><Icon name={topic.icon} /></span><div><h1>{topic.title}</h1><p>{topic.summary}</p></div></div></header>
    <CodingProgress ids={module.ids} progress={progress} />
    <div className="catalog-layout module-layout"><aside className="catalog-sidebar module-sidebar"><nav aria-label="Module sections">{sections.map(section => <Button key={section.id} variant="ghost" color="gray" className={`section-${section.id}`} onClick={() => {
      document.getElementById(`module-${section.id}-heading`)?.focus({ preventScroll: true });
      document.getElementById(`module-${section.id}`)?.scrollIntoView({ block: 'start' });
    }}><Icon name={section.icon} />{section.label}</Button>)}</nav></aside><div className="module-content">
    {practice.length > 0 && <section id="module-lessons" className="module-lessons" aria-labelledby="module-lessons-heading"><h2 id="module-lessons-heading" tabIndex={-1}><Icon name="book-open" />Lessons</h2>
      <Tabs.Root key={module.id} defaultValue={pendingLessons.length ? 'todo' : 'review'} className="lesson-tabs">
        <Tabs.List aria-label="Lesson list"><Tabs.Trigger value="todo">To do</Tabs.Trigger><Tabs.Trigger value="review">Review</Tabs.Trigger></Tabs.List>
        <Tabs.Content value="todo">{pendingLessons.length ? <ol className="module-sequence">{pendingLessons.map(lesson => <li key={lesson.id}><ModuleLesson lesson={lesson} /></li>)}</ol> : <p className="lesson-list-empty">All lessons passed. Open Review to revisit them.</p>}</Tabs.Content>
        <Tabs.Content value="review">{completedLessons.length ? <ol className="module-sequence">{completedLessons.map(lesson => <li key={lesson.id}><ModuleLesson lesson={lesson} /></li>)}</ol> : <p className="lesson-list-empty">No finished lessons yet.</p>}</Tabs.Content>
      </Tabs.Root>
    </section>}
    {projects.length > 0 && <section id="module-projects" className="module-projects" aria-labelledby="module-projects-heading"><h2 id="module-projects-heading" tabIndex={-1}><Icon name="bot" />Projects</h2>
      <div className="project-grid">{pendingProjects.map(project => <ProjectCard key={project.id} project={project} />)}</div>
      {completedProjects.length > 0 && <details className="completed-review"><summary><Icon name="check" />Review projects</summary><div className="project-grid">{completedProjects.map(project => <ProjectCard key={project.id} project={project} />)}</div></details>}
    </section>}
    <ModuleChallenges module={module} />
    </div></div>
  </main>;
}

export function ProgressPage() {
  const { progress } = useProgress();
  const notes = orderedLessons.filter(lesson => (progress.reflections?.[lesson.id] || '').trim());
  const [noteId, setNoteId] = useState('');
  const note = notes.find(lesson => lesson.id === noteId) || notes[0];
  return <main className="page-shell dashboard progress-dashboard"><header className="dashboard-heading"><h1>Progress</h1></header>
    <CodingProgress ids={orderedLessons.map(lesson => lesson.id)} progress={progress} />
    <div className="learning-roadmap"><ol>{modules.map((module, i) => {
      const counts = codingProgress(module.ids, progress), completed = counts.passed === counts.total, topic = moduleTopic(module);
      return <li key={module.id} className={`roadmap-module${completed ? ' is-complete' : ''}`}>
        <span className="roadmap-node" aria-hidden="true">{completed ? <Icon name="check" /> : i + 1}</span>
        <section aria-labelledby={`roadmap-${module.id}`}><div className="roadmap-heading"><h2 id={`roadmap-${module.id}`}><Link to={`/module/${module.id}`}>{topic.title}</Link></h2></div>
          <CodingProgress ids={module.ids} progress={progress} label={topic.title} compact />
          <ul className="roadmap-lessons">{module.ids.map(id => { const lesson = lookup(id), passed = practiceComplete(lesson, progress); return <li key={id}><Link to={lessonRoute(lesson, progress)} aria-label={`${lesson.title}${passed ? ', complete' : ''}`}><span className={`lesson-dot${passed ? ' is-complete' : ''}`} aria-hidden="true">{passed && <Icon name="check" />}</span>{plain(lesson.title)}</Link></li>; })}</ul>
          <ModuleProjectLinks module={module} />
        </section>
      </li>;
    })}</ol></div>
    {note && <section className="saved-notes" aria-labelledby="saved-notes-heading"><h2 id="saved-notes-heading">Notes</h2><Select.Root value={note.id} onValueChange={setNoteId}><Select.Trigger aria-label="Choose saved lesson notes" /><Select.Content>{notes.map(lesson => <Select.Item key={lesson.id} value={lesson.id}>{plain(lesson.title)}</Select.Item>)}</Select.Content></Select.Root><blockquote><CodeText>{progress.reflections[note.id]}</CodeText></blockquote><Link to={lessonRoute(note, progress)}>Open lesson<Icon name="arrow-up-right" /></Link></section>}
  </main>;
}

export function SettingsPage() {
  const { progress, update } = useProgress(), { appearance, setAppearance, interfaceScale, setInterfaceScale, editorSize, setEditorSize } = useAppearance(), { demo, demoAvailable, setDemo } = useDemo();
  const [runtime, setRuntime] = useState(null), [message, setMessage] = useState(''), [javaHome, setJavaHome] = useState(''), [javaMessage, setJavaMessage] = useState('');
  const [demoBusy, setDemoBusy] = useState(false), [demoError, setDemoError] = useState('');
  useEffect(() => { runtimeInfo().then(setRuntime).catch(error => setMessage(error.message)); request('settings.get').then(settings => setJavaHome(settings?.javaHome || '')).catch(error => setMessage(error.message)); }, [demo]);
  const saveJavaHome = async () => { try { await request('settings.set', { javaHome: javaHome.trim() }); setRuntime(await runtimeInfo()); setJavaMessage('Java setting saved.'); } catch (error) { setJavaMessage(error.message); } };
  const action = async method => { try { setMessage(await request(method)); } catch (error) { setMessage(error.message); } };
  const changeDemo = async enabled => {
    if (demoBusy) return;
    setDemoBusy(true); setDemoError('');
    try { await setDemo(enabled); } catch (error) { setDemoError(error.message); }
    finally { setDemoBusy(false); }
  };
  return <main className="page-shell dashboard settings-dashboard"><header className="dashboard-heading"><h1>Settings</h1></header>
    <div className="settings-panels">
      <section className="settings-card" aria-labelledby="appearance-heading"><h2 id="appearance-heading"><span className="settings-heading-icon"><Icon name="lightbulb" /></span>Appearance</h2><SegmentedControl.Root value={appearance} onValueChange={value => value && setAppearance(value)} aria-label="Appearance"><SegmentedControl.Item value="system">System</SegmentedControl.Item><SegmentedControl.Item value="light">Light</SegmentedControl.Item><SegmentedControl.Item value="dark">Dark</SegmentedControl.Item></SegmentedControl.Root>
        <div className="settings-row display-setting"><label htmlFor="interface-scale">Interface size</label><Select.Root value={String(interfaceScale)} onValueChange={setInterfaceScale}><Select.Trigger id="interface-scale" /><Select.Content position="popper">{INTERFACE_SCALES.map(value => <Select.Item key={value} value={String(value)}>{value}%{value === 100 ? ' (default)' : ''}</Select.Item>)}</Select.Content></Select.Root></div>
        <div className="settings-row display-setting"><span id="editor-font-label">Code font size</span><div className="code-font-control" role="group" aria-labelledby="editor-font-label"><Button variant="soft" aria-label="Decrease code font size" disabled={editorSize <= 10} onClick={() => setEditorSize(value => value - 1)}><Icon name="minus" /></Button><output id="editor-font-size" aria-live="polite">{editorSize} px</output><Button variant="soft" aria-label="Increase code font size" disabled={editorSize >= 28} onClick={() => setEditorSize(value => value + 1)}><Icon name="plus" /></Button></div></div>
      </section>
      <section className="settings-card" aria-labelledby="arena-heading"><h2 id="arena-heading"><span className="settings-heading-icon robot"><Icon name="bot" /></span>Robot arena</h2><div className="settings-row"><label htmlFor="default-arena">Default scenery</label><Select.Root value={progress.view.environment} onValueChange={environment => update(current => ({ ...current, view: { ...current.view, environment } }))}><Select.Trigger id="default-arena" /><Select.Content><Select.Item value="workshop">Workshop</Select.Item><Select.Item value="garden">Garden lab</Select.Item><Select.Item value="moon">Moon station</Select.Item></Select.Content></Select.Root></div><div className="settings-row"><label htmlFor="show-effects">Collision effects & celebrations</label><Switch id="show-effects" checked={progress.view.effects} onCheckedChange={effects => update(current => ({ ...current, view: { ...current.view, effects } }))} /></div></section>
      {demoAvailable && <section className="settings-card" aria-labelledby="demo-heading"><div className="settings-row"><h2 id="demo-heading"><span className="settings-heading-icon"><Icon name="play" /></span>Demo mode</h2><Switch aria-labelledby="demo-heading" aria-describedby="demo-description" checked={demo} disabled={demoBusy} aria-busy={demoBusy} onCheckedChange={changeDemo} /></div><p id="demo-description">Try any activity without changing saved work. Resets on restart.</p>{demoBusy && <p role="status">Switching…</p>}{demoError && <p role="alert">{demoError}</p>}</section>}
      <section className="settings-card" aria-labelledby="files-heading"><h2 id="files-heading"><span className="settings-heading-icon backup"><Icon name="package" /></span>Saved work & backups</h2><p>Copy your <code>.pip-java</code> folder to back up both Java files and progress. Importing progress keeps existing Java files.</p><div className="dashboard-actions"><Button variant="surface" onClick={() => action('progress.export')}>Show save location</Button><Button variant="surface" onClick={() => action('progress.import')}>Import progress</Button></div><small>For import, place the backup at <code>~/.pip-java/pip-progress-import.json</code>.</small><p className="settings-message" role="status"><CodeText>{message}</CodeText></p></section>
      <section className="settings-card settings-wide" aria-labelledby="java-heading"><div className="settings-row"><h2 id="java-heading"><span className="settings-heading-icon java"><Icon name="file-code" /></span>Java setup</h2><Badge color={runtime?.java ? 'green' : runtime?.error ? 'amber' : 'gray'} variant="soft">{runtime?.java ? 'Ready' : runtime?.error ? 'Needs attention' : 'Checking setup'}</Badge></div><p><CodeText>{runtime?.java ? runtime.jdk : runtime?.error || 'Checking the bundled Java runtime…'}</CodeText></p><details><summary>Advanced Java settings</summary><label className="java-home-label" htmlFor="java-home">Java home (JDK folder)</label><div className="java-home-controls"><TextField.Root id="java-home" value={javaHome} onChange={event => setJavaHome(event.target.value)} placeholder="Empty: detect automatically" spellCheck={false} /><Button onClick={saveJavaHome}>Save Java setting</Button></div>{runtime?.javaHome && <p className="storage-location">Using <code>{runtime.javaHome}</code></p>}<p role="status">{javaMessage}</p></details></section>
    </div>
    <footer className="settings-footer"><span>Pip {runtime?.version || ''}</span><span>Progress: <code>{runtime?.storage || 'Loading…'}</code></span></footer>
  </main>;
}
