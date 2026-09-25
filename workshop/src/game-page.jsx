import React, { useEffect, useMemo, useRef, useState, Suspense, lazy } from 'react';
import { Link, useParams } from 'react-router-dom';
import { findGame, games, gameIds } from './games/index.js';
import { GAME_REQUESTS, RUN_MODES, ENGINE_STAGES, LIMITS, gameRoute, maxStarsFor } from '../shared/game-contract.js';
import { gameStars, totalStars, arenaUnlocked } from '../shared/completion.js';
import { useProgress } from './context.js';
import { request, subscribe, inDesktop } from './platform.js';
import { createEffects } from '../web/effects.js';
import { explainError } from './feedback.js';
import CodeText from './code-text.jsx';
import Icon, { Status } from './icon.jsx';
import { Stars, subtopicTitle } from './games-page.jsx';
import { TopBar } from './pages.jsx';
import './game.css';

const JavaEditor = lazy(() => import('./editor.jsx')); // desktop only
const mac = /Mac|iPhone|iPad/.test(navigator.platform);
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const HEADING = { N: 0, E: 90, S: 180, W: 270 };
const STEP_SECONDS = .45;           // replay time per simulator event at 1x
const BUBBLE_STEPS = Math.round(LIMITS.speechMs / 1000 / STEP_SECONDS); // ~2 s of replay time

export default function GameRoute() {
  const { gameId } = useParams(), game = findGame(gameId);
  if (!game) return <main className="page-shell"><h1>Game not found</h1><Link to="/games">All games</Link></main>;
  return <GamePanel key={game.id} game={game} />;
}

// ponytail: the board reuses world.js setLevel (obstacles + labelled goals) on the existing floor, so hurdles look like
// walls, paint is text-only, and labels carry world.js's cm line. A tile-board primitive in web/world.js removes all three.
function board(run) {
  const w = run.world, T = Math.min(50, 420 / w.width, 360 / w.height);
  const cm = ({ x, y }) => ({ x: (x - (w.width - 1) / 2) * T, y: -(y - (w.height - 1) / 2) * T });
  const spec = {
    obstacles: [...(w.walls || []), ...(w.hurdles || [])].map(([x, y]) => ({ ...cm({ x, y }), width: T, depth: T })),
    goals: [
      ...(w.hoops || []).map(h => ({ ...cm(h), kind: 'hoop', label: 'Hoop' })),
      ...(w.items || []).map(i => ({ ...cm(i), kind: i.kind === 'ball' ? 'ball' : 'pickup', label: i.kind })),
      ...(w.characters || []).map(c => ({ ...cm(c), kind: 'character', label: c.kind })),
      ...(w.signs || []).map(s => ({ ...cm(s), kind: 'sign', label: s.text.slice(0, 18) })),
    ],
  };
  let pose = { ...cm(w.robot), heading: HEADING[w.robot.dir], distance: 0, collision: false, ballLoaded: false };
  const frames = [pose];
  for (const e of run.events) {
    pose = { ...pose };
    if ((e.kind === 'move' || e.kind === 'jump') && e.to) Object.assign(pose, cm(e.to));
    if (e.kind === 'turn') pose.heading += ((HEADING[e.to] - HEADING[e.from] + 540) % 360) - 180;
    if (e.kind === 'bump') pose.collision = true;
    if (e.held) pose.ballLoaded = (e.held.ball || 0) > 0;
    frames.push(pose);
  }
  return { spec, frames };
}

