import React, { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { lessons, modules, stepsFor } from './curriculum.js';
import { useProgress } from './context.js';
import CodeText from './code-text.jsx';
import Icon from './icon.jsx';
import VisualLab from './visual-lab.jsx';
import { quizPath, practicePath, practiceType } from './routes.js';

export default function LearningPage() {
  const { lessonId } = useParams();
  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson) return <main className="page-shell briefing-page"><h1>Lesson not found</h1><Link to="/">Course home</Link></main>;
  return <LearningSlides key={lesson.id} lesson={lesson} />;
}

function LearningSlides({ lesson }) {
  const { progress, update } = useProgress();
  const heading = useRef(null);
  const module = modules.find(m => m.ids.includes(lesson.parentId||lesson.id));
  const steps = stepsFor(lesson).slice(0, 2);
  const explored = progress.activities?.[lesson.id] === lesson.assessmentVersion;
  const savedStep = progress.steps?.[lesson.id];
  const stepIndex = Math.min(1, Math.max(0, Number.isInteger(savedStep) ? savedStep : 0));
  const step = steps[stepIndex];

  useEffect(() => {
    if (savedStep !== stepIndex) update(p => ({ ...p, steps: { ...p.steps, [lesson.id]: stepIndex } }));
  }, [lesson.id, savedStep, stepIndex, update]);
  useEffect(() => { heading.current?.focus(); }, [stepIndex]);

  const goTo = index => {
    if (index < 0 || index > 1) return;
    update(p => ({ ...p, steps: { ...p.steps, [lesson.id]: index } }));
  };
  const explore = () => {
    if (!explored) update(p => ({ ...p, activities: { ...p.activities, [lesson.id]: lesson.assessmentVersion } }));
  };

  return <main className="page-shell briefing-page">
    <header className="briefing-header">
      <Link className="back-link" to={module ? `/module/${module.id}` : '/'}><Icon name="arrow-left" /> {module ? <CodeText>{module.title}</CodeText> : 'Course home'}</Link>
      <span><CodeText>{lesson.title}</CodeText></span>
      <span className="slide-count" aria-label={`Slide ${stepIndex + 1} of 2`}>{stepIndex + 1} / 2</span>
    </header>
    <section className="briefing-slide" aria-labelledby="briefing-title">
      <span className="eyebrow"><CodeText>{step.label}</CodeText></span>
      <h1 id="briefing-title" ref={heading} tabIndex={-1}><CodeText>{step.title}</CodeText></h1>
      {step.text && <p><CodeText>{step.text}</CodeText></p>}
      {step.code && <pre><code>{step.code}</code></pre>}
      {stepIndex === 1 && <>
        <VisualLab lesson={lesson} onComplete={explore} done={explored} />
        <p id="exploration-help" role="status">{explored ? 'Model explored. Try the quiz or start coding.' : 'Explore the model, or start coding when ready.'}</p>
      </>}
    </section>
    <footer className="briefing-actions">
      {stepIndex > 0 && <button onClick={() => goTo(stepIndex - 1)}><Icon name="arrow-left" /> Back</button>}
      {stepIndex === 0 ? <button className="primary" onClick={() => goTo(1)}>Explore the idea <Icon name="arrow-right" /></button> : <Link to={quizPath(lesson)}>Optional quiz <Icon name="arrow-right" /></Link>}
      <Link className="primary-link" to={practicePath(lesson)}>Start {practiceType(lesson).toLowerCase()} <Icon name="arrow-right" /></Link>
    </footer>
  </main>;
}
