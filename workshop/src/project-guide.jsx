import React, { useRef, useState } from 'react';
import { Button, Dialog, Popover, Tooltip } from '@radix-ui/themes';
import { useProgress } from './context.js';
import CodeText from './code-text.jsx';
import JavaCode, { JavaInline } from './java-code.jsx';
import Icon from './icon.jsx';
import { gameCommands } from '../shared/game-commands.js';
import { projectSteps, projectGoal } from './project-steps.js';
import { automaticProjectSteps } from '../shared/project-checks.js';

export function CommandReference({ game }) {
  return <section className="command-reference" aria-label="Java and game commands">
    <p>Print a command inside <JavaInline>main</JavaInline> or a helper method. Type <JavaInline>pip</JavaInline> in the editor for autocomplete.</p>
    {gameCommands(game).map(command => <article key={command.label}><h3>{command.label}</h3><JavaCode>{command.code}</JavaCode><p>{command.description}</p></article>)}
    {game.methods?.length > 0 && <><h2>Methods to write</h2>{game.methods.map(method => <article key={method.signature}><JavaCode>{method.signature}</JavaCode><p><CodeText>{method.description}</CodeText></p></article>)}</>}
  </section>;
}

export function CommandsButton({ game }) {
  return <Dialog.Root><Dialog.Trigger><Button variant="soft" size="3"><Icon name="book-open" /> Commands</Button></Dialog.Trigger>
    <Dialog.Content className="commands-dialog" maxWidth="620px"><div className="commands-heading"><Dialog.Title>Commands</Dialog.Title><Dialog.Close><Button variant="soft" aria-label="Close commands"><Icon name="x" /></Button></Dialog.Close></div>
      <Dialog.Description size="2">{game.title}</Dialog.Description><CommandReference game={game} />
    </Dialog.Content>
  </Dialog.Root>;
}

export function ProjectRefresher({ game, onComplete, demo }) {
  const { progress, update } = useProgress(), heading = useRef();
  const questions = game.refresher || [];
  const [index, setIndex] = useState(() => Math.max(0, questions.findIndex((q, i) => progress.answers?.[`${game.id}:${i}`] !== q.answer)));
  const question = questions[index], key = `${game.id}:${index}`, selected = progress.answers?.[key];
  const answer = value => update(p => ({ ...p, answers: { ...p.answers, [key]: value } }));
  const correct = selected === question.answer, last = index === questions.length - 1;
  const navigate = value => { setIndex(value); requestAnimationFrame(() => heading.current?.focus()); };
  return <main className="project-refresher-screen">
    <div className="refresher-position"><span>Code check {index + 1} of {questions.length}</span><progress aria-label="Code checks answered correctly" max={questions.length} value={questions.filter((q, i) => progress.answers?.[`${game.id}:${i}`] === q.answer).length} /></div>
    <h2 ref={heading} tabIndex={-1}><CodeText>{question.title}</CodeText></h2>
    <article className="project-refresher"><JavaCode>{question.code}</JavaCode>
      <fieldset className="prediction-choices" aria-describedby={selected == null ? undefined : `${key}-feedback`}><legend className="sr-only">Choose an answer</legend>{question.choices.map((choice, j) => <label key={j}><input type="radio" name={key} checked={selected === j} onChange={() => answer(j)} /><CodeText>{choice}</CodeText></label>)}</fieldset>
      {selected != null && <p id={`${key}-feedback`} className={`quiz-feedback ${correct ? 'passed' : 'failed'}`} role="status"><Icon name={correct ? 'check' : 'x'} label={correct ? 'Correct' : 'Try again'} /> <CodeText>{question.response}</CodeText></p>}
    </article>
    <nav className="project-step-nav" aria-label="Refresher steps"><Button variant="outline" disabled={index === 0} onClick={() => navigate(index - 1)}>Back</Button>
      <Button disabled={!correct || (last && questions.some((q, i) => progress.answers?.[`${game.id}:${i}`] !== q.answer))} onClick={() => last ? onComplete() : navigate(index + 1)}>{last ? 'Start project' : 'Next'}</Button>
    </nav>
    {demo && <Button variant="ghost" className="skip-refresher" onClick={onComplete}>Skip refresher</Button>}
  </main>;
}

export default function ProjectGuide({ game, index, setIndex, open, setOpen, opener, focusOnOpen }) {
  const { progress, update } = useProgress(), content = useRef(), suppressFocus = useRef(false);
  const steps = projectSteps(game), step = steps[index], automatic = automaticProjectSteps(game);
  const mark = (i, value) => update(p => ({ ...p, answers: { ...p.answers, [`${game.id}:${i + 10}`]: value ? 1 : 0 } }));
  const reveal = (event, focus) => {
    if (!open) { opener.current = event.currentTarget; focusOnOpen.current = focus; setOpen(true); }
    else if (focus) { opener.current = event.currentTarget; content.current?.focus(); }
  };
  return <Popover.Root open={open} onOpenChange={setOpen}><Popover.Trigger><Button variant="soft" onPointerEnter={e => reveal(e, false)} onFocus={e => { if (!suppressFocus.current) reveal(e, true); }} onClick={e => { e.preventDefault(); reveal(e, true); }}><Icon name="check" /> Checklist</Button></Popover.Trigger>
    <Popover.Content className="project-checklist" width="420px" side="bottom" align="end" onOpenAutoFocus={e => { e.preventDefault(); if (focusOnOpen.current) content.current?.focus(); }} onCloseAutoFocus={e => { e.preventDefault(); suppressFocus.current = true; opener.current?.focus(); queueMicrotask(() => { suppressFocus.current = false; }); }}>
      <div className="commands-heading"><h2 ref={content} tabIndex={-1}>Checklist</h2><Popover.Close><Button variant="ghost" aria-label="Close checklist"><Icon name="x" /></Button></Popover.Close></div>
      <p className="project-goal">{projectGoal(game)}</p>
      <ol className="checklist-items">{steps.map((item, i) => <li key={i} aria-current={i === index ? 'step' : undefined}>
        {game.milestones?.[i] && <Tooltip content={automatic.includes(i) ? 'Checks itself when a run proves this step. You can also mark it manually.' : 'Mark this step when you finish it.'}><label className="milestone-check"><input type="checkbox" aria-label={`Mark step ${i + 1} done`} checked={progress.answers?.[`${game.id}:${i + 10}`] === 1} onChange={e => mark(i, e.target.checked)} /><Icon name="check" /></label></Tooltip>}
        <button className="checklist-step" onClick={() => setIndex(i)}><CodeText>{item.title}</CodeText></button>
      </li>)}</ol>
      <section className="project-guide" aria-label="Project guide"><h3><CodeText>{step.title}</CodeText></h3><div className="project-step"><p><CodeText>{step.text}</CodeText></p>{step.code && <JavaCode>{step.code}</JavaCode>}{step.check && <p className="step-check"><b>Check:</b> <CodeText>{step.check}</CodeText></p>}</div>
        <nav className="project-step-nav" aria-label="Project steps"><Button variant="outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>Back</Button><Button variant="soft" disabled={index === steps.length - 1} onClick={() => setIndex(index + 1)}>Next</Button></nav>
      </section>
    </Popover.Content>
  </Popover.Root>;
}
