import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@radix-ui/themes';
import { lessons } from './curriculum.js';
import { useProgress } from './context.js';
import { lessonRoute } from './routes.js';
import { missingProjectPrerequisites } from '../shared/project-access.js';
import Icon from './icon.jsx';

export default function ProjectLock({ project }) {
  const { progress } = useProgress();
  const lookup = id => lessons.find(lesson => lesson.id === id);
  const missing = missingProjectPrerequisites(project, progress, lookup);
  return <main className="page-shell dashboard requirements-page">
    <Button asChild variant="ghost" color="gray" className="module-back"><Link to={project.independent ? `/module/${project.unit}` : '/projects'}><Icon name="arrow-left" />{project.independent ? 'Module' : 'Projects'}</Link></Button>
    <header className="dashboard-heading"><span className="project-icon"><Icon name="lock" /></span><h1>{project.title.replaceAll('`', '')}</h1></header>
    <h2>Finish first</h2>
    <ul className="requirement-list">{missing.map(id => {
      const lesson = lookup(id);
      return <li key={id}>{lesson ? <Link to={lessonRoute(lesson, progress)}>{lesson.title.replaceAll('`', '')}<Icon name="arrow-right" /></Link> : <span>Lesson unavailable: {id}</span>}</li>;
    })}</ul>
  </main>;
}
