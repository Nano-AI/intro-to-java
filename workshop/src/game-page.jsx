import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, Suspense, lazy } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Select, Dialog, Tabs } from '@radix-ui/themes';
import { findGame, gameIds } from './games/index.js';
import { GAME_REQUESTS, RUN_MODES, ENGINE_STAGES, maxStarsFor } from '../shared/game-contract.js';
import { totalStars, arenaUnlocked } from '../shared/completion.js';
import { passedCorrectness } from '../shared/code-quality.js';
import { useProgress } from './context.js';
import { request, subscribe } from './platform.js';
import { createEffects } from '../web/effects.js';
import CodeText from './code-text.jsx';
import JavaCode from './java-code.jsx';
import Icon, { Status } from './icon.jsx';
import SubmissionQuality, { submissionTitle } from './submission-quality.jsx';
import { TopBar } from './pages.jsx';
import { lessons } from './curriculum.js';
import { missingProjectPrerequisites } from '../shared/project-access.js';
import { gameCommands } from '../shared/game-commands.js';
import ProjectLock from './project-lock.jsx';
import { useDemo } from './demo.jsx';
import ProjectGuide, { CommandsButton, ProjectRefresher } from './project-guide.jsx';
import { projectSteps, projectGoal } from './project-steps.js';
import { worldRng, publicGameWorld } from './games/engine.js';
import GameBoard, { BoardReadout } from './game-board.jsx';
import { replayBoard } from './game-board.js';
import { replayEventSeconds, replayFrame, replayFrames, replaySpeech } from '../web/tile-replay.js';
import './game.css';

const JavaEditor = lazy(() => import('./editor.jsx')); // desktop only
const mac = /Mac|iPhone|iPad/.test(navigator.platform);
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const GAME_ICONS = { 'hello-arena': 'bot', 'hoop-streak': 'target', 'supply-relay': 'package', 'staircase-arena': 'stairs', 'tower-rescue': 'tower', 'signal-patrol': 'traffic-light', 'mosaic-survey': 'grid' };

export default function GameRoute() {
  const { demo } = useDemo();
  const { gameId } = useParams(), game = findGame(gameId);
  const { progress } = useProgress();
  if (!game) return <main className="page-shell"><h1>Project not found</h1><Link to="/projects">Projects</Link></main>;
  if (!demo && missingProjectPrerequisites(game, progress, id => lessons.find(lesson => lesson.id === id)).length) return <ProjectLock project={game} />;
  return <GameEntry key={game.id} game={game} />;
}

function GameToolbar({ game, children }) {
  return <TopBar back={{ to: '/projects', label: 'Projects' }} trail={[]}><h1 className="game-toolbar-title"><Icon name={GAME_ICONS[game.id] || 'bot'} /><span>{game.title}</span></h1><div className="game-toolbar-actions">{children}</div></TopBar>;
}

function GameEntry({ game }) {
  const { progress } = useProgress(), { demo } = useDemo();
  const [opened, setOpened] = useState(() => (game.refresher || []).every((q, i) => progress.answers?.[`${game.id}:${i}`] === q.answer));
  if (!opened) return <div className="game-entry"><GameToolbar game={game} /><ProjectRefresher game={game} demo={demo} onComplete={() => setOpened(true)} /></div>;
  return <GamePanel game={game} />;
}

function board(run) {
  return { spec: { grid: run.world, events: run.events }, frames: replayFrames(run) };
}

