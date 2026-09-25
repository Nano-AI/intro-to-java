import React from 'react';
import { Link } from 'react-router-dom';
import { games, gamesForSubtopic } from './games/index.js';
import { SUBTOPICS, UNIT_IDS, PROJECT_IDS, MAX_STARS, SKIN_THRESHOLDS, gameRoute, maxStarsFor, subtopicAnchor, subtopicUnit } from '../shared/game-contract.js';
import { gameStars, totalStars, starsNeeded } from '../shared/completion.js';
import { useProgress } from './context.js';
import Icon from './icon.jsx';
import './game.css';

// ponytail: titles copied from the design spec section 1; read curriculum.units once the structure branch exports it.
const UNIT_TITLES = { basics: 'Java basics', loops: 'Repetition', methods: 'Methods', decisions: 'Decisions & input', arrays: 'Arrays' };
const SUBTOPIC_TITLES = {
  '1.1': 'Printing & program structure', '1.2': 'Variables & types', '1.3': 'Expressions & Strings',
  '2.1': '`for` loops', '2.2': 'Nested loops, Random, constants', '3.1': 'Methods & parameters', '3.2': 'Math & returns',
  '4.1': 'Conditionals', '4.2': '`while` loops & `Scanner`', '5.1': 'Arrays & references', '5.2': '2D arrays',
};
export const subtopicTitle = subtopic => SUBTOPIC_TITLES[subtopic]?.replaceAll('`', '') || subtopic;

// One shared star treatment for the catalog and the game page.
export function Stars({ count, max = 3, label = 'stars' }) {
  return <span className="stars" role="img" aria-label={`${count} of ${max} ${label}`}>
    {Array.from({ length: max }, (_, i) => <span key={i} aria-hidden="true" className={i < count ? 'on' : ''}>★</span>)}
  </span>;
}

function GameRow({ game, progress }) {
  const stars = gameStars(game.id, progress), max = maxStarsFor(game.id);
  return <li className={`game-card${stars ? ' is-cleared' : ''}`}><Link to={gameRoute(game.id)}>
    <span className="game-title"><strong>{game.title}</strong>{game.boss && <span className="boss-badge">Boss</span>}</span>
    <span className="game-state">{stars ? <><Icon name="check" /> Cleared</> : 'No stars yet'}</span>
    <Stars count={stars} max={max} />
  </Link></li>;
}

export default function GamesPage() {
  const { progress } = useProgress();
  const total = totalStars(progress.games, games.map(g => g.id)), nextSkin = SKIN_THRESHOLDS.find(t => t > total);
  const projects = PROJECT_IDS.map(id => games.find(g => g.id === id)).filter(Boolean);
  const units = UNIT_IDS.map(unit => ({ unit, subtopics: SUBTOPICS.filter(s => subtopicUnit(s) === unit && gamesForSubtopic(s).length) })).filter(u => u.subtopics.length);
  return <main className="page-shell games-page">
    <Link className="back-link" to="/"><Icon name="arrow-left" /> Course home</Link>
    <h1>Robot games</h1>
    <p className="page-description">Each game is a Java program that drives Pip through a new world on every run. One star finishes a game; two and three stars come from harder worlds and fewer actions.</p>
    <div className="progress-summary">
      <strong>{total}<span>of {MAX_STARS} stars earned</span></strong>
      {nextSkin && <strong>{starsNeeded(nextSkin, total)}<span>stars until the next robot skin</span></strong>}
    </div>
    {!units.length && !projects.length && <p>No games are installed yet. <Link to="/">Return to the course</Link></p>}
    {units.map(({ unit, subtopics }) => <section key={unit} className="games-unit" aria-labelledby={`games-${unit}`}>
      <h2 id={`games-${unit}`}>{UNIT_TITLES[unit]}</h2>
      {subtopics.map(s => <section key={s} id={subtopicAnchor(s)} aria-labelledby={`${subtopicAnchor(s)}-title`}>
        <h3 id={`${subtopicAnchor(s)}-title`}><span className="subtopic-number">{s}</span> {subtopicTitle(s)}</h3>
        <ol className="game-list">{gamesForSubtopic(s).map(g => <GameRow key={g.id} game={g} progress={progress} />)}</ol>
      </section>)}
    </section>)}
    {projects.length > 0 && <section className="games-unit" aria-labelledby="games-projects">
      <h2 id="games-projects">Projects</h2>
      <p className="page-description">Open arenas with one star each. Any program that meets the brief passes.</p>
      <ol className="game-list">{projects.map(g => <GameRow key={g.id} game={g} progress={progress} />)}</ol>
    </section>}
  </main>;
}
