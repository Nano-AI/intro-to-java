import React from 'react';

// A missing or incomplete lint result must never imply perfect code.
export function submissionTitle(result, passed = result?.passed) {
  if (result?.stage === 'compile') return 'Compile error';
  if (result?.stage === 'runtime') return 'Runtime error';
  if (!passed) return 'Not accepted';
  const quality = result?.quality;
  return quality?.status === 'perfect' && quality.lint === 'complete' && quality.warningCount === 0 ? 'Perfect' : 'Accepted';
}

export default function SubmissionQuality({ result, passed = result?.passed }) {
  const quality = result?.quality;
  if (!quality || quality.status === 'unchecked') return null;
  const warnings = (result.diagnostics || []).filter(item => item.severity?.toLowerCase() === 'warning');
  return <div className="submission-quality">
    {quality.warningCount > 0 && (warnings.length ? <details><summary>{quality.warningCount} compiler {quality.warningCount === 1 ? 'warning' : 'warnings'}</summary><ul>{warnings.map((warning, i) => <li key={i}>
      {warning.line > 0 && <span>Line {warning.line}{warning.column > 0 ? `:${warning.column}` : ''}</span>}<pre>{warning.message}</pre>
    </li>)}</ul></details> : <p>{quality.warningCount} compiler {quality.warningCount === 1 ? 'warning' : 'warnings'}</p>)}
    {passed && quality.lint !== 'complete' && <p>Code quality wasn’t checked.</p>}
  </div>;
}
