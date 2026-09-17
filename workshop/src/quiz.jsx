import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { lessons, stepsFor } from './curriculum.js';
import { useProgress } from './context.js';
import CodeText from './code-text.jsx';
import Icon from './icon.jsx';
import { lessonPath, practicePath, practiceType } from './routes.js';

export default function QuizPage() {
  const { lessonId } = useParams();
  const { progress, update } = useProgress();
  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson) return <main className="page-shell briefing-page"><h1>Quiz not found</h1><Link to="/">Course home</Link></main>;
  const step = stepsFor(lesson)[2];
  const answerKey = `${lesson.id}:2`;
  const selected = progress.answers?.[answerKey];
  const explored = progress.activities?.[lesson.id] === lesson.assessmentVersion;
  const correct = selected === step.answer;
  const startLabel = <>Start {practiceType(lesson).toLowerCase()} <Icon name="arrow-right" /></>;

  return <main className="page-shell briefing-page quiz-page">
    <header className="briefing-header"><Link className="back-link" to={lessonPath(lesson)}><Icon name="arrow-left" /> Back to lesson</Link><span><CodeText>{lesson.title}</CodeText></span><span className="content-type">Quiz</span></header>
    <section className="briefing-slide" aria-labelledby="quiz-title">
      <span className="eyebrow"><CodeText>{step.label}</CodeText></span>
      <h1 id="quiz-title"><CodeText>{step.title}</CodeText></h1>
      {step.text && <p><CodeText>{step.text}</CodeText></p>}
      {step.code && <pre><code>{step.code}</code></pre>}
      <fieldset className="prediction-choices" aria-describedby="prediction-feedback">
        <legend>Prediction</legend>
        {step.choices.map((choice, index) => <label key={index}>
          <input type="radio" name={`prediction-${lesson.id}`} checked={selected === index} onChange={() => update(p => ({ ...p, answers: { ...p.answers, [answerKey]: index } }))} />
          <CodeText>{choice}</CodeText>
        </label>)}
      </fieldset>
      <p id="prediction-feedback" role="status">{selected == null ? 'Choose a prediction, or continue to coding.' : correct ? <>Correct. <CodeText>{step.response}</CodeText></> : <>Not quite. <CodeText>{step.response}</CodeText></>}</p>
      {!explored && <p id="quiz-exploration-help">The interactive lesson is available as a refresher. <Link to={lessonPath(lesson)}>Open lesson <Icon name="arrow-right" /></Link></p>}
    </section>
    <footer className="briefing-actions">
      <Link className="primary-link" to={practicePath(lesson)}>{startLabel}</Link>
    </footer>
  </main>;
}
