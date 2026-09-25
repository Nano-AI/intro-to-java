"""Summarize results/*.csv into markdown tables + combined CSVs. usage: python3 summarize.py results outdir"""
import csv, glob, os, sys, statistics as st
from collections import defaultdict

res, out = sys.argv[1], sys.argv[2]
ORDER = ['jdt_std_default', 'jdt_std_tuned', 'jdt_std_tuned_nocds', 'jdt_lightweight', 'diag', 'diag_appcds']
M, D = [], []
for c in ORDER:
    for f, L in (('_metrics.csv', M), ('_diags.csv', D)):
        p = os.path.join(res, c + f)
        if os.path.exists(p): L += list(csv.DictReader(open(p)))
os.makedirs(out, exist_ok=True)
for name, rows in (('java-diagnostics-benchmark-raw.csv', M), ('java-diagnostics-benchmark-diagnostics.csv', D)):
    with open(os.path.join(out, name), 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)

vals = defaultdict(list)
for r in M:
    if r['unit'] in ('s', 'ms', 'MB', 'count') and r['value'] != '':
        vals[(r['config'], r['metric'], r['case'])].append(float(r['value']))
    elif r['unit'] in ('s', 'ms') and r['value'] == '':
        vals[(r['config'], r['metric'], r['case'], 'missing')].append(1)

def agg(c, m, case=''):
    v = vals.get((c, m, case))
    if not v: return None
    return st.median(v), min(v), max(v), len(v)

def fmt(a, nd=0):
    if not a: return 'not measured'
    f = '%.' + str(nd) + 'f'
    return (f + ' (' + f + '–' + f + ', n=%d)') % a

def delta(c, m, case=''):
    a, b = agg(c, m, case), agg('jdt_std_default', m, case)
    if c == 'jdt_std_default' or not a or not b: return ''
    return ' **%+.0f%%**' % ((a[0] - b[0]) / b[0] * 100)

cases = sorted({r['case'] for r in M if r['metric'] == 'edit_latency'}, key=lambda x: x)
lines = ['| Metric | ' + ' | '.join(ORDER) + ' |', '|---' * (len(ORDER) + 1) + '|']
rowspec = [('Cold start, launch → first diagnostics (s)', 'cold_start_first_diag', '', 2),
           ('Launch → first semantic error shown (s)', 'launch_to_first_semantic_error', 'type_mismatch', 2),
           ('Idle RSS, process tree (MB)', 'idle_rss', '', 0),
           ('Idle phys_footprint (MB)', 'idle_footprint', '', 0),
           ('Peak RSS, process tree (MB)', 'peak_rss', '', 0)]
rowspec += [('Edit latency: %s (ms)' % c, 'edit_latency', c, 0) for c in cases]
rowspec += [('Completion `"abc".` latency (ms)', 'completion_latency', 'string_dot', 0),
            ('Completion `"abc".` items', 'completion_items', 'string_dot', 0),
            ('Completion `Math.` latency (ms)', 'completion_latency', 'math_dot', 0),
            ('Completion `Math.` items', 'completion_items', 'math_dot', 0)]
for label, m, case, nd in rowspec:
    cells = []
    for c in ORDER:
        a = agg(c, m, case)
        miss = len(vals.get((c, m, case, 'missing'), []))
        cell = fmt(a, nd) + delta(c, m, case) if a else ('no result in %d runs' % miss if miss else 'not measured')
        if a and miss: cell += ' (%d runs no result)' % miss
        cells.append(cell)
    lines.append('| %s | %s |' % (label, ' | '.join(cells)))
print('\n'.join(lines))

# Correctness matrix, based on the settled ("final") diagnostics of each case, per run.
print('\n\n### Correctness (errors reported on/near the expected line, per run; message = most common)\n')
EXPECT = {'missing_semicolon': 10, 'type_mismatch': 10, 'undefined_variable': 15, 'missing_return': (22, 24),
          'nonexistent_robot_method': 18, 'unclosed_brace': None, 'wrong_case_system': 15}
by = defaultdict(list)
for r in D: by[(r['config'], r['case'], r['phase'], r['run'])].append(r)
print('| Case | ' + ' | '.join(ORDER) + ' |'); print('|---' * (len(ORDER) + 1) + '|')
for case in list(EXPECT) + ['clean']:
    cells = []
    for c in ORDER:
        runs = sorted({k[3] for k in by if k[0] == c and k[1] == case and k[2] == 'final'})
        if not runs: cells.append('not measured'); continue
        hits, msgs, extra = 0, defaultdict(int), defaultdict(int)
        for rn in runs:
            rows = [x for x in by[(c, case, 'final', rn)] if x['message'] != '(none)']
            exp = EXPECT.get(case)
            errs = [x for x in rows if x['severity'] == '1']
            ok = [x for x in errs if exp is None or int(x['line']) in (exp if isinstance(exp, tuple) else (exp,))]
            if case == 'clean':
                for x in rows: extra['sev%s L%s: %s' % (x['severity'], x['line'], x['message'].split('\n')[0])] += 1
                hits += not errs
                continue
            hits += bool(ok)
            for x in ok[:1]: msgs[x['message'].split('\n')[0] + (' (L%s)' % x['line'])] += 1
            for x in rows:
                if x not in ok[:1]: extra['sev%s L%s: %s' % (x['severity'], x['line'], x['message'].split('\n')[0])] += 1
        top = max(msgs, key=msgs.get) if msgs else '—'
        cell = ('%d/%d no errors' % (hits, len(runs))) if case == 'clean' else ('%d/%d `%s`' % (hits, len(runs), top))
        if extra: cell += '; also: ' + '; '.join('`%s` ×%d' % kv for kv in extra.items())
        cells.append(cell.replace('|', '\\|'))
    print('| %s | %s |' % (case, ' | '.join(cells)))

# first vs final mismatch note
diff = defaultdict(int)
for (c, case, ph, rn), rows in by.items():
    if ph != 'first': continue
    f = sorted((x['severity'], x['line'], x['message']) for x in rows)
    g = sorted((x['severity'], x['line'], x['message']) for x in by.get((c, case, 'final', rn), []))
    if f != g: diff[(c, case)] += 1
print('\nFirst publish differed from settled diagnostics:', dict(diff) or 'never')
