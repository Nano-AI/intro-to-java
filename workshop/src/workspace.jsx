import React, { useEffect, useRef, useState, Suspense, lazy } from 'react';
import { Button } from '@radix-ui/themes';
import { Navigate, useParams } from 'react-router-dom';
import { lessons, modules } from './curriculum.js';
import { useProgress, hasPassedLesson, hasPassedPart } from './context.js';
import { request, subscribe } from './platform.js';
import { createEffects } from '../web/effects.js';
import RobotView from './robot-view.jsx';
import CodeText from './code-text.jsx';
import JavaCode, { JavaInline } from './java-code.jsx';
import Icon, { Status } from './icon.jsx';
import { OutputGraphic } from './visual-lab.jsx';
import { practiceType, unfinishedStep } from './routes.js';
import { TopBar, FlowSteps, lessonBack, lessonTrail } from './pages.jsx';
import { missingProjectPrerequisites } from '../shared/project-access.js';
import ProjectLock from './project-lock.jsx';
import { useDemo } from './demo.jsx';
import ChallengePanel from './challenge-panel.jsx';
import SubmissionQuality, { submissionTitle } from './submission-quality.jsx';

const mac = /Mac|iPhone|iPad/.test(navigator.platform);
const JavaEditor = lazy(() => import('./editor.jsx'));

export default function WorkspaceRoute() {
  const { demo } = useDemo();
  const { lessonId } = useParams(), { progress } = useProgress(), lesson = lessons.find(l => l.id === lessonId);
  if (!lesson) return <main className="page-shell"><h1>Lesson not found</h1><button onClick={() => request('course.open')}>Open course</button></main>;
  if (!demo && missingProjectPrerequisites(lesson, progress, id => lessons.find(l => l.id === id)).length) return <ProjectLock project={lesson} />;
  // Coding opens only after the lesson's explore and quiz; any other entry (links, lesson.focus) lands on the first unfinished step.
  const gate = demo ? null : unfinishedStep(lesson, progress);
  if (gate) return <Navigate replace to={gate} />;
  return <LessonPanel key={lesson.id} lesson={lesson} />;
}

