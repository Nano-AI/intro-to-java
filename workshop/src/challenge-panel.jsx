import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Tabs } from '@radix-ui/themes';
import { TopBar, lessonBack } from './pages.jsx';
import CodeText from './code-text.jsx';
import JavaCode from './java-code.jsx';
import Icon from './icon.jsx';
import SubmissionQuality, { submissionTitle } from './submission-quality.jsx';

const inputLabel = check => check?.inputs
  ? Object.entries(check.inputs).map(([name, value]) => `${name} = ${JSON.stringify(value)}`).join('\n')
  : check?.input || check?.label || '(no input)';
const outcome = result => result?.stage === 'compile' ? 'Compile error' : result?.stage === 'runtime' ? 'Runtime error' : result?.passed ? 'Accepted' : 'Not accepted';

function CaseValues({ check, showOutput = false }) {
  if (!check) return null;
  return <dl className={`challenge-case-values ${showOutput ? 'with-output' : ''}`}>
    <div className="case-input"><dt>Input</dt><dd>{check.inputs || check.invocation ? <JavaCode>{inputLabel(check)}</JavaCode> : <pre>{inputLabel(check)}</pre>}</dd></div>
    {showOutput && <><div className="case-output"><dt>Output</dt><dd><pre>{check.output || '(no output)'}</pre></dd></div><div className="case-expected"><dt>Expected</dt><dd><pre>{check.expected ?? '—'}</pre></dd></div></>}
    {showOutput && check.error && <div className="case-error"><dt>Error</dt><dd><pre role="alert">{check.error}</pre></dd></div>}
  </dl>;
}

