import React from 'react';

// Inline code markup for teaching prose, not a parser or an editor.
export default function CodeText({ children }) {
  const text = String(children ?? '');
  const pattern = /`([^`]+)`|\b(?:[A-Za-z_$][\w$]*\.)*[A-Za-z_$][\w$]*\([^()\n]*\)|\b[A-Za-z_$][\w$]*\.java\b|\b(?:int|double|boolean|char|String|Scanner|Random|Math|main|println|nextInt|nextLine|nextDouble|charAt|true|false|null)\b|\b(?:for|while|if|else|return|final)(?=\s+(?:loop|loops|statement|branch|value|constant))|==|!=|<=|>=|&&|\|\||\+\+|--/g;
  const parts=[];let last=0;
  for(const match of text.matchAll(pattern)) { parts.push(text.slice(last,match.index));parts.push(<code key={match.index}>{match[1]??match[0]}</code>);last=match.index+match[0].length; }
  parts.push(text.slice(last));return <>{parts}</>;
}
