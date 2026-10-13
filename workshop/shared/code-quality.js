export function passedCorrectness(result) {
  if (!result) return false;
  const passed = result.kind === 'game'
    ? result.worlds?.length > 0 && result.worlds.every(world => world.passed === true)
    : result.passed === true;
  const failed = result.stage || result.error || result.passed === false || result.diagnostics?.some(d => d.severity === 'error') ||
    result.sourceChecks?.some(check => !check.passed) || result.worlds?.some(world => !world.passed);
  return Boolean(passed && !failed);
}

// Quality is current-run evidence, never a replacement for saved completion.
export function codeQuality(result, { graded = false, lint = 'unavailable' } = {}) {
  const warningCount = (result.diagnostics || []).filter(d => d.severity === 'warning').length;
  const failed = result.stage || result.error || result.passed === false || result.diagnostics?.some(d => d.severity === 'error') ||
    result.sourceChecks?.some(check => !check.passed) || result.worlds?.some(world => !world.passed);
  const status = !graded ? 'unchecked' : failed ? 'needs-work' : !passedCorrectness(result) || lint !== 'complete' ? 'unchecked' : warningCount ? 'warnings' : 'perfect';
  return { status, lint, warningCount };
}
