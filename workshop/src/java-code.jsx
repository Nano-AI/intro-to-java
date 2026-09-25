import React from 'react';

// Read-only Java snippet in the editor's colours. A tokenizer for short teaching snippets, not a parser.
const token = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])')|\b(\d+(?:\.\d+)?[dDfFL]?|true|false|null)\b|\b(abstract|boolean|break|case|char|class|continue|default|do|double|else|extends|final|for|if|import|int|long|new|package|private|protected|public|return|static|switch|this|void|while)\b|\b([A-Z][A-Z0-9_]*)\b(?![\w$])|\b([A-Z][\w$]*)|\b([a-z_$][\w$]*)(?=\s*\()/g;
const kinds = ['comment', 'string', 'literal', 'keyword', 'literal', 'type', 'function'];

export default function JavaCode({ children }) {
  const text = String(children ?? ''), parts = [];
  let last = 0;
  for (const match of text.matchAll(token)) {
    parts.push(text.slice(last, match.index));
    parts.push(<span key={match.index} className={`tok-${kinds[match.slice(1).findIndex(Boolean)]}`}>{match[0]}</span>);
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last));
  return <pre className="java-code"><code>{parts}</code></pre>;
}
