const HEADING = { N: 0, E: 90, S: 180, W: 270 };
const STEP = { N: { x: 0, y: -1 }, E: { x: 1, y: 0 }, S: { x: 0, y: 1 }, W: { x: -1, y: 0 } };
const cm = (world, point) => ({ x: (point.x - (world.width - 1) / 2) * 50, y: -(point.y - (world.height - 1) / 2) * 50 });

export function replayFrames(run) {
  const world = run.world;
  let pose = { ...cm(world, world.robot), heading: HEADING[world.robot.dir], distance: 0, collision: false, ballLoaded: false };
  const frames = [pose];
  for (const event of run.events) {
    pose = { ...pose };
    if ((event.kind === 'move' || event.kind === 'jump') && event.to) Object.assign(pose, cm(world, event.to));
    if (event.kind === 'turn') pose.heading += ((HEADING[event.to] - HEADING[event.from] + 540) % 360) - 180;
    if (event.kind === 'bump') pose.collision = true;
    if (event.held) pose.ballLoaded = (event.held.ball || 0) > 0;
    frames.push(pose);
  }
  return frames;
}

export function replayFrame(world, frames, events, index, fraction = 0) {
  const t = Math.max(0, Math.min(1, fraction));
  const a = frames[index], b = frames[Math.min(index + 1, frames.length - 1)];
  if (!a) return null;
  const event = events[index];
  const frame = { ...a, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, heading: a.heading + (b.heading - a.heading) * t, lift: 0 };
  if (event?.kind === 'jump' && event.from && event.to) {
    const from = cm(world, event.from), to = cm(world, event.to);
    // Lift at the starting tile before travelling, then land at the next center.
    const across = Math.max(0, Math.min(1, (t - .16) / .68));
    const travel = across * across * (3 - 2 * across);
    frame.x = from.x + (to.x - from.x) * travel;
    frame.y = from.y + (to.y - from.y) * travel;
    frame.lift = t === 0 || t === 1 ? 0 : Math.sin(t * Math.PI) * .8;
  }
  if (t && event?.kind === 'shoot') {
    const target = event.hoop;
    const endX = target ? target.x - (world.width - 1) / 2 : a.x / 50 + Math.sin(a.heading * Math.PI / 180) * 3;
    const endZ = target ? target.y - (world.height - 1) / 2 : -a.y / 50 - Math.cos(a.heading * Math.PI / 180) * 3;
    frame.shot = { x: a.x / 50 + (endX - a.x / 50) * t, z: -a.y / 50 + (endZ + a.y / 50) * t, height: .8 + Math.sin(t * Math.PI) * 1.5 };
  }
  return frame;
}

// The simulator marks the destination tile as a hurdle. Render its bar at the
// entering edge, so a one-tile jump visibly crosses it and lands on clear floor.
export function hurdleLayout(world, tile, events = []) {
  const crossing = events.find(event => event.kind === 'jump' && event.from && event.to?.x === tile.x && event.to?.y === tile.y);
  const step = crossing ? { x: crossing.to.x - crossing.from.x, y: crossing.to.y - crossing.from.y } : STEP[world.robot.dir];
  return {
    x: tile.x - step.x / 2 - (world.width - 1) / 2,
    z: tile.y - step.y / 2 - (world.height - 1) / 2,
    rotation: Math.atan2(-step.x, step.y),
  };
}

export const replayEventSeconds = event => event?.kind === 'jump' ? .7 : .45;

export function replaySpeech(events, completed) {
  return events.slice(0, completed).filter(event => event.kind === 'say' || event.kind === 'reply');
}
