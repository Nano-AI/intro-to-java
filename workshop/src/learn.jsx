import React, { useEffect, useRef } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { lessons, stepsFor } from './curriculum.js';
import { useProgress } from './context.js';
import CodeText from './code-text.jsx';
import JavaCode from './java-code.jsx';
import Icon from './icon.jsx';
import VisualLab from './visual-lab.jsx';
import { TopBar, FlowSteps, lessonBack, lessonTrail } from './pages.jsx';
import { quizPath, hasQuiz, explored as isExplored, gateLesson, lessonPath, lessonRoute } from './routes.js';

export default function LearningPage() {
  const { lessonId } = useParams();
  const lesson = lessons.find(l => l.id === lessonId);
  if (!lesson) return <main className="page-shell briefing-page"><h1>Lesson not found</h1><Link to="/">Course home</Link></main>;
  // A repair part shares its group's explore and quiz.
  if (gateLesson(lesson) !== lesson) return <Navigate replace to={lessonPath(gateLesson(lesson))} />;
  return <ExplorePage key={lesson.id} lesson={lesson} />;
}

function ExplorePage({ lesson }) {
  const { progress, update } = useProgress(), navigate = useNavigate(), heading = useRef(null);
  const [goal, idea] = stepsFor(lesson);
  const explored = isExplored(lesson, progress), quiz = hasQuiz(lesson);
  useEffect(() => { heading.current?.focus(); }, []);
  const explore = () => { if (!explored) update(p => ({ ...p, activities: { ...p.activities, [lesson.id]: lesson.assessmentVersion } })); };

  return <div className="flow-shell">
    <TopBar back={lessonBack(lesson)} trail={lessonTrail(lesson)}><FlowSteps lesson={lesson} current="explore" /></TopBar>
    <main className="page-shell briefing-page">
      <section className="briefing-slide" aria-labelledby="briefing-title">
        <span className="eyebrow"><CodeText>{goal.label}</CodeText></span>
        <h1 id="briefing-title" ref={heading} tabIndex={-1}><CodeText>{goal.title}</CodeText></h1>
        {goal.text && <p><CodeText>{goal.text}</CodeText></p>}
        <h2><CodeText>{idea.title}</CodeText></h2>
        {idea.text && <p><CodeText>{idea.text}</CodeText></p>}
        {idea.code && <JavaCode>{idea.code}</JavaCode>}
        <VisualLab lesson={lesson} onComplete={explore} done={explored} />
      </section>
      <footer className="briefing-actions">
        <p id="explore-gate" role="status">{explored ? (quiz ? 'Model explored. The quiz is unlocked.' : 'Model explored. The code is unlocked.') : `Explore the model to unlock the ${quiz ? 'quiz' : 'code'}.`}</p>
        <button className="primary" disabled={!explored} aria-describedby="explore-gate" onClick={() => navigate(quiz ? quizPath(lesson) : lessonRoute(lesson, progress))}>{quiz ? 'Take the quiz' : 'Start coding'} <Icon name="arrow-right" /></button>
      </footer>
    </main>
  </div>;
}
