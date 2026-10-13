import React from 'react';
import { replayBoard } from './game-board.js';
import Icon from './icon.jsx';

const colors = { red: '#c7443e', blue: '#2876c7', green: '#2c7b50', yellow: '#edc354', white: '#eef2f5' };
const arrow = { N: 'arrow-up', E: 'arrow-right', S: 'arrow-down', W: 'arrow-left' };
const direction = { N: 'north', E: 'east', S: 'south', W: 'west' };
const rotation = { N: 0, E: 90, S: 180, W: 270 };
function PipMark({ dir = 'N' }) {
  return <g transform={`rotate(${rotation[dir]} 18 18)`}>
    <circle cx="18" cy="18" r="14" fill="#303b49" />
    <circle cx="18" cy="18" r="11.5" fill="#317bec" />
    <path d="M9.5 8.5A13 13 0 0 1 26.5 8.5" fill="none" stroke="#a5f0ff" strokeWidth="3" strokeLinecap="round" />
    <circle cx="18" cy="18" r="3.5" fill="#1f64de" stroke="#f2f9ff" strokeWidth="1" />
    <path d="M18 15.5v2.5" stroke="#f2f9ff" strokeWidth="1.5" strokeLinecap="round" />
  </g>;
}
function MapMark({ kind }) {
  const shapes = {
    supply: <g fill="#f4be68" stroke="#845113"><path d="m8 11 10-5 10 5v14l-10 5-10-5zM8 11l10 5 10-5M18 16v14M13 8.5l10 5v7" /></g>,
    ball: <g fill="#efa13f" stroke="#85511e"><circle cx="18" cy="18" r="10" /><path d="M8 18h20M18 8v20M11 11q14 7 0 14M25 11q-14 7 0 14" /></g>,
    depot: <g fill="#f4be68" stroke="#845113"><path d="m6 13 12-7 12 7v16H6z" /><path d="M13 29V18h10v11M6 13h24" /></g>,
    shop: <g fill="#bce8e8" stroke="#24646b"><path d="M8 14h20v15H8zM5 14l3-7h20l3 7zM15 29v-9h8v9" /><path d="M13 7l-1 7M23 7l1 7" /></g>,
    character: <g fill="#d8cdf4" stroke="#6b5496"><circle cx="18" cy="10" r="5" /><path d="M8 29v-5a10 10 0 0 1 20 0v5z" /></g>,
    hoop: <g fill="none" stroke="#b56b16"><path d="m10 17 3 12h10l3-12M12 23h12M15 19v9M21 19v9" /><ellipse cx="18" cy="15" rx="12" ry="5" /></g>,
    hurdle: <g fill="#f4be68" stroke="#845113"><path d="M8 12v18M28 12v18" /><rect x="5" y="10" width="26" height="7" rx="1" /></g>,
    wall: <g fill="#8297b0" stroke="#40546f"><rect x="5" y="8" width="26" height="22" rx="2" /><path d="M5 19h26M18 8v11M12 19v11M25 19v11" /></g>,
    finish: <g fill="#a8dab9" stroke="#277347"><path d="M9 32V6M9 6c6-5 12 5 19 0v13c-7 5-13-5-19 0" /></g>,
    blue: <rect x="7" y="7" width="22" height="22" rx="3" fill="none" stroke={colors.blue} strokeDasharray="4 3" />,
    yellow: <rect x="7" y="7" width="22" height="22" rx="3" fill="none" stroke="#ad7a04" strokeDasharray="4 3" />,
  };
  return <g strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">{shapes[kind]}</g>;
}
export function BoardReadout({ world, state }) {
  const held = Object.entries(state.held).filter(([, count]) => count).map(([kind, count]) => `${count} ${kind}`).join(', ') || '0';
  return <>
    <div className="board-state" aria-live="off"><span>Pip ({state.robot.x}, {state.robot.y}) <Icon name={arrow[state.robot.dir]} label={`Facing ${direction[state.robot.dir]}`} /></span>{(world.items?.length > 0 || world.characters?.some(c => c.kind === 'shop')) && <span>Holding {held}</span>}{world.characters?.some(c => c.kind === 'customer') && <span className="board-score">Delivered {state.delivered}</span>}{world.targets?.length > 0 && <span className="board-score">Painted {state.painted.length}/{world.targets.length}</span>}{world.hoops?.length > 0 && <span className="board-score">Baskets {state.scored}{world.data?.baskets ? `/${world.data.baskets}` : ''}</span>}</div>
    {Object.keys({ ...world.constants, ...world.variables }).length > 0 && <dl className="board-values">{Object.entries({ ...world.constants, ...world.variables }).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>}
  </>;
}
export default function GameBoard({ world, events = [], step = 0 }) {
  const state = replayBoard(world, events, step), size = 38, pad = 26;
  const at = (items, x, y) => items?.find(item => item.x === x && item.y === y);
  const held = Object.entries(state.held).filter(([, count]) => count).map(([kind, count]) => `${count} ${kind}`).join(', ') || '0';
  const legend = [
    ['robot', 'Pip'],
    ...(world.items?.length ? [[world.items.every(i => i.kind === 'ball') ? 'ball' : 'supply', world.items.every(i => i.kind === 'ball') ? 'Ball' : 'Supply']] : []),
    ...(world.characters || []).some(c => c.kind === 'customer') ? [['depot', 'Depot']] : [],
    ...(world.characters || []).some(c => c.kind === 'shop') ? [['shop', 'Shop']] : [],
    ...(world.characters || []).some(c => !['customer', 'shop'].includes(c.kind)) ? [['character', 'Character']] : [],
    ...(world.hoops?.length ? [['hoop', 'Hoop']] : []),
    ...(world.hurdles?.length ? [['hurdle', 'Jump here']] : []),
    ...(world.walls?.length ? [['wall', 'Wall']] : []),
    ...(world.finish ? [['finish', 'Finish']] : []),
    ...(world.targets?.length ? [['blue', 'Blue target'], ...world.targets.some(t => t.color === 'yellow') ? [['yellow', 'Yellow target']] : []] : []),
  ];
  return <figure className="tile-board"><div className="board-axis" aria-hidden="true"><span>Columns <Icon name="arrow-right" /></span><span>Rows <Icon name="arrow-down" /></span></div>
    <div className="board-viewport"><svg role="img" aria-label={`Pip at column ${state.robot.x}, row ${state.robot.y}, facing ${direction[state.robot.dir]}. Holding ${held}. ${state.delivered} delivered; ${state.painted.length} painted.`} style={{ width: Math.min(world.width * size + pad, 520), minWidth: Math.min(world.width * size + pad, 520) }} viewBox={`0 0 ${world.width * size + pad} ${world.height * size + pad}`}>
      {Array.from({ length: world.width }, (_, x) => <text key={`x${x}`} x={pad + x * size + size / 2} y={16} textAnchor="middle" className="tile-coordinate">{x}</text>)}
      {Array.from({ length: world.height }, (_, y) => <React.Fragment key={y}>
        <text x={12} y={pad + y * size + 25} textAnchor="middle" className="tile-coordinate">{y}</text>
        {Array.from({ length: world.width }, (_, x) => {
          const painted = at(state.painted, x, y), target = at(world.targets, x, y), item = at(state.items, x, y), character = at(world.characters, x, y);
          const wall = world.walls?.some(t => t[0] === x && t[1] === y), hurdle = world.hurdles?.some(t => t[0] === x && t[1] === y);
          const finish = world.finish?.x === x && world.finish?.y === y;
          const robot = state.robot.x === x && state.robot.y === y;
          const symbol = robot ? '' : wall ? 'wall' : hurdle ? 'hurdle' : character ? (character.kind === 'customer' ? 'depot' : character.kind === 'shop' ? 'shop' : 'character') : item ? (item.kind === 'ball' ? 'ball' : 'supply') : at(world.hoops, x, y) ? 'hoop' : '';
          return <g key={x} transform={`translate(${pad + x * size} ${pad + y * size})`}>
            <rect width={size - 2} height={size - 2} rx={4} fill={painted ? colors[painted.color] : undefined} className={painted ? 'tile-painted' : 'tile-empty'} />
            {target && !painted && <rect x={4} y={4} width={size - 10} height={size - 10} rx={3} className="tile-target" style={{ stroke: colors[target.color || 'blue'] }} />}
            {robot && <PipMark dir={state.robot.dir} />}
            {symbol && <MapMark kind={symbol} />}
            {finish && <g className="tile-finish" transform="translate(21 -2) scale(.42)"><MapMark kind="finish" /></g>}
            <title>{`(${x}, ${y})${robot ? ` Pip facing ${direction[state.robot.dir]}` : ''}${character ? ` ${character.kind}` : ''}${item ? ` ${item.kind}` : ''}${wall ? ' wall' : ''}${hurdle ? ' hurdle' : ''}${finish ? ' finish' : ''}${target ? ` target: ${target.color || 'blue'}` : ''}${painted ? ` painted ${painted.color}` : ''}`}</title>
          </g>;
        })}
      </React.Fragment>)}
    </svg></div>
    <figcaption>
      <ul className="board-legend" aria-label="Map key">{legend.map(([symbol, label]) => <li key={label}><span aria-hidden="true"><svg viewBox="0 0 36 36" width="24" height="24">{symbol === 'robot' ? <PipMark /> : <MapMark kind={symbol} />}</svg></span>{label}</li>)}</ul>
      <BoardReadout world={world} state={state} />
    </figcaption>
  </figure>;
}
