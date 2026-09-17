import confetti from 'canvas-confetti';

export function createEffects(canvas, notice, workspace) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cannon = confetti.create(canvas, { resize: true });
  let enabled = true, timer, shake;
  const colors = () => {
    const tokens = getComputedStyle(document.documentElement);
    return ['--green', '--yellow', '--panel'].map(name => tokens.getPropertyValue(name).trim());
  };
  const clear = () => {
    cannon.reset(); clearTimeout(timer); shake?.cancel(); notice.hidden = true;
  };
  const onReducedMotion = () => { if (reducedMotion.matches) clear(); };
  reducedMotion.addEventListener('change', onReducedMotion);
  return {
    get motionEnabled() { return enabled && !reducedMotion.matches; },
    set enabled(value) { enabled = value; if (!value) clear(); },
    clear,
    destroy() { clear(); reducedMotion.removeEventListener('change', onReducedMotion); },
    success(title, reward) {
      clear();
      if (!enabled) return;
      notice.querySelector('strong').textContent = title;
      notice.querySelector('span').textContent = reward;
      notice.hidden = false;
      timer = setTimeout(() => { notice.hidden = true; }, 3500);
      if (reducedMotion.matches) return;
      const options = { particleCount: 65, spread: 65, startVelocity: 36, gravity: .95, ticks: 150, colors: colors(), disableForReducedMotion: true };
      cannon({ ...options, angle: 65, origin: { x: .25, y: .65 } });
      cannon({ ...options, angle: 115, origin: { x: .85, y: .65 } });
    },
    crash() {
      clear();
      if (!enabled || reducedMotion.matches) return;
      shake = workspace.animate([
        { transform: 'translate(0, 0)' }, { transform: 'translate(-5px, 2px)' },
        { transform: 'translate(5px, -2px)' }, { transform: 'translate(-3px, 1px)' },
        { transform: 'translate(2px, -1px)' }, { transform: 'translate(0, 0)' },
      ], { duration: 320, easing: 'ease-out' });
    },
  };
}