function Replay({ run, environment, effects, onCrash }) {
  const host = useRef(), model = useRef(), play = useRef({ k: 0, t: 0, playing: false });
  const [ready, setReady] = useState(false), [error, setError] = useState('');
  const [k, setK] = useState(0), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1);
  const { spec, frames } = useMemo(() => board(run), [run]);
  const live = useRef(); live.current = { frames, speed, effects, onCrash };
  const show = (i, t = 0) => {
    const f = live.current.frames, a = f[i], b = f[Math.min(i + 1, f.length - 1)];
    model.current?.draw(t ? { ...a, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, heading: a.heading + (b.heading - a.heading) * t } : a, 0, 0);
  };
  const arrive = i => {
    const p = play.current, f = live.current.frames[i]; p.k = i; p.t = 0; setK(i); show(i);
    if (f.collision && !p.crashed) { p.crashed = true; live.current.onCrash?.(); if (live.current.effects && !reducedMotion()) model.current?.explode(f); }
    if (i >= live.current.frames.length - 1) { p.playing = false; setPlaying(false); }
  };
  const restart = () => { model.current?.clearExplosion(); play.current = { k: 0, t: 0, playing: true, crashed: false }; setK(0); setPlaying(true); show(0); };
  useEffect(() => {
    let raf, prev = performance.now(), gone = false;
    import('../web/world.js').then(({ createWorld }) => { // three.js loads only once a replay exists
      if (gone) return;
      try { model.current = createWorld(host.current); setReady(true); } catch (e) { setError(`3D could not start: ${e.message}. The transcript below still lists every line.`); }
    });
    const loop = now => {
      const p = play.current; model.current?.updateEffects(now);
      if (p.playing) {
        p.t += Math.min((now - prev) / 1000, .1) * live.current.speed / STEP_SECONDS;
        if (p.t >= 1) arrive(p.k + 1); else if (!reducedMotion()) show(p.k, p.t);
      }
      prev = now; raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { gone = true; cancelAnimationFrame(raf); model.current?.destroy(); model.current = null; };
  }, []);
  useEffect(() => { model.current?.setEnvironment(environment); }, [ready, environment]);
  useEffect(() => { if (!effects) model.current?.clearExplosion(); }, [effects]);
  useEffect(() => { if (!ready) return; model.current.setLevel(spec); restart(); }, [ready, spec]);
  const step = () => { const p = play.current; p.playing = false; setPlaying(false); if (p.k < frames.length - 1) arrive(p.k + 1); };
  const pause = () => { const p = play.current; if (p.k >= frames.length - 1) return restart(); p.playing = !p.playing; setPlaying(p.playing); };
  const speaker = id => id === 'robot' ? 'Pip' : run.world.characters?.find(c => c.id === id)?.kind || id;
  const talk = run.events.map((e, j) => ({ ...e, j })).filter(e => e.kind === 'say' || e.kind === 'reply');
  const bubbles = talk.filter(e => e.j < k && e.j >= k - BUBBLE_STEPS).slice(-3);
  return <>
    <div className="world-panel">
      <div ref={host} id="scene" role="region" aria-label="3D replay of the robot run" />
      {error && <p id="scene-error">{error}</p>}
      {bubbles.length > 0 && <ol className="game-bubbles" aria-hidden="true">{bubbles.map(e => <li key={e.seq} className={e.speaker === 'robot' ? 'robot' : ''}><b>{speaker(e.speaker)}</b> {e.text}</li>)}</ol>}
      <div className="camera-controls"><button aria-label="Rotate camera left" onClick={() => model.current?.rotateCamera(-Math.PI / 8)}><Icon name="arrow-left" /></button><button aria-label="Rotate camera right" onClick={() => model.current?.rotateCamera(Math.PI / 8)}><Icon name="arrow-right" /></button><button onClick={() => model.current?.topCamera()}>Top</button><button onClick={() => model.current?.resetCamera()}>Reset view</button></div>
    </div>
    <div className="playback-tools"><div>
      <button onClick={restart}><Icon name="rotate-ccw" /> Replay</button>
      <button onClick={pause}>{playing ? <><Icon name="pause" /> Pause</> : <><Icon name="play" /> Resume</>}</button>
      <button onClick={step} disabled={k >= frames.length - 1}><Icon name="step-forward" /> Step</button>
    </div><span className="game-step" aria-live="off">Event {k} / {frames.length - 1}</span>
      <label>Speed<select value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option></select></label></div>
    <details className="output-block game-transcript"><summary>Transcript · {talk.length} {talk.length === 1 ? 'line' : 'lines'}</summary>
      {talk.length ? <ol>{talk.map(e => <li key={e.seq} className={e.speaker === 'robot' ? 'robot' : ''}><b>{speaker(e.speaker)}</b> {e.text}{e.hint && <small> Hint: {e.hint}</small>}</li>)}</ol> : <p>No speech in this world.</p>}
    </details>
  </>;
}