function Replay({ run, environment, effects, onCrash, preview = false }) {
  const host = useRef(), model = useRef(), transcript = useRef(), play = useRef({ k: 0, t: 0, playing: false });
  const [ready, setReady] = useState(false), [error, setError] = useState(''), [show3D, setShow3D] = useState(true);
  const [k, setK] = useState(0), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1);
  const { spec, frames } = useMemo(() => board(run), [run]);
  const renderedStep = useRef(-1);
  const boardState = useMemo(() => replayBoard(run.world, run.events, k), [run, k]);
  const live = useRef(); live.current = { frames, speed, effects, onCrash, world: run.world, events: run.events };
  const show = (i, t = 0) => {
    const current = live.current;
    if (!model.current || !current.frames[i]) return;
    if (renderedStep.current !== i) {
      model.current.setBoardState(replayBoard(live.current.world, live.current.events, i));
      renderedStep.current = i;
    }
    const frame = replayFrame(current.world, current.frames, current.events, i, t);
    model.current.draw(frame);
  };
  const arrive = i => {
    const p = play.current, currentFrames = live.current.frames;
    if (p.frames !== currentFrames) return;
    i = Math.max(0, Math.min(i, currentFrames.length - 1));
    const f = currentFrames[i];
    if (!f) return;
    p.k = i; p.t = 0; setK(i); show(i);
    if (f.collision && !p.crashed) { p.crashed = true; live.current.onCrash?.(); if (live.current.effects && !reducedMotion()) model.current?.explode(f); }
    if (i >= live.current.frames.length - 1) { p.playing = false; setPlaying(false); }
  };
  const restart = () => { const frames = live.current.frames, playing = frames.length > 1; model.current?.clearExplosion(); renderedStep.current = -1; play.current = { frames, k: 0, t: 0, playing, crashed: false }; setK(0); setPlaying(playing); show(0); };
  useEffect(() => {
    let raf, prev = performance.now();
    const loop = now => {
      const p = play.current; model.current?.updateEffects(now);
      if (p.playing && p.frames === live.current.frames) {
        p.t += Math.min((now - prev) / 1000, .1) * live.current.speed / replayEventSeconds(live.current.events[p.k]);
        if (p.t >= 1) arrive(p.k + 1); else if (!reducedMotion()) show(p.k, p.t);
      }
      prev = now; raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => {
    if (!show3D) return;
    let gone = false;
    import('../web/world.js').then(({ createWorld }) => {
      if (gone) return;
      try { model.current = createWorld(host.current, { grid: true }); renderedStep.current = -1; setReady(true); } catch { setError("3D is unavailable. Showing the map."); setShow3D(false); }
    }).catch(() => { if (!gone) { setError('3D is unavailable. Showing the map.'); setShow3D(false); } });
    return () => { gone = true; model.current?.destroy(); model.current = null; setReady(false); };
  }, [show3D]);
  useLayoutEffect(() => { restart(); }, [frames]);
  useEffect(() => { model.current?.setEnvironment(environment); }, [ready, environment]);
  useEffect(() => { if (!effects) model.current?.clearExplosion(); }, [effects]);
  useLayoutEffect(() => { if (!ready) return; model.current.setLevel(spec); renderedStep.current = -1; show(play.current.k); }, [ready, spec]);
  const step = () => { const p = play.current; p.playing = false; setPlaying(false); if (p.k < frames.length - 1) arrive(p.k + 1); };
  const pause = () => { const p = play.current; if (p.k >= frames.length - 1) return restart(); p.playing = !p.playing; setPlaying(p.playing); };
  const speaker = id => id === 'robot' ? 'Pip' : run.world.characters?.find(c => c.id === id)?.kind || id;
  const talk = replaySpeech(run.events, k);
  useEffect(() => { if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight; }, [run, talk.length]);
  return <div className={`game-replay${preview ? ' is-preview' : ''}`} data-large={run.world.width > 12 || run.world.height > 10}>
    {show3D && <div className="world-panel">
      <div ref={host} id="scene" role="region" aria-label="3D replay of the robot run" />
      {!ready && <p className="world-loading" role="status">Opening world…</p>}
      <div className="camera-controls"><button aria-label="Rotate camera left" onClick={() => model.current?.rotateCamera(-Math.PI / 8)}><Icon name="arrow-left" /></button><button aria-label="Rotate camera right" onClick={() => model.current?.rotateCamera(Math.PI / 8)}><Icon name="arrow-right" /></button><button onClick={() => model.current?.topCamera()}><Icon name="arrow-down" />Top</button><button onClick={() => model.current?.resetCamera()}><Icon name="rotate-ccw" />Reset view</button></div>
    </div>}
    {show3D && <div className="world-readout"><BoardReadout world={run.world} state={boardState} /></div>}
    {!show3D && <GameBoard world={run.world} events={run.events} step={k} />}
    {error && !show3D && <p className="world-fallback" role="status">{error}</p>}
    <div className="playback-tools">{!preview && <div>
      <button onClick={restart} aria-label="Restart replay"><Icon name="rotate-ccw" /></button>
      <button onClick={pause}>{playing ? <><Icon name="pause" /> Pause</> : <><Icon name="play" /> Resume</>}</button>
      <button onClick={step} disabled={k >= frames.length - 1}><Icon name="step-forward" /> Step</button>
    </div>}<button className="view-toggle" onClick={() => setShow3D(value => !value)}><Icon name={show3D ? 'grid' : 'package'} />{show3D ? 'Map' : '3D view'}</button>
      {!preview && <label>Speed<select value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option></select></label>}
    </div>
    <section className="replay-transcript" aria-label="Speech transcript">
      {talk.length ? <ol ref={transcript} role="log" aria-live="polite" aria-relevant="additions text">{talk.map(e => <li key={e.seq}><b className="transcript-speaker">{speaker(e.speaker)}</b><span className="transcript-message">{e.text}</span></li>)}</ol> : <p>No speech yet.</p>}
    </section>
  </div>;
}

const worldName = (w, i, list) => `Level ${w.level} · world ${list.slice(0, i + 1).filter(x => x.level === w.level).length}`;

function stageMessage(r) {
  if (r.error === 'Run cancelled.') return 'Run stopped. Saved stars are unchanged.';
  if (r.stage === 'compile') return 'Compilation failed.';
  if (r.stage === 'checks') return 'Code requirements did not pass.';
  if (ENGINE_STAGES.includes(r.stage)) return 'Pip could not run the game. This is a setup problem, not a mistake in `Student.java`.';
  return 'The program stopped with an error.';
}

function GameCaseValues({ entry, showOutput = false }) {
  const world = entry?.world || {}, values = entry?.inputs || { ...world.constants, ...world.variables };
  const input = entry?.input ?? world.input ?? '';
  return <dl className={`challenge-case-values game-case-values ${showOutput ? 'with-output' : ''}`}>
    <div className="case-input replay-input"><dt>Input</dt><dd>{Object.keys(values).length > 0 && <JavaCode>{Object.entries(values).map(([name, value]) => `${name} = ${JSON.stringify(value)}`).join('\n')}</JavaCode>}{input && <pre>{input}</pre>}{!input && !Object.keys(values).length && <pre>(no input)</pre>}</dd></div>
    {showOutput && <><div className="case-output"><dt>Output</dt><dd><pre>{entry.output || '(no output)'}</pre></dd></div><div className="case-outcome"><dt>Result</dt><dd><p>{entry.message || (entry.passed ? 'Passed' : 'Not passed')}</p></dd></div></>}
  </dl>;
}

function GamePanel({ game }) {
  const { progress } = useProgress(), { demo } = useDemo();
  const [inserting, setInserting] = useState(false), [checklistOpen, setChecklistOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(() => Math.max(0, game.milestones?.findIndex((_, i) => progress.answers?.[`${game.id}:${i + 10}`] !== 1) ?? 0));
  const steps = projectSteps(game), step = steps[stepIndex];
  const [busy, setBusy] = useState(false), [phase, setPhase] = useState('idle'), [feedback, setFeedback] = useState('');
  const [file, setFile] = useState('Opening Student.java…'), [source, setSource] = useState(null), [setupError, setSetupError] = useState('');
  const [consoleExpanded, setConsoleExpanded] = useState(false);
  const [leftTab, setLeftTab] = useState('world'), [consoleTab, setConsoleTab] = useState('testcase'), [publicCaseIndex, setPublicCaseIndex] = useState(0);
  const [publicRun, setPublicRun] = useState(null);
  const [example, setExample] = useState(null), [exampleBusy, setExampleBusy] = useState(false), [exampleError, setExampleError] = useState(''), [examplePlay, setExamplePlay] = useState(0);
  const [result, setResult] = useState(null), [worlds, setWorlds] = useState([]), [shown, setShown] = useState(null);
  const [custom, setCustom] = useState(null), [customInput, setCustomInput] = useState(''), [confirmRestore, setConfirmRestore] = useState(false);
  const sourceRef = useRef(), run = useRef({ id: '', mode: '' }), handled = useRef(''), alive = useRef(true), calls = useRef();
  const checklistOpener = useRef(), checklistFocus = useRef(false);
  const exampleStage = useRef();
  const fx = useRef(), canvas = useRef(), notice = useRef(), shell = useRef(), restoreButton = useRef();
  const max = maxStarsFor(game.id);
  const preview = useMemo(() => game.sampleWorld || game.world(worldRng(1, 1), 1), [game]);
  const previewRun = useMemo(() => ({ world: preview, events: [] }), [preview]);
  const publicPreviews = useMemo(() => [0, 1, 2].map(i => ({ world: publicGameWorld(game, i), events: [], label: `Case ${i + 1}` })), [game]);
  const total = totalStars(progress.games, gameIds), env = progress.view.environment;
  const environment = arenaUnlocked(env, total) ? env : 'workshop';

  function clearResults() {
    setResult(null); setPublicRun(null); setCustom(null); setWorlds([]); setShown(null);
    setPhase('idle'); setFeedback('The code changed. Run again to test the new version.');
  }
  function finished(packet, history = false) {
    if (!alive.current || !packet?.result || packet.gameId !== game.id || handled.current === packet.runId) return;
    handled.current = packet.runId; setBusy(false);
    if (packet.stale) { clearResults(); return; }
    const r = packet.result;
    if ((packet.mode || r.mode) === RUN_MODES.custom) {
      setCustom(r); if (r.worlds?.[0]) setShown(r.worlds[0]);
      setPhase(r.stage ? 'error' : 'idle');
      setFeedback(r.stage ? stageMessage(r) : 'Trial run finished. No stars awarded.');
      return;
    }
    const failed = r.worlds?.find(w => !w.passed);
    if ((packet.mode || r.mode) === 'public') {
      setPublicRun(r); setWorlds(r.worlds || []); setCustom(null); setShown(failed || r.worlds?.[0] || null);
      setPublicCaseIndex(Math.max(0, r.worlds?.findIndex(w => !w.passed) ?? 0)); setConsoleTab('result'); setLeftTab('world');
      setPhase(r.stage || failed ? 'error' : 'success'); setFeedback(r.stage ? stageMessage(r) : `${r.worlds?.filter(w => w.passed).length || 0} / ${r.worlds?.length || 0} examples passed`);
      return;
    }
    setLeftTab('submission');
    setResult(r); setWorlds(r.worlds || []); setCustom(null); setShown(failed || r.worlds?.[0] || null);
    if (r.stage) { setPhase('error'); setFeedback(stageMessage(r)); return; }
    const over = r.worlds?.find(w => w.level === 2 && w.end && w.world.par !== undefined && w.end.actions > w.world.par);
    setPhase(passedCorrectness(r) ? 'success' : 'error');
    setFeedback(r.earnedStars === max ? (game.project ? 'Project complete.' : 'Every world solved within par.') : failed ? 'A world did not pass.'
      : over ? `All worlds solved. One level 2 world used ${over.end.actions} actions and par is ${over.world.par}. ` : passedCorrectness(r) ? 'All worlds solved.' : 'Code requirements did not pass.');
  }
  useEffect(() => {
    alive.current = true;
    fx.current = createEffects(canvas.current, notice.current, shell.current); fx.current.enabled = progress.view.effects;
    const mine = handler => packet => { if (packet?.gameId === game.id) handler(packet); };
    const stop = [
      subscribe('run.started', mine(({ runId, mode }) => {
        run.current = { id: runId, mode }; setBusy(true); fx.current.clear();
        if (mode === 'public') { setPublicRun(null); setConsoleTab('result'); setLeftTab('world'); } else if (mode === RUN_MODES.graded) setLeftTab('submission');
        if (mode === RUN_MODES.custom) { setResult(null); setWorlds([]); setShown(null); setPhase('running'); setFeedback('Running the sample…'); return setCustom({ running: true }); }
        setResult(null); setWorlds([]); setShown(null); setPhase('running'); setFeedback('Compiling and running each world…');
      })),
      subscribe('run.progress', mine(({ runId, world }) => { if (runId === run.current.id && run.current.mode !== RUN_MODES.custom) setWorlds(list => [...list, world]); })),
      subscribe('run.finished', packet => calls.current.finished(packet)),
      subscribe('document.changed', mine(() => calls.current.clearResults())),
      subscribe('editor.replace', mine(({ source }) => sourceRef.current?.replace?.(source))),
      subscribe('editor.reveal', mine(({ text }) => sourceRef.current?.reveal?.(text))),
    ];
    request(GAME_REQUESTS.open, { gameId: game.id }).then(data => {
      if (!alive.current) return; setFile(data.file); setSource(data.source); if (data.result) calls.current.finished(data.result, true);
    }).catch(e => { if (alive.current) setSetupError(e.message); });
    const shortcut = e => { if (e.defaultPrevented || e.key !== 'Enter' || !(mac ? e.metaKey : e.ctrlKey)) return; e.preventDefault(); e.target.id === 'custom-input' ? calls.current.start(RUN_MODES.custom) : calls.current.start(); };
    window.addEventListener('keydown', shortcut);
    return () => { alive.current = false; stop.forEach(f => f()); fx.current.destroy(); window.removeEventListener('keydown', shortcut); };
  }, []);
  useEffect(() => { fx.current.enabled = progress.view.effects; }, [progress.view.effects]);
  useEffect(() => { if (example) exampleStage.current?.scrollIntoView({ block: 'nearest' }); }, [example, examplePlay]);

  const code = text => { const s = text ?? sourceRef.current; return { source: typeof s === 'function' ? s() : typeof s?.get === 'function' ? s.get() : s ?? source }; };
  const start = (mode = 'public', text, input = customInput) => {
    if (busy || inserting || exampleBusy || setupError) return;
    setBusy(true); run.current.mode = mode;
    if (mode === RUN_MODES.graded) setLeftTab('submission'); else { setLeftTab('world'); setConsoleTab('result'); }
    request(GAME_REQUESTS.run, { gameId: game.id, mode, ...(mode === RUN_MODES.custom ? { input } : {}), ...code(text) })
      .then(packet => calls.current.finished(packet))
      .catch(e => { if (!alive.current) return; setBusy(false); if (mode === RUN_MODES.custom) setCustom({ stage: 'runtime', error: e.message }); setPhase('error'); setFeedback(e.message); });
  };
  calls.current = { finished, start, clearResults };
  const restore = async confirmed => {
    try {
      const r = await request(GAME_REQUESTS.restore, { gameId: game.id, confirmed });
      if (r?.needsConfirm) return setConfirmRestore(true);
      if (r?.restored && typeof r.source === 'string') sourceRef.current?.replace(r.source, { resetLockedInputs: true });
      setConfirmRestore(false); if (r?.restored) setFeedback('Starter code restored. Run it to see where the game begins.');
      restoreButton.current?.focus();
    } catch (e) { setFeedback(e.message); }
  };
  const cancelRestore = () => { setConfirmRestore(false); setTimeout(() => restoreButton.current?.focus()); };

  const insertSolution = async () => {
    if (!demo || busy || inserting || source === null) return;
    setInserting(true);
    try {
      const result = await request('game.solution', { gameId: game.id });
      sourceRef.current?.replace(result.source, { resetLockedInputs: true });
      setFeedback('Solution inserted in demo code.');
    } catch (error) { setFeedback(error.message); setPhase('error'); }
    finally { setInserting(false); }
  };
  const playExample = async () => {
    if (exampleBusy || busy || inserting) return;
    if (example) { setExamplePlay(value => value + 1); return; }
    setExampleBusy(true); setExampleError('');
    try {
      const packet = await request('game.example', { gameId: game.id });
      if (!alive.current) return;
      if (packet.gameId !== game.id || !packet.result?.worlds?.[0]) throw new Error(packet.result?.error || 'The example could not run.');
      setExample(packet.result.worlds[0]);
    } catch (error) { if (alive.current) setExampleError(error.message); }
    finally { if (alive.current) setExampleBusy(false); }
  };
  const shownCustom = custom && !custom.running && shown === custom.worlds?.[0];
  const displayedResult = custom?.stage ? custom : run.current.mode === 'public' ? publicRun : result;
  const done = !busy && passedCorrectness(result);
  const worldError = phase === 'error' && !displayedResult && feedback;
  const runDisabled = busy || inserting || exampleBusy || Boolean(setupError) || source === null;
  const details = <Dialog.Root><Dialog.Trigger><Button variant="ghost">Details</Button></Dialog.Trigger><Dialog.Content maxWidth="620px" className="game-details">
    <div className="commands-heading"><Dialog.Title>Run details</Dialog.Title><Dialog.Close><Button variant="ghost" aria-label="Close run details"><Icon name="x" /></Button></Dialog.Close></div><Dialog.Description>{game.title}</Dialog.Description>
    {feedback && <p><CodeText>{feedback}</CodeText></p>}
    {displayedResult?.error && <pre id="console"><code>{displayedResult.error}</code></pre>}
    {result?.sourceChecks?.length > 0 && <ul className="source-checks">{result.sourceChecks.map((c, i) => <li key={i}><Status passed={c.passed} /> <CodeText>{c.message}</CodeText></li>)}</ul>}
    {(shown?.world.input != null || preview.input != null) && <section className="sample-input replay-input" aria-label="Selected world input"><h3>Input for this run</h3><pre>{shown ? shownCustom ? custom.input : shown.world.input : preview.input}</pre></section>}
    {game.inputHelp && <details className="output-block custom-block"><summary>Try different input</summary><div className="custom-body"><label htmlFor="custom-input"><CodeText>{game.id === 'hoop-streak' ? 'baskets: one whole number, 4–31.' : game.id === 'signal-patrol' ? 'Tile codes (0, 1, 2), ending in -1.' : 'rows, columns, then one 0 or 1 per cell.'}</CodeText></label><textarea id="custom-input" value={customInput} maxLength={10000} onChange={e => setCustomInput(e.target.value)} /><Button variant="outline" disabled={runDisabled} onClick={() => start(RUN_MODES.custom)}>Trial run with input</Button><p>The board stays fixed. Trial runs do not award stars.</p></div></details>}
    {game.hint && <details><summary>Hint</summary><p><CodeText>{game.hint}</CodeText></p></details>}
    <p className="source-path"><code>{file}</code></p>
    {confirmRestore ? <div role="alert">Replace this code with the starter? <button autoFocus onClick={() => restore(true)}>Restore starter</button> <button onClick={cancelRestore}>Cancel</button></div> : <Button ref={restoreButton} disabled={busy} variant="outline" onClick={() => restore(false)}>Restore starter</Button>}
  </Dialog.Content></Dialog.Root>;
  const publicEntries = publicPreviews.map((entry, i) => publicRun?.worlds?.[i] || entry);
  const selectedPublic = publicEntries[publicCaseIndex] || publicEntries[0];
  const publicButtons = <div className="challenge-case-tabs" role="group" aria-label="Public game cases">{publicPreviews.map((_, i) => <Button key={i} size="1" variant="ghost" aria-pressed={publicCaseIndex === i} onClick={() => { setPublicCaseIndex(i); setShown(publicEntries[i]); setLeftTab('world'); }}>{publicRun?.worlds?.[i] && <Icon name={publicRun.worlds[i].passed ? 'check' : 'x'} label={publicRun.worlds[i].passed ? 'Passed' : 'Failed'} />}Case {i + 1}</Button>)}</div>;
  const runWorlds = publicRun?.worlds || [];
  const runPassed = runWorlds.length === publicPreviews.length && runWorlds.every(world => world.passed) && !publicRun?.error;
  const runVerdict = <div className="run-verdict"><h2 className={runPassed ? 'passed' : 'failed'}>{publicRun?.stage === 'compile' ? 'Compile error' : publicRun?.error ? 'Runtime error' : runPassed ? 'Passed' : 'Not passed'}</h2>{runWorlds.length > 0 && <span>{runWorlds.filter(world => world.passed).length} / {publicPreviews.length} passed</span>}</div>;
  const failedWorld = result?.worlds?.find(w => !w.passed);
  const submittedWorlds = result?.worlds || [];
  const submission = <section className="game-submission challenge-result challenge-submission" aria-label="Project submission" aria-live="polite">
    {busy && run.current.mode === RUN_MODES.graded ? <p role="status">Submitting… {worlds.length} tested</p> : result ? <>
      <h2 className={done ? 'passed' : 'failed'}>{submissionTitle(result, done)}</h2>
      {submittedWorlds.length > 0 && <p className="submission-count">{submittedWorlds.filter(w => w.passed).length} / {submittedWorlds.length} test cases passed</p>}
      <SubmissionQuality result={result} passed={done} />
      {result.error && <pre id="console" role="alert">{result.error}</pre>}
      {failedWorld && <><GameCaseValues entry={failedWorld} showOutput /><Button variant="outline" onClick={() => { setShown(failedWorld); setLeftTab('world'); }}>View world</Button></>}
      {submittedWorlds.length > 0 && <details className="submission-tests"><summary>Test cases</summary>{submittedWorlds.map((entry, i) => <details key={i}><summary><Icon name={entry.passed ? 'check' : 'x'} label={entry.passed ? 'Passed' : 'Failed'} />{entry.label || `Case ${i + 1}`}</summary><GameCaseValues entry={entry} showOutput /><Button variant="outline" onClick={() => { setShown(entry); setLeftTab('world'); }}>View world</Button></details>)}</details>}
      {done && <Link className="practice-completion" to={`/module/${game.unit}`}>Back to module</Link>}
    </> : <p>{feedback || 'No submission yet.'}</p>}
  </section>;
  const panel = <div ref={shell} className="lesson-panel game-panel">
    {setupError && <section className="setup-error" role="alert"><p>{setupError}</p><button onClick={() => request('workspace.open').catch(e => setSetupError(e.message))}>Open learning folder</button><button onClick={() => window.location.reload()}>Retry setup</button></section>}
    <Tabs.Root value={leftTab} onValueChange={setLeftTab} className="game-task-tabs">
      <Tabs.List aria-label="Project" className="workbench-tabs"><Tabs.Trigger value="description" data-pane="description"><Icon name="book-open" />Description</Tabs.Trigger><Tabs.Trigger value="world" data-pane="world"><Icon name="grid" />World</Tabs.Trigger><Tabs.Trigger value="submission" data-pane="submission"><Icon name="send" />Submission</Tabs.Trigger></Tabs.List>
      <Tabs.Content value="description" className="game-description"><h2>{game.title}</h2><p><CodeText>{projectGoal(game)}</CodeText></p>
        <section className="game-example" aria-labelledby="game-example-title"><div className="game-example-heading"><h3 id="game-example-title">Example</h3><Button variant="soft" disabled={busy || inserting || exampleBusy || Boolean(setupError)} onClick={playExample}><Icon name="play" />{exampleBusy ? 'Loading…' : 'Play demo'}</Button></div>
          {exampleError && <p role="alert" className="game-example-error">{exampleError}</p>}
          {example && <div ref={exampleStage} className="game-example-stage"><Replay key={examplePlay} run={example} environment={environment} effects={false} /></div>}
          <GameCaseValues entry={example || publicPreviews[0]} />
          {example && <dl className="challenge-case-values game-example-output"><div><dt>Expected output</dt><dd><pre>{example.output || '(no output)'}</pre></dd></div></dl>}
        </section>
        <section><h3><CodeText>{step.title}</CodeText></h3><p><CodeText>{step.text?.replaceAll('Check project', 'Submit')}</CodeText></p>{step.code && <JavaCode>{step.code}</JavaCode>}{step.check && <p className="step-check"><CodeText>{step.check}</CodeText></p>}<Button variant="outline" onClick={e => { checklistOpener.current = e.currentTarget; checklistFocus.current = true; setChecklistOpen(true); }}>Checklist</Button></section></Tabs.Content>
      <Tabs.Content value="world" className="game-world-tab"><section className={`result-pane ${phase}`} aria-label="Game worlds">
        <div className="world-heading">{worlds.length > 0 ? <Select.Root value={worlds.includes(shown) ? String(worlds.indexOf(shown)) : ''} onValueChange={value => setShown(worlds[Number(value)])}><Select.Trigger aria-label="Choose a world to replay" placeholder="Choose world" /><Select.Content>{worlds.map((w, i) => <Select.Item key={i} value={String(i)}>{w.label || worldName(w, i, worlds)}</Select.Item>)}</Select.Content></Select.Root> : <span>{selectedPublic?.label || 'World'}</span>}{details}</div>
        <div className="world-stage"><Replay run={shown || previewRun} preview={!shown || !shown.end} environment={environment} effects={progress.view.effects} onCrash={() => fx.current.crash()} /></div>
        {worldError && <div className="world-status"><p role="alert"><CodeText>{worldError}</CodeText></p></div>}
      </section></Tabs.Content>
      <Tabs.Content value="submission">{submission}</Tabs.Content>
    </Tabs.Root>
    <div ref={notice} id="celebration" hidden><b aria-hidden="true"><Icon name="check" /></b><strong /><span /></div><canvas ref={canvas} id="celebration-canvas" aria-hidden="true" />
  </div>;
  const console = <div className="game-console"><Tabs.Root value={consoleTab} onValueChange={setConsoleTab}>
    <div className="console-tabs-bar"><Tabs.List aria-label="Game console" className="workbench-tabs"><Tabs.Trigger value="testcase" data-pane="testcase"><Icon name="file-code" />Testcase</Tabs.Trigger><Tabs.Trigger value="result" data-pane="result"><Icon name="target" />Test Result</Tabs.Trigger></Tabs.List><Button size="1" variant="ghost" className="console-size" aria-label={consoleExpanded ? 'Restore editor' : 'Expand test results'} aria-expanded={consoleExpanded} onClick={() => setConsoleExpanded(value => !value)}><Icon name={consoleExpanded ? 'minimize' : 'maximize'} />{consoleExpanded ? 'Restore' : 'Expand'}</Button></div>
    <Tabs.Content value="testcase">{publicButtons}<div className="challenge-case-content"><GameCaseValues entry={selectedPublic} /></div></Tabs.Content>
    <Tabs.Content value="result"><section className="challenge-result challenge-run-result" aria-label="Game run results" aria-live="polite">{busy && run.current.mode === 'public' ? <p role="status">Running…</p> : publicRun?.error ? <>{runVerdict}{publicButtons}<pre role="alert">{publicRun.error}</pre><GameCaseValues entry={selectedPublic} showOutput={Boolean(publicRun.worlds?.[publicCaseIndex])} /></> : publicRun?.worlds?.length ? <>{runVerdict}{publicButtons}<GameCaseValues entry={selectedPublic} showOutput={Boolean(publicRun.worlds?.[publicCaseIndex])} /></> : <p className="challenge-empty">{feedback || 'No test results yet.'}</p>}</section></Tabs.Content>
  </Tabs.Root></div>;
  return <div className="desktop-shell game-workbench"><GameToolbar game={game}>
    <ProjectGuide game={game} index={stepIndex} setIndex={setStepIndex} open={checklistOpen} setOpen={setChecklistOpen} opener={checklistOpener} focusOnOpen={checklistFocus} /><CommandsButton game={game} />
    {demo && typeof game.solution === 'string' && <Button variant="outline" disabled={runDisabled} onClick={insertSolution}><Icon name="file-code" />{inserting ? 'Inserting…' : 'Insert solution'}</Button>}
    <div className="game-run-actions">{busy ? <Button variant="outline" onClick={() => request(GAME_REQUESTS.stop).catch(() => {})}>Stop</Button> : <><Button variant="outline" disabled={runDisabled} onClick={() => start('public')}><Icon name="play" />Run</Button><Button id="run" disabled={runDisabled} onClick={() => start(RUN_MODES.graded)}><Icon name="send" />Submit</Button></>}</div>
  </GameToolbar><div className="desktop-split">{panel}<div className={`game-code-column ${consoleExpanded ? 'console-expanded' : ''}`}><section className="editor-pane" aria-label="Java file">{source === null ? <p className="editor-loading">{setupError || 'Opening Student.java…'}</p>
    : <Suspense fallback={<p className="editor-loading">Opening the editor…</p>}><JavaEditor docKey={game.id} initialSource={source} sourceRef={sourceRef} lockedInputs={game.lockedInputs} hideRun
      completionItems={gameCommands(game)} running={busy || inserting} onChange={clearResults}
      onSave={text => request('lesson.save', { gameId: game.id, source: text })}
      onDiagnose={text => request('lesson.diagnose', { gameId: game.id, source: text })}
      onComplete={(text, offset) => request('lesson.complete', { gameId: game.id, source: text, offset })}
      onRun={text => calls.current.start('public', text)} /></Suspense>}</section>{console}</div></div></div>;
}
