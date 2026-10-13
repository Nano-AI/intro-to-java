import React from 'react';
import { tokenizeJava } from './java-tokens.js';
import './syntax.css';

function sourceText(children) {
  return React.Children.toArray(children).join('');
}

function JavaTokens({ children }) {
  return tokenizeJava(sourceText(children)).map(({text, kind}, i) => kind
    ? <span key={i} className={`tok-${kind}`}>{text}</span> : text);
}

export function JavaInline({ children }) {
  return <code className="java-inline"><JavaTokens>{children}</JavaTokens></code>;
}

export default function JavaCode({ children }) {
  return <pre className="java-code"><code><JavaTokens>{children}</JavaTokens></code></pre>;
}