export default function ChallengePanel({ lesson, editor, result, trial, busy, loading, feedback, setupError, passed, onRun, onSubmit, onStop, runMode, refs }) {
  const [leftTab, setLeftTab] = useState('description'), [consoleTab, setConsoleTab] = useState('testcase');
  const [consoleExpanded, setConsoleExpanded] = useState(false);
  const [caseIndex, setCaseIndex] = useState(0), [pending, setPending] = useState('public');
  const mode = runMode || pending, submitting = ['graded', 'submit'].includes(mode);
  const hasInput = lesson.cases.some(check => check.input);
  const publicCases = lesson.publicCases || lesson.cases.slice(0, 3);
  const runChecks = trial?.checks || (trial && !trial.running && !trial.error && 'output' in trial ? [trial] : []);
  const selected = runChecks[caseIndex] || publicCases[caseIndex];
  const checks = result?.checks || [], failed = checks.find(check => !check.passed);
  const failedStructure = result?.sourceChecks?.filter(check => !check.passed) || [];
  useEffect(() => { if (trial) { setConsoleTab('result'); if (trial.checks) setCaseIndex(Math.max(0, trial.checks.findIndex(check => !check.passed))); } }, [trial]);
  useEffect(() => { if (result) setLeftTab('submission'); }, [result]);
  useEffect(() => { if (busy) { if (submitting) setLeftTab('submission'); else setConsoleTab('result'); } }, [busy, submitting]);
  const start = mode => {
    setPending(mode);
    if (mode === 'graded') { setLeftTab('submission'); onSubmit(); }
    else { setLeftTab('description'); setConsoleTab('result'); onRun(); }
  };
  const caseButtons = <div className="challenge-case-tabs" role="group" aria-label="Public test cases">{publicCases.map((check, i) => <Button key={i} size="1" variant="ghost" aria-pressed={caseIndex === i} onClick={() => setCaseIndex(i)}>{runChecks[i] && <Icon name={runChecks[i].passed ? 'check' : 'x'} label={runChecks[i].passed ? 'Passed' : 'Failed'} />}Case {i + 1}</Button>)}</div>;
  const runPassed = runChecks.length === publicCases.length && runChecks.every(check => check.passed) && !trial?.error;
  const runVerdict = <div className="run-verdict"><h2 className={runPassed ? 'passed' : 'failed'}>{trial?.error ? outcome(trial) : runPassed ? 'Passed' : 'Not passed'}</h2>{runChecks.length > 0 && <span>{runChecks.filter(check => check.passed).length} / {publicCases.length} passed</span>}</div>;
  const submission = <section className="challenge-result challenge-submission" aria-label="Submission result" aria-live="polite">
    {busy && submitting ? <p role="status">Submitting…</p> : setupError ? <pre role="alert">{setupError}</pre> : result ? <>
      <h2 className={result.passed ? 'passed' : 'failed'}>{submissionTitle(result)}</h2>
      {checks.length > 0 && <p className="submission-count">{checks.filter(check => check.passed).length} / {result.total || checks.length} test cases passed</p>}
      <SubmissionQuality result={result} />
      {result.error && <pre role="alert">{result.error}</pre>}
      {failed && <CaseValues check={failed} showOutput />}
      {!result.error && failedStructure.length > 0 && <ul>{failedStructure.map(check => <li key={check.message}><CodeText>{check.message}</CodeText></li>)}</ul>}
      {checks.length > 0 && <details className="submission-tests"><summary>Test cases</summary>{checks.map((check, i) => <details key={i}><summary><Icon name={check.passed ? 'check' : 'x'} label={check.passed ? 'Passed' : 'Failed'} />Case {i + 1}</summary><CaseValues check={check} showOutput /></details>)}</details>}
      {result.passed && passed && <Button asChild variant="surface"><Link to={`/module/${lesson.unit}`}>Back to module</Link></Button>}
    </> : <p className="challenge-empty" role="status">{feedback || 'No submission yet.'}</p>}
  </section>;
  return <div className="challenge-workspace" ref={refs.shell}>
    <TopBar back={lessonBack(lesson)} trail={[]}>
      <span className="challenge-badge"><Icon name="flag" />Challenge</span>
      <div className="challenge-actions">{busy ? <Button variant="outline" onClick={onStop}>Stop</Button> : <>
        <Button variant="outline" disabled={loading || Boolean(setupError)} onClick={() => start('public')}><Icon name="play" />Run</Button>
        <Button id="run" disabled={loading || Boolean(setupError)} onClick={() => start('graded')}><Icon name="send" />Submit</Button>
      </>}</div>
    </TopBar>
    <main className="challenge-layout">
      <section className="challenge-problem" aria-label="Challenge problem"><Tabs.Root value={leftTab} onValueChange={setLeftTab}>
        <Tabs.List aria-label="Problem" className="workbench-tabs"><Tabs.Trigger value="description" data-pane="description"><Icon name="book-open" />Description</Tabs.Trigger><Tabs.Trigger value="submission" data-pane="submission"><Icon name="send" />Submission</Tabs.Trigger></Tabs.List>
        <Tabs.Content value="description"><div className="challenge-description">
          <h1>{lesson.title}</h1><p><CodeText>{lesson.task}</CodeText></p>
          <h2>Examples</h2><div className="challenge-examples">{lesson.examples.map((example, i) => <article className="challenge-example" key={i}><h3>Example {i + 1}</h3><dl><dt>Input</dt><dd>{hasInput ? <pre>{example.input}</pre> : <JavaCode>{example.input}</JavaCode>}</dd><dt>Output</dt><dd><pre>{example.output}</pre></dd></dl></article>)}</div>
          <h2>Constraints</h2><ul className="challenge-limits">{lesson.inputLimits.map(limit => <li key={limit}><CodeText>{limit}</CodeText></li>)}</ul>
        </div></Tabs.Content><Tabs.Content value="submission">{submission}</Tabs.Content>
      </Tabs.Root></section>
      <section className={`challenge-code ${consoleExpanded ? 'console-expanded' : ''}`} aria-label="Challenge code">
        {editor}
        <div className="challenge-console"><Tabs.Root value={consoleTab} onValueChange={setConsoleTab}>
          <div className="console-tabs-bar"><Tabs.List aria-label="Console" className="workbench-tabs"><Tabs.Trigger value="testcase" data-pane="testcase"><Icon name="file-code" />Testcase</Tabs.Trigger><Tabs.Trigger value="result" data-pane="result"><Icon name="target" />Test Result</Tabs.Trigger></Tabs.List><Button size="1" variant="ghost" className="console-size" aria-label={consoleExpanded ? 'Restore editor' : 'Expand test results'} aria-expanded={consoleExpanded} onClick={() => setConsoleExpanded(value => !value)}><Icon name={consoleExpanded ? 'minimize' : 'maximize'} />{consoleExpanded ? 'Restore' : 'Expand'}</Button></div>
          <Tabs.Content value="testcase">{caseButtons}<div className="challenge-case-content"><CaseValues check={publicCases[caseIndex]} /></div></Tabs.Content>
          <Tabs.Content value="result"><section className="challenge-result challenge-run-result" aria-label="Run results" aria-live="polite">
            {busy && !submitting ? <p role="status">Running…</p> : setupError ? <pre role="alert">{setupError}</pre> : trial?.error ? <>{runVerdict}{caseButtons}<pre role="alert">{trial.error}</pre><CaseValues check={selected} showOutput={Boolean(runChecks[caseIndex])} /></> : runChecks.length ? <>{runVerdict}{caseButtons}<CaseValues check={selected} showOutput={Boolean(runChecks[caseIndex])} /></> : <p className="challenge-empty" role="status">{feedback || 'No test results yet.'}</p>}
          </section></Tabs.Content>
        </Tabs.Root></div>
      </section>
    </main>
    <div ref={refs.notice} hidden><strong /><span /></div><canvas ref={refs.canvas} hidden />
  </div>;
}
