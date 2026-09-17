// The game registry. Integration-owned: content authors edit only their own
// unit file, never this one.
import { games as unit1 } from './unit-1.js';
import { games as unit2 } from './unit-2.js';
import { games as unit3 } from './unit-3.js';
import { games as unit4 } from './unit-4.js';
import { games as unit5 } from './unit-5.js';

export const games = [...unit1, ...unit2, ...unit3, ...unit4, ...unit5];

export const gameIds = games.map(game => game.id);
export const findGame = id => games.find(game => game.id === id) || null;
export const isGameId = id => games.some(game => game.id === id);

// Regular games in registry order, grouped by subtopic. The boss is last in
// each group because authors list it last; nothing re-sorts it.
export const gamesForSubtopic = subtopic => games.filter(game => !game.project && game.subtopic === subtopic);
export const projectsForUnit = unit => games.filter(game => game.project && game.unit === unit);