function LessonPanel({ lesson }) {
  const { demo } = useDemo();
  const { progress, update } = useProgress(), parent = lessons.find(l=>l.id===lesson.parentId)||lesson, module = modules.find(m => m.ids.includes(parent.id));
  const parts=parent.parts||[lesson.id],partIndex=parts.indexOf(lesson.id),groupPassed=hasPassedLesson(parent,progress),type=practiceType(parent);
  const [busy, setBusy] = useState(false), [result, setResult] = useState(null), [feedback, setFeedback] = useState(lesson.independent ? '' : 'Edit `Student.java` on the left, then run it.');
  const [inserting, setInserting] = useState(false);
  const [runMode, setRunMode] = useState('public');
  const [caseIndex, setCaseIndex] = useState(0), [phase, setPhase] = useState('idle'), [file, setFile] = useState('Opening Student.java…'), [setupError, setSetupError] = useState('');
  const [controlHz, setControlHz] = useState(lesson.mission < 2 ? 1 : 20);
  const [focusPane,setFocusPane]=useState('activity'),[paneFocused,setPaneFocused]=useState(true);
  const [source,setSource]=useState(null),[confirmRestore,setConfirmRestore]=useState(false),editor=useRef();
  const [hintLevel,setHintLevel]=useState(0),[customInput,setCustomInput]=useState(lesson.independent ? lesson.cases[0]?.input || '' : ''),[custom,setCustom]=useState(null);
  const notice = useRef(), canvas = useRef(), shell = useRef(), fx = useRef(), alive = useRef(true), handledRun = useRef(''), celebrate = useRef(true), callbacks = useRef();
  const reflection = progress.reflections[parent.id] || '', codePassed = hasPassedPart(lesson,progress);
  function codeChanged() {
    setResult(null); setCustom(null); setPhase('idle'); fx.current?.clear();
    setFeedback('The code changed. Run again to test the new version.');
  }
  function finished(data) {
    if (!alive.current || !data) return;
    setPhase(data.passed ? 'success' : 'error');
    if (data.passed) {
      if (celebrate.current && !lesson.independent) { fx.current.success('Code checks passed', parts.length>1?'This repair is marked complete.':'Marked complete.'); celebrate.current = false; }
      setFeedback(submissionTitle(data));
    } else {
      setFeedback('Checks did not pass.');
    }
  }
  function applyResult(packet, history = false) {
    if (packet.lessonId !== lesson.id || handledRun.current === packet.runId) return;
    handledRun.current = packet.runId;
    if (packet.stale) { setBusy(false); codeChanged(); return; }
    if (lesson.independent) setRunMode(packet.mode || (packet.custom ? 'custom' : 'graded'));
    if (packet.custom) { setBusy(false); setCustom(packet.result); return; }
    celebrate.current = !history;
    setBusy(false); setResult(packet.result); setCaseIndex(Math.max(0,packet.result.checks?.findIndex(c=>!c.passed)??0));
    setFocusPane('output');
    if (packet.result.error) { setPhase('error'); setFeedback(packet.result.stage === 'compile' ? 'Compilation failed.' : packet.result.stage==='checks'?'Code requirements did not pass.':'The program stopped.'); }
    else if (lesson.kind === 'console') finished(packet.result);
    else { setPhase('replay'); setFeedback('Watch the replay. Pause or step through each decision.'); }
  }
  useEffect(() => {
    alive.current = true;
    fx.current = createEffects(canvas.current, notice.current, shell.current); fx.current.clear(); fx.current.enabled = progress.view.effects;
    const remove = [
      subscribe('run.started', packet => { if (packet.lessonId !== lesson.id) return; setBusy(true); if (lesson.independent) setRunMode(packet.mode || (packet.custom ? 'custom' : 'graded')); if (packet.custom) { setCustom({ running: true }); return; } fx.current.clear(); setResult(null); setPhase('running'); setFeedback('Compiling and running the saved Java file…'); }),
      subscribe('run.finished', packet => callbacks.current.applyResult(packet)),
      subscribe('document.changed', packet => { if (packet.lessonId === lesson.id) codeChanged(); }),
      subscribe('editor.replace', packet => { if (packet.lessonId === lesson.id) editor.current?.replace(packet.source); }),
      subscribe('editor.reveal', packet => { if (packet.lessonId === lesson.id) editor.current?.reveal(packet.text); }),
    ];
    request('lesson.open', { lessonId: lesson.id }).then(data => { if (!alive.current) return; setFile(data.file); setSource(data.source); if (data.result) callbacks.current.applyResult(data.result, true); }).catch(e => { if(alive.current) setSetupError(e.message); });
    const shortcut = e => { if (e.defaultPrevented) return; if (e.key === 'Enter' && (mac ? e.metaKey : e.ctrlKey)) { e.preventDefault(); e.target.id === 'custom-input' ? callbacks.current.tryInput() : callbacks.current.run(); } };
    window.addEventListener('keydown', shortcut);
    return () => { alive.current = false; remove.forEach(f => f()); fx.current?.destroy(); window.removeEventListener('keydown', shortcut); };
  }, []);
  useEffect(() => { fx.current.enabled = progress.view.effects; }, [progress.view.effects]);
  const action = async (method, params = {}) => {
    try { const data = await request(method, { lessonId: lesson.id, ...params }); if (method === 'lesson.run') callbacks.current.applyResult(data); if (data?.needsConfirm) setConfirmRestore(true); return data; }
    catch(e) { if(alive.current) { setBusy(false); if (lesson.independent) { setResult(null); setCustom(null); } setPhase('error'); setFeedback(e.message); } }
  };
  const run = () => { if (busy || inserting || setupError) return; setBusy(true); if (lesson.independent) { setRunMode('graded'); setCustom(null); } return action('lesson.run', { controlHz, ...code() }); };
  const tryInput = () => { if (busy || inserting || setupError) return; setBusy(true); if (lesson.independent) setRunMode('public'); return action('lesson.run', { controlHz, ...(lesson.independent ? { mode: 'public' } : { input: customInput }), ...code() }); };
  const insertSolution = async () => {
    if (!demo || busy || inserting || setupError || source === null) return;
    setInserting(true); setConfirmRestore(false);
    try {
      const data = await action('lesson.solution');
      if (data && alive.current) {
        editor.current?.replace(data.source);
        setResult(null); setCustom(null); setPhase('idle'); fx.current?.clear();
        setFeedback('Solution inserted.');
      }
    } finally { if (alive.current) setInserting(false); }
  };
  const code = () => editor.current ? { source: editor.current.get() } : {};
  callbacks.current = { applyResult, run: lesson.independent ? tryInput : run, tryInput };
  const restored = lessons.filter(l => l.kind === 'robot' && progress.completed.includes(l.id)).length;
  const activeCase = result?.checks?.[caseIndex];
  const shownCases=result?.checks||lesson.cases||[];
  const selectedCase=shownCases[caseIndex];
  const readsInput=lesson.kind==='console'&&lesson.cases.some(c=>c.input);
  const activeRegion=name=>({tabIndex:0,'data-active':paneFocused&&focusPane===name,onFocus:()=>{if(name==='output')fx.current?.clear();setPaneFocused(true);setFocusPane(name);},onPointerDown:()=>{if(name==='output')fx.current?.clear();setPaneFocused(true);setFocusPane(name);}});
  const editorPane = <section className="editor-pane" aria-label="Java file" onFocusCapture={()=>setPaneFocused(false)}>{source===null?<p className="editor-loading">{setupError||'Opening Student.java…'}</p>:<Suspense fallback={<p className="editor-loading">Opening the editor…</p>}><JavaEditor hideRun autocomplete={!lesson.independent} docKey={lesson.id} initialSource={source} sourceRef={editor} running={busy} onChange={codeChanged} onRun={()=>callbacks.current.run()} onDiagnose={src=>request('lesson.diagnose',{lessonId:lesson.id,source:src})} onComplete={(src,offset)=>request('lesson.complete',{lessonId:lesson.id,source:src,offset})} onSave={src=>request('lesson.save',{lessonId:lesson.id,source:src})} /></Suspense>}</section>;
  if (lesson.independent) return <ChallengePanel lesson={lesson} editor={editorPane} result={result} trial={custom} runMode={runMode} busy={busy} loading={source === null} feedback={feedback} setupError={setupError} passed={codePassed} onRun={tryInput} onSubmit={run} onStop={()=>action('run.stop')} input={customInput} setInput={setCustomInput} refs={{shell, notice, canvas}} />;
  const panel = <div ref={shell} className="lesson-panel">
    <section className="lesson-title-row"><div><span className="eyebrow">{type} · <CodeText>{lesson.topic}</CodeText></span><h1><CodeText>{lesson.title}</CodeText></h1>{lesson.debug&&<span className="debug-badge">Bug hunt</span>}</div><div className="run-controls">{demo && typeof lesson.solution === 'string' && lesson.solution.trim() && <button disabled={busy || inserting || Boolean(setupError) || source === null} onClick={insertSolution}>{inserting ? 'Inserting…' : 'Insert solution'}</button>}{busy && <button onClick={() => action('run.stop')}>Stop</button>}<button id="run" className="primary" disabled={busy || inserting || Boolean(setupError)} onClick={run} aria-keyshortcuts={mac?'Meta+Enter':'Control+Enter'}>{busy ? 'Running…' : <><Icon name="play" /> Run <kbd>{mac?'⌘↵':'Ctrl+Enter'}</kbd></>}</button></div></section>
    {parts.length>1&&<nav className="part-navigation" aria-label="Repair parts">{parts.map((id,index)=>{const part=lessons.find(l=>l.id===id),done=hasPassedPart(part,progress);return <button key={id} aria-current={id===lesson.id?'step':undefined} aria-label={`${index+1}. ${part.partTitle}${done?', completed':''}`} disabled={busy || inserting} onClick={()=>request('lesson.focus',{lessonId:id})}><span className={done?'completion-title is-complete':'completion-title'}>{index+1}. {part.partTitle}</span></button>;})}<small>Part {partIndex+1} / {parts.length}. Each part keeps its own Java file.</small></nav>}
    {setupError && <section className="setup-error" role="alert"><p>{setupError}</p><button onClick={() => window.location.reload()}>Retry setup</button></section>}
    <section className="lesson-instruction focus-region" aria-label="Current task" {...activeRegion('activity')}><div className="region-heading"><strong>Task</strong></div><p><CodeText>{lesson.task}</CodeText></p>
      {hintLevel>0&&<p className="hint-text"><strong>Hint</strong> <CodeText>{lesson.hint}</CodeText></p>}
      <div className="task-actions">{hintLevel<1&&<button className="text-button" onClick={()=>setHintLevel(level=>level+1)}><Icon name="lightbulb" /> Show a hint</button>}<button className="text-button" onClick={()=>action('lesson.learn')}><Icon name="book-open" /> Review the lesson</button></div></section>
    <section className={`result-pane focus-region ${phase}`} aria-label={lesson.kind==='robot'?'Simulator':'Program output'} {...activeRegion('output')}><div className="pane-heading"><span className="file-title">{lesson.kind==='robot'?'Simulator':'Program output'}</span>{lesson.kind==='robot' && <label className="rate-control">Decisions<select disabled={busy || inserting} value={controlHz} onChange={e=>{const hz=Number(e.target.value);setControlHz(hz);setResult(null);action('lesson.rate',{controlHz:hz});}}><option value={1}>1 / sec</option><option value={20}>20 / sec</option><option value={60}>60 / sec</option></select></label>}</div>
      {lesson.kind==='robot' ? <><div className="scene-tools"><label>Setting<select value={progress.view.environment} onChange={e=>update(p=>({...p,view:{...p.view,environment:e.target.value}}))}><option value="workshop">Workshop</option><option value="garden">Garden lab</option><option value="moon">Moon station</option></select></label></div><RobotView result={result?.trials ? result : null} mission={lesson.mission} worldSpec={lesson.world} restored={restored} environment={progress.view.environment} effectsEnabled={progress.view.effects} onFinished={finished} onCrash={()=>fx.current.crash()} /></> : <div className="console-view"><div className="challenge-case-tabs" role="group" aria-label="Test cases">{shownCases.map((c,i)=><Button size="1" variant="ghost" key={i} aria-pressed={caseIndex===i} onClick={()=>setCaseIndex(i)}>{activeCase||result?.checks ? <><Status passed={c.passed} /> </> : null}Case {i+1}</Button>)}</div>{result?.checks&&<p className="check-summary">{result.checks.filter(c=>c.passed).length} / {result.checks.length} cases passed · seed <code>{result.seed}</code></p>}<section className="output-block input-block"><h3>{selectedCase?.inputs?'Starting data':selectedCase?.invocation?'Method call':'Input'}</h3>{selectedCase?.inputs?<div className="test-inputs">{Object.entries(selectedCase.inputs).map(([name,value])=><div key={name}><JavaInline>{name}</JavaInline><strong><JavaInline>{JSON.stringify(value)}</JavaInline></strong></div>)}</div>:selectedCase?.invocation?<JavaCode>{selectedCase.invocation}</JavaCode>:<pre><code>{selectedCase?.input||'(no input)'}</code></pre>}</section><section className="output-block expected-block"><h3>Expected output</h3><pre><code>{selectedCase?.expected || '(no output)'}</code></pre></section><section className={`output-block actual-block ${activeCase?(activeCase.passed?'matched':'mismatch'):''}`}><h3>Actual output <span>{activeCase?(activeCase.passed?<><Icon name="circle-check" /> Matches</>:<><Icon name="circle-x" /> Different</>):'Not run yet'}</span></h3><pre className="actual-output"><code>{!activeCase ? 'Run Student.java to see its output.' : activeCase.output || '(no output)'}</code></pre><OutputGraphic check={activeCase}/></section>
        {readsInput&&<details className="output-block custom-block"><summary>Try own input</summary><div className="custom-body"><label htmlFor="custom-input">Input values, separated by spaces or new lines</label><textarea id="custom-input" value={customInput} maxLength={10000} placeholder={lesson.cases.find(c=>c.input).input} onChange={e=>setCustomInput(e.target.value)} /><div className="custom-actions"><button disabled={busy||inserting||Boolean(setupError)} onClick={tryInput} aria-keyshortcuts={mac?'Meta+Enter':'Control+Enter'}>{custom?.running?'Running…':'Run with this input'}</button><small>Saves and runs <code>Student.java</code>. Checks and completion are unaffected.</small></div>{custom&&!custom.running&&<div aria-live="polite">{custom.error?<><pre><code>{custom.error}</code></pre></>:<pre className="actual-output"><code>{custom.output||'(no output)'}</code></pre>}</div>}</div></details>}</div>}
      <div ref={notice} id="celebration" hidden><b aria-hidden="true"><Icon name="check" /></b><strong /><span /></div>
    </section>
    <section className={`feedback ${phase}`} aria-live="polite"><strong><CodeText>{feedback}</CodeText></strong><SubmissionQuality result={result} />{result?.sourceChecks?.length>0&&<ul className="source-checks">{result.sourceChecks.map((check,i)=><li key={i}><Status passed={check.passed} /> <CodeText>{check.message}</CodeText></li>)}</ul>}{result?.error && <pre id="console"><code>{result.error}</code></pre>}{result?.output && <pre><code>{result.output}</code></pre>}</section>
    {codePassed&&!busy&&partIndex<parts.length-1&&<button className="primary next-part" onClick={()=>request('lesson.focus',{lessonId:parts[partIndex+1]})}>Next repair: {partIndex+2} / {parts.length} <Icon name="arrow-right" /></button>}
    {groupPassed&&!busy&&phase==='success'&&result?.passed&&<section className="practice-completion"><h2>{type} complete</h2><button className="primary" onClick={()=>request('course.open',type==='Practice'?{moduleId:module.id}:{collection:'projects'})}>Back to {type==='Practice'?'lesson outline':`${type.toLowerCase()}s`} <Icon name="arrow-right" /></button><details className="solution-reflection"><summary>Optional review notes</summary><p><CodeText>{parent.reflection}</CodeText></p><label htmlFor="reflection">Notes (optional)</label><textarea id="reflection" value={reflection} maxLength={20000} onChange={e=>update(p=>({...p,reflections:{...p.reflections,[parent.id]:e.target.value}}))} placeholder="Add a note to revisit later…" /><small>Saved automatically. Notes do not affect completion.</small></details></section>}
    <footer className="lesson-tools"><span><code>{file}</code></span>{confirmRestore?<span role="alert" onKeyDown={e=>{if(e.key==='Escape')setConfirmRestore(false);}}>Replace this code with the starter? <button autoFocus className="text-button" onClick={()=>{setConfirmRestore(false);action('lesson.restore',{confirmed:true});}}>Restore starter</button> <button className="text-button" onClick={()=>setConfirmRestore(false)}>Cancel</button></span>:<button disabled={busy || inserting} className="text-button" onClick={()=>action('lesson.restore')}>Restore starter</button>}</footer>
    <canvas ref={canvas} id="celebration-canvas" aria-hidden="true" />
  </div>;
  return <div className="desktop-shell"><TopBar back={lessonBack(parent)} trail={lessonTrail(lesson)}><FlowSteps lesson={parent} current="code" /></TopBar><div className="desktop-split">{editorPane}{panel}</div></div>;
}
