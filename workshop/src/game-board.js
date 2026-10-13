export function boardScore(world, state) {
  if (world.hoops?.length) return { label: 'Baskets', value: state.scored || 0, target: world.data?.baskets };
  const depots = world.characters?.filter(character => character.kind === 'customer') || [];
  if (depots.length) return { label: 'Delivered', value: state.delivered || 0, target: (world.items || []).filter(item => depots.some(depot => depot.accepts?.includes(item.kind))).length };
  if (world.targets?.length) return { label: 'Painted', value: state.painted.length, target: world.targets.length };
  return null;
}

export function depotApproaches(world, depot) {
  return [[0, 1], [-1, 0], [0, -1], [1, 0]].map(([dx, dy]) => ({ x: depot.x + dx, y: depot.y + dy, dx: -dx, dy: -dy })).filter(tile =>
    tile.x >= 0 && tile.y >= 0 && tile.x < world.width && tile.y < world.height &&
    ![...(world.walls || []), ...(world.hurdles || [])].some(([x, y]) => x === tile.x && y === tile.y) &&
    !world.characters?.some(character => character.x === tile.x && character.y === tile.y));
}

// Reconstruct the visible state at a replay step from the simulator's own events.
export function replayBoard(world, events = [], step = 0) {
  const state = { robot: { ...world.robot }, items: (world.items || []).map((item, i) => ({ ...item, id: item.id ?? `item-${i}` })), painted: [], held: {}, delivered: 0, scored: 0 };
  for (const event of events.slice(0, step)) {
    if (event.kind === 'move' || event.kind === 'jump') Object.assign(state.robot, event.to);
    if (event.kind === 'turn') state.robot.dir = event.to;
    if (event.kind === 'pick') state.items = state.items.filter(item => item.id !== event.item.id);
    if (event.kind === 'drop') {
      if (event.character) state.delivered++;
      else state.items.push({ ...event.item, ...event.at });
    }
    if (event.kind === 'paint') {
      state.painted = state.painted.filter(tile => tile.x !== event.at.x || tile.y !== event.at.y);
      state.painted.push({ ...event.at, color: event.color });
    }
    if (event.held) state.held = { ...event.held };
    if (event.kind === 'shoot' && event.hit) state.scored++;
  }
  return state;
}
