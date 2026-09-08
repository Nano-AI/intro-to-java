# Intro to Java

A beginner Java course as a small website. Each week has a page to read, a zip of
starter files to open in jGRASP, and problems with progressive hints.

Course order follows [UW CSE 142](https://courses.cs.washington.edu/courses/cse142/22sp/handouts.shtml).

**Site:** https://nano-ai.github.io/intro-to-java/

## Weeks

| | |
|---|---|
| 0 | Running your first program. jGRASP, compile, run, read an error. |
| 1 | Variables and types. |
| 2 | Maths, casting, and user input with Scanner. |
| 3 | Conditionals, plus the Battle Sim project. |
| 4 | Methods: parameters and return values. |

## What is here

```
docs/                 the website, served by GitHub Pages
  index.html          hub
  week-00..04.html    one page per week
  app.js              syntax highlighting, scroll spy, checklists
  quiz.js             pick / fill-in-the-blank / drag-to-order exercises
  battle-sim.html     week 3 project
  style.css           the whole stylesheet
  starters/week-N/    source of truth for the starter files
  downloads/*.zip     what students actually click
  print/*.pdf         printable version of week 3
print/*.tex           LaTeX source for the printable version
make-zips.sh          rebuilds docs/downloads/ from docs/starters/
```

No build step, no dependencies, no CI. Static pages and one stylesheet.

## Turning on the site

Settings, then Pages, then set Source to `Deploy from a branch`, branch `master`,
folder `/docs`. Live in about a minute, and it rebuilds on every push.

## After editing a starter file

```
./make-zips.sh
```

Zips are built from `docs/starters/week-N/`, so edit the `.java` file there and
rerun the script. Committing a stale zip is the easiest mistake to make here.

## Adding a week

1. Copy `docs/week-03.html` to `docs/week-04.html` and rewrite the content.
2. Put starter files in `docs/starters/week-4/`, then run `./make-zips.sh`.
3. Add a card to the list in `docs/index.html`.
4. Point the previous week's `.next` link at the new page.

## Building the printable PDF

```
cd print
pdflatex week-03-conditionals.tex && pdflatex week-03-conditionals.tex
cp week-03-conditionals.pdf ../docs/print/
```

Twice, because page references settle on the second pass. Needs a full TeX Live
or MacTeX (`libertinus`, `sourcesanspro`, `inconsolata`, `tcolorbox`, `titlesec`).

## Credit

Battle Sim is adapted from CSE 142's assignment 4, Admissions. The rest is original.