const worldName = (w, i, list) => `Level ${w.level} · world ${list.slice(0, i + 1).filter(x => x.level === w.level).length}`;

function stageMessage(r) {
  if (r.error === 'Run cancelled.') return 'Run stopped. Saved stars are unchanged.';
  if (r.stage === 'compile') return `Fix the compiler error in \`Student.java\`. ${inDesktop ? 'Errors are underlined in the editor.' : 'Details are also in the Problems panel.'}`;
  if (r.stage === 'checks') return 'The program runs, but a required Java construct is missing. Read the checks below.';
  if (ENGINE_STAGES.includes(r.stage)) return 'Pip could not run the game. This is a setup problem, not a mistake in `Student.java`.';
  return 'The program stopped with an error. Read the details below.';
}

function GamePanel({ game }) {
  const { progress } = useProgress();
  const [busy, setBusy] = useState(false), [phase, setPhase] = useState('idle'), [feedback, setFeedback] = useState('Read the brief, edit `Student.java`, then run it.');
  const [file, setFile] = useState('Opening Student.java…'), [source, setSource] = useState(null), [setupError, setSetupError] = useState('');
  const [result, setResult] = useState(null), [worlds, setWorlds] = useState([]), [shown, setShown] = useState(null);
  const [custom, setCustom] = useState(null), [customInput, setCustomInput] = useState(''), [confirmRestore, setConfirmRestore] = useState(false), [hint, setHint] = useState(false);
  const sourceRef = useRef(), run = useRef({ id: '', mode: '' }), handled = useRef(''), alive = useRef(true), calls = useRef();
  const fx = useRef(), canvas = useRef(), notice = useRef(), shell = useRef(), restoreButton = useRef();
  const max = maxStarsFor(game.id), saved = gameStars(game.id, progress), best = progress.games?.[game.id]?.best ?? null;
  const next = games[games.indexOf(game) + 1];
  const total = totalStars(progress.games, gameIds), env = progress.view.environment;
  const environment = arenaUnlocked(env, total) ? env : 'workshop';

  function finished(packet, history = false) {
    if (!alive.current || !packet?.result || packet.gameId !== game.id || handled.current === packet.runId) return;
    handled.current = packet.runId; setBusy(false);
    const r = packet.result;
    if ((packet.mode || r.mode) === RUN_MODES.custom) { setCustom(r); if (r.worlds?.[0]) setShown(r.worlds[0]); return; }
    const failed = r.worlds?.find(w => !w.passed);
    setResult(r); setWorlds(r.worlds || []); setCustom(null); setShown(failed || r.worlds?.[0] || null);
    if (r.stage) { setPhase('error'); setFeedback(stageMessage(r)); return; }
    const over = r.worlds?.find(w => w.level === 2 && w.end && w.world.par !== undefined && w.end.actions > w.world.par);
    setPhase(r.earnedStars ? 'success' : 'error');
    setFeedback(r.earnedStars === max ? (game.project ? 'Project complete.' : 'Every world solved within par.') : failed ? failed.message
      : over ? `All worlds solved. One level 2 world used ${over.end.actions} actions and par is ${over.world.par}. Every printed line counts, so trim extra lines for the third star.` : 'Run again to try for more stars.');
    if (!history && r.earnedStars > 0) fx.current.success(`${r.earnedStars} ${r.earnedStars === 1 ? 'star' : 'stars'} earned`, r.earnedStars === max ? 'Game complete.' : 'Harder worlds earn the next star.');
  }
  useEffect(() => {
    alive.current = true;
    fx.current = createEffects(canvas.current, notice.current, shell.current); fx.current.enabled = progress.view.effects;
    const mine = handler => packet => { if (packet?.gameId === game.id) handler(packet); };
    const stop = [
      subscribe('run.started', mine(({ runId, mode }) => {
        run.current = { id: runId, mode }; setBusy(true); fx.current.clear();
        if (mode === RUN_MODES.custom) return setCustom({ running: true });
        setResult(null); setWorlds([]); setShown(null); setPhase('running'); setFeedback('Compiling and running each world…');
      })),
      subscribe('run.progress', mine(({ runId, world }) => { if (runId === run.current.id && run.current.mode !== RUN_MODES.custom) setWorlds(list => [...list, world]); })),
      subscribe('run.finished', packet => calls.current.finished(packet)),
      subscribe('document.changed', mine(() => setFeedback('The code changed. Run again to test the new version.'))),
      subscribe('editor.replace', mine(({ source }) => sourceRef.current?.replace?.(source))),
      subscribe('editor.reveal', mine(({ text }) => sourceRef.current?.reveal?.(text))),
    ];
    request(GAME_REQUESTS.open, { gameId: game.id }).then(data => {
      if (!alive.current) return; setFile(data.file); if (inDesktop) setSource(data.source); if (data.result) calls.current.finished(data.result, true);
    }).catch(e => { if (alive.current) setSetupError(e.message); });
    const shortcut = e => { if (e.defaultPrevented || e.key !== 'Enter' || !(mac ? e.metaKey : e.ctrlKey)) return; e.preventDefault(); e.target.id === 'custom-input' ? calls.current.start(RUN_MODES.custom) : calls.current.start(); };
    window.addEventListener('keydown', shortcut);
    return () => { alive.current = false; stop.forEach(f => f()); fx.current.destroy(); window.removeEventListener('keydown', shortcut); };
  }, []);
  useEffect(() => { fx.current.enabled = progress.view.effects; }, [progress.view.effects]);

  // `sourceRef.current` is the editor's current text (or a getter for it); VS Code reads the native document instead.
  const code = text => { if (!inDesktop) return {}; const s = text ?? sourceRef.current; return { source: typeof s === 'function' ? s() : typeof s?.get === 'function' ? s.get() : s ?? source }; };
  const start = (mode = RUN_MODES.graded, text) => {
    if (busy || setupError) return;
    setBusy(true);
    request(GAME_REQUESTS.run, { gameId: game.id, mode, ...(mode === RUN_MODES.custom ? { input: customInput } : {}), ...code(text) })
      .then(packet => calls.current.finished(packet))
      .catch(e => { if (!alive.current) return; setBusy(false); if (mode === RUN_MODES.custom) setCustom({ stage: 'runtime', error: e.message }); else { setPhase('error'); setFeedback(e.message); } });
  };
  calls.current = { finished, start };
  const restore = async confirmed => {
    try {
      const r = await request(GAME_REQUESTS.restore, { gameId: game.id, confirmed });
      if (r?.needsConfirm) return setConfirmRestore(true);
      setConfirmRestore(false); if (r?.restored) setFeedback('Starter code restored. Run it to see where the game begins.');
      restoreButton.current?.focus();
    } catch (e) { setFeedback(e.message); }
  };
  const cancelRestore = () => { setConfirmRestore(false); setTimeout(() => restoreButton.current?.focus()); };

  const expected = game.project ? 3 : 6, shownCustom = custom && !custom.running && shown === custom.worlds?.[0];
  const errorNote = result?.error ? explainError(result.error) : '';
  const done = result && !result.stage && !busy && result.earnedStars === max;
  const panel = <div ref={shell} className="lesson-panel game-panel">
    {!inDesktop && <header className="lesson-panel-header">
      <Link className="text-button" to="/games"><Icon name="arrow-left" /> All games</Link>
      <button className="text-button" onClick={() => request(GAME_REQUESTS.focus, { gameId: game.id }).catch(e => setFeedback(e.message))}><Icon name="file-code" /> Focus Java file</button>
    </header>}
    <section className="lesson-title-row">
      <div><span className="eyebrow">{game.project ? 'Project' : `Game · ${game.subtopic} ${subtopicTitle(game.subtopic)}`}</span><h1>{game.title}</h1>
        <p className="game-record">{game.boss && <span className="boss-badge">Boss</span>}<Stars count={saved} max={max} label="stars saved" />{best !== null && <span>Best: {best} actions</span>}</p></div>
      <div className="run-controls">
        {busy && <button onClick={() => request(GAME_REQUESTS.stop).catch(() => {})}>Stop</button>}
        <button id="run" className="primary" disabled={busy || Boolean(setupError)} onClick={() => start()} aria-keyshortcuts={mac ? 'Meta+Enter' : 'Control+Enter'}>{busy ? 'Running…' : <><Icon name="play" /> Save & run <kbd>{mac ? '⌘↵' : 'Ctrl+Enter'}</kbd></>}</button>
      </div>
    </section>
    {setupError && <section className="setup-error" role="alert"><p>{setupError}</p><button onClick={() => request('workspace.open').catch(e => setSetupError(e.message))}>Open learning folder</button><button onClick={() => window.location.reload()}>Retry setup</button></section>}
    <section className="lesson-instruction" aria-label="Game brief">
      <div className="region-heading"><strong>Task</strong></div>
      <p><strong><CodeText>{game.task}</CodeText></strong></p>
      {game.brief.split(/\n\s*\n/).map((para, i) => <p key={i}><CodeText>{para}</CodeText></p>)}
      {game.inputHelp && <p><strong>Input</strong> <CodeText>{game.inputHelp}</CodeText></p>}
      {game.project ? <p className="game-tiers">Pass all three worlds to complete the project.</p>
        : <ul className="game-tiers" aria-label="How stars are earned"><li><Stars count={1} max={1} label="star" /> Pass three level 1 worlds</li><li><Stars count={2} max={2} label="stars" /> Also pass three harder level 2 worlds</li><li><Stars count={3} max={3} label="stars" /> Solve level 2 within par (printed lines count as actions)</li></ul>}
      {hint ? <p className="hint-text"><strong>Hint</strong> <CodeText>{game.hint}</CodeText></p>
        : game.hint && <div className="task-actions"><button className="text-button" onClick={() => setHint(true)}><Icon name="lightbulb" /> Show a hint</button></div>}
    </section>
    <section className={`result-pane ${phase}`} aria-label="Game worlds">
      <div className="pane-heading"><span className="file-title">Worlds<small>{busy && !custom?.running ? `Running world ${Math.min(worlds.length + 1, expected)} of up to ${expected}` : result ? 'Updated' : 'Waiting for a run'}</small></span>
        {result && !result.stage && <span className="game-earned">This run <Stars count={result.earnedStars} max={max} label="stars earned this run" /></span>}</div>
      {worlds.length > 0 && <div className="trial-controls" aria-label="Choose a world to replay">{worlds.map((w, i) => <button key={`${w.level}-${w.seed}-${i}`} aria-pressed={shown === w} onClick={() => setShown(w)}><Status passed={w.passed} /> {worldName(w, i, worlds)}</button>)}
        {custom?.worlds?.[0] && <button aria-pressed={shownCustom} onClick={() => setShown(custom.worlds[0])}>Input experiment</button>}</div>}
      {shown ? <>
        <p className={`game-world-message ${shownCustom ? '' : shown.passed ? 'passed' : 'failed'}`}>{shownCustom ? 'Input experiment. No stars, and nothing is saved.' : <><Status passed={shown.passed} /> <CodeText>{shown.message || (shown.passed ? 'World solved.' : 'World not solved.')}</CodeText></>}
          {shown.end && <small> {shown.end.actions} actions{!shownCustom && shown.world.par !== undefined ? ` · par ${shown.world.par}` : ''} · seed <code>{shown.seed}</code></small>}</p>
        <Replay run={shown} environment={environment} effects={progress.view.effects} onCrash={() => fx.current.crash()} />
      </> : <p className="game-empty">{busy ? 'The first world appears here as soon as it finishes.' : 'No worlds yet. Save & run shows each world here, then replays it in 3D.'}</p>}
      <div ref={notice} id="celebration" hidden><b aria-hidden="true"><Icon name="check" /></b><strong /><span /></div>
    </section>
    <section className={`feedback ${phase}`} aria-live="polite"><strong><CodeText>{feedback}</CodeText></strong>
      {result?.sourceChecks?.length > 0 && <ul className="source-checks">{result.sourceChecks.map((c, i) => <li key={i}><Status passed={c.passed} /> <CodeText>{c.message}</CodeText></li>)}</ul>}
      {errorNote && <p className="error-note"><CodeText>{errorNote}</CodeText></p>}
      {result?.error && result.error !== 'Run cancelled.' && <details><summary>Exact error output</summary><pre id="console"><code>{result.error}</code></pre></details>}
    </section>
    {done && <section className="practice-completion"><h2>{game.title} complete</h2>{next && !game.project ? <Link className="primary-link" to={gameRoute(next.id)}>Next game: {next.title} <Icon name="arrow-right" /></Link> : <Link className="primary-link" to="/games">All games <Icon name="arrow-right" /></Link>}</section>}
    {game.inputHelp && <details className="output-block custom-block"><summary>Try own input</summary><div className="custom-body">
      <label htmlFor="custom-input">Standard input for one level 1 world</label>
      <textarea id="custom-input" aria-describedby="custom-note" value={customInput} maxLength={10000} onChange={e => setCustomInput(e.target.value)} />
      <div className="custom-actions"><button disabled={busy || Boolean(setupError)} onClick={() => start(RUN_MODES.custom)} aria-keyshortcuts={mac ? 'Meta+Enter' : 'Control+Enter'}>{custom?.running ? 'Running…' : 'Run with this input'}</button>
        <small id="custom-note">Saves and runs <code>Student.java</code> once. The world, signs, and goal stay generated; only the input changes. No stars.</small></div>
      {custom && !custom.running && <div aria-live="polite">{custom.stage ? <>{explainError(custom.error) && <p className="error-note"><CodeText>{explainError(custom.error)}</CodeText></p>}<pre><code>{custom.error}</code></pre></>
        : custom.worlds?.[0] && <p>Generated input for comparison: <code>{JSON.stringify(custom.worlds[0].world.input ?? '')}</code>. The replay above shows the experiment.</p>}</div>}
    </div></details>}
    <footer className="lesson-tools"><span><code>{file}</code></span>
      {confirmRestore ? <span role="alert" onKeyDown={e => { if (e.key === 'Escape') cancelRestore(); }}>Replace this code with the starter? <button autoFocus className="text-button" onClick={() => restore(true)}>Restore starter</button> <button className="text-button" onClick={cancelRestore}>Cancel</button></span>
        : <button ref={restoreButton} disabled={busy} className="text-button" onClick={() => restore(false)}>Restore starter</button>}</footer>
    <canvas ref={canvas} id="celebration-canvas" aria-hidden="true" />
  </div>;
  if (!inDesktop) return panel;
  return <div className="desktop-shell"><TopBar back={{ to: '/games', label: 'All games' }} trail={['Games', game.project ? 'Projects' : subtopicTitle(game.subtopic), game.title]} /><div className="desktop-split"><section className="editor-pane" aria-label="Java file">{source === null ? <p className="editor-loading">{setupError || 'Opening Student.java…'}</p>
    : <Suspense fallback={<p className="editor-loading">Opening the editor…</p>}><JavaEditor docKey={game.id} initialSource={source} sourceRef={sourceRef}
      onSave={text => request('lesson.save', { gameId: game.id, source: text })}
      onDiagnose={text => request('lesson.diagnose', { gameId: game.id, source: text })}
      onComplete={(text, offset) => request('lesson.complete', { gameId: game.id, source: text, offset })}
      onRun={text => calls.current.start(RUN_MODES.graded, text)} /></Suspense>}</section>{panel}</div></div>;
}
