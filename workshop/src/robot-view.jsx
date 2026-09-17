import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createWorld } from '../web/world.js';
import Icon, { Status } from './icon.jsx';
const initial = { x:0,y:-120,heading:0,left:0,right:0,distance:286,time:0,collision:false,carrying:false };

export default forwardRef(function RobotView({ result, mission, worldSpec, restored, environment, effectsEnabled, onFinished, onCrash }, ref) {
  const host = useRef(), model = useRef(), playback = useRef({ frames: [], index: 0, playing: false, remainder: 0, trial: 0 });
  const callbacks = useRef({ onFinished, onCrash, effectsEnabled, restored }); callbacks.current = { onFinished, onCrash, effectsEnabled, restored };
  const [frame, setFrame] = useState(initial), [playing, setPlaying] = useState(false), [trial, setTrial] = useState(0), [speed, setSpeed] = useState(2), [error, setError] = useState('');
  const speedRef = useRef(2); speedRef.current = speed;
  const resultRef = useRef(result); resultRef.current = result;
  function show(f, trail) { if (trail) model.current?.trail(trail); model.current?.draw(f, callbacks.current.restored, mission); }
  function start(index = 0) {
    model.current?.clearExplosion(); const data = resultRef.current;
    if (!data?.trials) { playback.current = { frames: [], index: 0, playing: false }; setFrame(initial); setPlaying(false); show(initial, []); return; }
    let frames = data.trials[index].frames, end = frames.length - 1;
    const same = (a,b) => ['x','y','heading','left','right','collision','carrying','ballLoaded','delivered','scored'].every(k => a[k] === b[k]) && JSON.stringify(a.ball)===JSON.stringify(b.ball);
    while (end > 1 && same(frames[end],frames[end-1])) end--;
    frames = frames.slice(0,Math.min(frames.length,end+45));
    playback.current = { frames, index:0, playing:true, remainder:0, trial:index, notified:false };
    setTrial(index); setFrame(frames[0]); setPlaying(true); show(frames[0], []);
  }
  function finish() { const p = playback.current; p.playing = false; setPlaying(false); if (!p.notified) { p.notified = true; callbacks.current.onFinished(resultRef.current); } }
  useEffect(() => {
    try { model.current = createWorld(host.current); model.current.setEnvironment(environment);model.current.setLevel(worldSpec); show(initial, []); }
    catch (e) { setError(`3D could not start: ${e.message}`); }
    let request, previous = performance.now(), lastUi = 0;
    const loop = now => {
      model.current?.updateEffects(now); const p = playback.current;
      if (p.playing && p.frames.length) {
        p.remainder += Math.min((now - previous)/1000,.1) * speedRef.current;
        if (p.remainder >= 1/60) {
          p.index = Math.min(p.frames.length-1,p.index+Math.floor(p.remainder*60)); p.remainder %= 1/60;
          const current = p.frames[p.index]; show(current,p.frames.slice(0,p.index+1));
          if (now-lastUi > 100 || p.index === p.frames.length-1) { setFrame(current); lastUi = now; }
          if (current.collision && !p.crashed) { p.crashed = true; callbacks.current.onCrash(); if (callbacks.current.effectsEnabled && !matchMedia('(prefers-reduced-motion: reduce)').matches) model.current?.explode(current); }
          if (p.index === p.frames.length-1) finish();
        }
      }
      previous = now; request = requestAnimationFrame(loop);
    };
    request = requestAnimationFrame(loop);
    const media = matchMedia('(prefers-reduced-motion: reduce)'); const quiet = () => { if (media.matches) model.current?.clearExplosion(); }; media.addEventListener('change',quiet);
    return () => { cancelAnimationFrame(request); media.removeEventListener('change',quiet); model.current?.destroy(); model.current = null; };
  }, []);
  useEffect(() => { model.current?.setEnvironment(environment); }, [environment]);
  useEffect(() => { if (!effectsEnabled) model.current?.clearExplosion(); }, [effectsEnabled]);
  useEffect(() => { start(0); }, [result]);
  useImperativeHandle(ref, () => ({ replay: start }));
  const step = () => { const p = playback.current; if (!p.frames.length) return; p.playing = false; setPlaying(false); p.index = Math.min(p.index+1,p.frames.length-1); const f = p.frames[p.index]; show(f,p.frames.slice(0,p.index+1)); setFrame(f); if(f.collision&&!p.crashed){p.crashed=true;callbacks.current.onCrash();if(callbacks.current.effectsEnabled&&!matchMedia('(prefers-reduced-motion: reduce)').matches)model.current?.explode(f);} if (p.index===p.frames.length-1) finish(); };
  const pause = () => { const p = playback.current; if (p.index === p.frames.length-1) { start(trial); return; } p.playing = !p.playing; setPlaying(p.playing); };
  return <>
    <div className="world-panel"><div ref={host} id="scene" role="region" aria-label="Interactive 3D robot view" />{error && <p id="scene-error">{error}</p>}<p id="camera-help">Drag to orbit · scroll to zoom</p><div className="camera-controls"><button aria-label="Rotate camera left" onClick={() => model.current?.rotateCamera(-Math.PI/8)}><Icon name="arrow-left" /></button><button aria-label="Rotate camera right" onClick={() => model.current?.rotateCamera(Math.PI/8)}><Icon name="arrow-right" /></button><button onClick={() => model.current?.topCamera()}>Top</button><button aria-label="Zoom in" onClick={() => model.current?.zoomCamera(1.2)}>+</button><button onClick={() => model.current?.resetCamera()}>Reset view</button></div></div>
    <div className="playback-tools"><div><button onClick={() => start(trial)} disabled={!result?.trials}><Icon name="rotate-ccw" /> Replay</button><button id="pause" onClick={pause} disabled={!result?.trials}>{playing ? <><Icon name="pause" /> Pause</> : <><Icon name="play" /> Resume</>}</button><button onClick={step} disabled={!result?.trials}><Icon name="step-forward" /> Step</button></div><label>Replay<select value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option></select></label></div>
    <div className="telemetry"><div><span>DISTANCE</span><strong>{Math.round(frame.distance)} cm</strong></div><div><span>HEADING</span><strong>{Math.round(frame.heading)}°</strong></div><div><span>POSITION <code>(x, y)</code></span><strong>{Math.round(frame.x)}, {Math.round(frame.y)} cm</strong></div><div><span>STATE</span><strong id="robot-state">{frame.collision ? 'Collision' : frame.scored?'Scored!':frame.delivered?'Delivered':frame.ballLoaded?'Ball loaded':frame.ball?.active?'Ball in flight':frame.carrying ? 'Cargo aboard' : frame.left || frame.right ? 'Moving' : 'Stopped'}</strong></div></div>
    {result?.trials && <div className="trial-controls">{result.trials.map((t,i) => <button key={i} aria-pressed={trial===i} onClick={() => start(i)}><Status passed={t.passed} /> {['Normal','Nearer','Farther + weaker'][i]}{mission===5?` · ${t.targetDistance} cm`:''}</button>)}</div>}
  </>;
});
