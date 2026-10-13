import React from 'react';
import Icon from './icon.jsx';

const SUBTOPIC_TITLES = {
  '1.1': 'Printing & program structure', '1.2': 'Variables & types', '1.3': 'Expressions & Strings',
  '2.1': '`for` loops', '2.2': 'Nested loops, Random, constants', '3.1': 'Methods & parameters', '3.2': 'Math & returns',
  '4.1': 'Conditionals', '4.2': '`while` loops & `Scanner`', '5.1': 'Arrays & references', '5.2': '2D arrays',
};
export const subtopicTitle = subtopic => SUBTOPIC_TITLES[subtopic]?.replaceAll('`', '') || subtopic;

// One shared star treatment for the catalog and the game page.
export function Stars({ count, max = 3, label = 'stars' }) {
  return <span className="stars" role="img" aria-label={`${count} of ${max} ${label}`}>
    {Array.from({ length: max }, (_, i) => <span key={i} aria-hidden="true" className={i < count ? 'on' : ''}><Icon name="star" /></span>)}
  </span>;
}
