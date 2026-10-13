import React from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { lessons, stepsFor } from './curriculum.js';
import { useProgress } from './context.js';
import CodeText from './code-text.jsx';
import JavaCode from './java-code.jsx';
import Icon from './icon.jsx';
import { TopBar, FlowSteps, lessonBack, lessonTrail } from './pages.jsx';
import { lessonPath, quizPath, practiceType, gateLesson, explored, hasQuiz, lessonRoute } from './routes.js';
import { missingProjectPrerequisites } from '../shared/project-access.js';
import ProjectLock from './project-lock.jsx';
import { useDemo } from './demo.jsx';

export default function QuizPage() {
  const { demo } = useDemo();
  const { lessonId } = useParams();
  const { progress, update } = useProgress(), navigate = useNavigate();
  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson) return <main className="page-shell briefing-page"><h1>Quiz not found</h1><Link to="/">Course home</Link></main>;
  if (!demo && missingProjectPrerequisites(lesson, progress, id => lessons.find(l => l.id === id)).length) return <ProjectLock project={lesson} />;
  const gate = gateLesson(lesson);
  if (gate !== lesson) return <Navigate replace to={quizPath(gate)} />;
  if (!demo && !explored(lesson, progress)) return <Navigate replace to={lessonPath(lesson)} />;
  if (!hasQuiz(lesson)) return <Navigate replace to={lessonRoute(lesson, progress)} />;
  const step = stepsFor(lesson)[2];
  const answerKey = `${lesson.id}:2`;
  const selected = progress.answers?.[answerKey];
  const correct = selected === step.answer;
  const type = practiceType(lesson).toLowerCase();

  return <div className="flow-shell">
    <TopBar back={lessonBack(lesson)} trail={lessonTrail(lesson)}><FlowSteps lesson={lesson} current="quiz" /></TopBar>
    <main className="page-shell briefing-page quiz-page">
      <section className="briefing-slide" aria-labelledby="quiz-title">
        <h1 id="quiz-title"><CodeText>{step.title}</CodeText></h1>
        {step.text && step.text !== 'Choose an answer before writing the code.' && <p className="quiz-context"><CodeText>{step.text}</CodeText></p>}
        {step.code && <JavaCode>{step.code}</JavaCode>}
        {/* A correct answer locks in, so a later click cannot re-lock the code. */}
        <fieldset className="prediction-choices" aria-describedby="prediction-feedback" disabled={correct}>
          <legend>Prediction</legend>
          {step.choices.map((choice, index) => <label key={index}>
            <input type="radio" name={`prediction-${lesson.id}`} checked={selected === index} onChange={() => update(p => ({ ...p, answers: { ...p.answers, [answerKey]: index } }))} />
            <CodeText>{choice}</CodeText>
          </label>)}
        </fieldset>
        <p id="prediction-feedback" role="status">{selected == null ? '' : correct ? <>Correct. <CodeText>{step.response}</CodeText></> : <>Not quite. <CodeText>{step.response}</CodeText> Choose again.</>}</p>
      </section>
      <footer className="briefing-actions">
        <p id="quiz-gate">{!correct && 'Choose the correct answer to continue.'}</p>
        <button className="primary" disabled={!correct} aria-describedby="quiz-gate" onClick={() => navigate(lessonRoute(lesson, progress))}>Start {type} <Icon name="arrow-right" /></button>
      </footer>
    </main>
  </div>;
}
