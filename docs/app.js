/* Shared behaviour for every page.
   1. Syntax highlighting for all Java code
   2. Rail scroll spy
   3. Checklist persistence

   Code block convention:
     <pre>            Java, highlighted automatically
     <pre class="run"> terminal transcript, <b> marks what the user types
     <code>            inline Java, highlighted automatically
*/

(function () {
  'use strict';

  /* ---------- 1. highlighting ---------- */

  var TOKEN = new RegExp(
    '(//[^\\n]*)' +                                   // comment
    '|("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\')' + // string or char
    '|\\b(if|else|while|for|do|switch|case|break|return|new|import|package|' +
    'public|private|protected|static|final|void|class|extends|implements|' +
    'int|double|float|long|short|byte|boolean|char|true|false|null|this)\\b' +
    '|\\b(String|System|Scanner|Math|Integer|Double|Random|Object)\\b' +
    '|\\b(\\d+\\.?\\d*)\\b',
    'g'
  );

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function paint(src) {
    return esc(src).replace(TOKEN, function (m, c, str, kw, type, num) {
      if (c) return '<span class="c">' + c + '</span>';
      if (str) return '<span class="s">' + str + '</span>';
      if (kw) return '<span class="k">' + kw + '</span>';
      if (type) return '<span class="t">' + type + '</span>';
      return '<span class="n">' + num + '</span>';
    });
  }

  // Block code. Skip transcripts, they are not Java and carry their own markup.
  document.querySelectorAll('pre:not(.run)').forEach(function (pre) {
    var el = pre.querySelector('code') || pre;
    el.innerHTML = paint(el.textContent);
  });

  // Inline code, unless it sits inside a transcript.
  document.querySelectorAll('code').forEach(function (el) {
    if (el.closest('pre')) return;
    el.innerHTML = paint(el.textContent);
  });

  /* ---------- 2. rail scroll spy ---------- */

  var rail = document.querySelector('.rail');
  if (rail && 'IntersectionObserver' in window) {
    var links = {};
    rail.querySelectorAll('a[href^="#"]').forEach(function (a) {
      links[a.getAttribute('href').slice(1)] = a;
    });

    var targets = Object.keys(links)
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);

    if (targets.length) {
      var seen = {};
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { seen[e.target.id] = e.isIntersecting; });

        var current = null;
        targets.forEach(function (t) { if (seen[t.id] && !current) current = t.id; });

        if (!current) {
          // Nothing on screen: fall back to the last heading scrolled past.
          targets.forEach(function (t) {
            if (t.getBoundingClientRect().top < 100) current = t.id;
          });
        }

        Object.keys(links).forEach(function (id) {
          links[id].classList.toggle('now', id === current);
        });
      }, { rootMargin: '-80px 0px -55% 0px', threshold: 0 });

      targets.forEach(function (t) { spy.observe(t); });
    }
  }

  /* ---------- 3. checklists ---------- */

  var list = document.querySelector('.check');
  if (list) {
    var page = location.pathname.split('/').pop() || 'index';
    list.querySelectorAll('input[type=checkbox]').forEach(function (box) {
      var key = page + ':' + box.id;
      try {
        box.checked = localStorage.getItem(key) === '1';
      } catch (e) { /* private browsing */ }
      box.addEventListener('change', function () {
        try {
          localStorage.setItem(key, box.checked ? '1' : '0');
        } catch (e) { /* nothing to do */ }
      });
    });
  }
}());
