"""Benchmark Java diagnostics backends for Pip Workshop. Extends client.py.

usage: python3 bench.py <config> <runs> <outdir>
Runs 1 discarded warm-up launch (also creates AppCDS archives) + <runs> measured launches.
Writes <outdir>/<config>_metrics.csv and <outdir>/<config>_diags.csv.
RSS needs `ps`, which the Claude Code sandbox blocks: run this outside the sandbox.
"""
import subprocess, json, sys, time, os, threading, shutil, csv, glob

S = os.path.dirname(os.path.abspath(__file__))
EXT = glob.glob(os.path.expanduser('~/.vscode/extensions/redhat.java-1.56.0-*'))[0]
JRE = glob.glob(EXT + '/jre/*/bin/java')[0]
LAUNCHER = glob.glob(EXT + '/server/plugins/org.eclipse.equinox.launcher_*.jar')[0]
LOMBOK = glob.glob(EXT + '/lombok/lombok-*.jar')[0]
JDK = '/Users/grootbeat/Documents/suhas_java/workshop/runtime/jdk/bin/java'
WS = os.path.join(S, 'lesson_ws')
SRC = os.path.join(WS, 'src')
STUDENT = os.path.join(SRC, 'lesson', 'Student.java')
URI = 'file://' + STUDENT
CLEAN = open(STUDENT).read()
RUNTMP = os.path.join(S, 'runs')

# vscode-java 1.56.0 package.json default for java.jdt.ls.vmargs
DEFAULT_VMARGS = '-XX:+UseParallelGC -XX:GCTimeRatio=4 -XX:AdaptiveSizePolicyWeight=90 -Dsun.zip.disableMemoryMapping=true -Xmx2G -Xms100m -Xlog:disable'
TUNED_VMARGS = '-XX:+UseSerialGC -Xmx256m -XX:TieredStopAtLevel=1 -Dsun.zip.disableMemoryMapping=true -Xlog:disable'
APPCDS_JDT = ['-XX:+UnlockDiagnosticVMOptions', '-XX:+AllowArchivingWithJavaAgent', '-XX:+AutoCreateSharedArchive',
              '-XX:SharedArchiveFile=' + os.path.join(S, 'jdtls-tuned.jsa')]
DIAG_VMARGS = ['-XX:+UseSerialGC', '-Xmx256m', '-XX:TieredStopAtLevel=1']


def jdt_cmd(vmargs, syntax, data, cfg, appcds=False):
    # Mirrors prepareParams() in vscode-java 1.56.0 dist/extension.js (tooling JRE 21, lombok on by default).
    a = [JRE, '--add-modules=ALL-SYSTEM', '--add-opens', 'java.base/java.util=ALL-UNNAMED', '--add-opens',
         'java.base/java.lang=ALL-UNNAMED', '--add-opens', 'java.base/sun.nio.fs=ALL-UNNAMED',
         '-Declipse.application=org.eclipse.jdt.ls.core.id1', '-Dosgi.bundles.defaultStartLevel=4',
         '-Declipse.product=org.eclipse.jdt.ls.core.product', '-DDetectVMInstallationsJob.disabled=true',
         '-Dfile.encoding=UTF-8'] + vmargs.split() + ['-javaagent:' + LOMBOK]
    if not syntax:
        a += ['-XX:+HeapDumpOnOutOfMemoryError', '-XX:HeapDumpPath=' + os.path.dirname(data),
              '-Daether.dependencyCollector.impl=bf']
        if appcds:
            a += APPCDS_JDT
    shutil.rmtree(cfg, ignore_errors=True); os.makedirs(cfg)
    shutil.copy(EXT + '/server/%s/config.ini' % ('config_ss_mac_arm' if syntax else 'config_mac_arm'), cfg)
    return a + ['-jar', LAUNCHER, '-configuration', cfg, '-data', data]


CONFIGS = {
    'jdt_std_default': dict(kind='lsp', vm=DEFAULT_VMARGS, syntax=False, appcds=False, imports=True),
    'jdt_std_tuned': dict(kind='lsp', vm=TUNED_VMARGS, syntax=False, appcds=True, imports=False),
    'jdt_std_tuned_nocds': dict(kind='lsp', vm=TUNED_VMARGS, syntax=False, appcds=False, imports=False),
    'jdt_lightweight': dict(kind='lsp', vm=DEFAULT_VMARGS, syntax=True, appcds=False, imports=True),
    'diag': dict(kind='diag', cds=False),
    'diag_appcds': dict(kind='diag', cds=True),
}

# Each error case: (name, old, new, expected 1-based line of the error)
CASES = [
    ('missing_semicolon', 'int total = 0;', 'int total = 0', 10),
    ('type_mismatch', 'int total = 0;', 'int total = "x";', 10),
    ('undefined_variable', '" ran " + total);', '" ran " + totl);', 15),
    ('missing_return', 'return n * n;', 'int r = n * n;', 24),
    ('nonexistent_robot_method', 'robot.move(laps);', 'robot.jump(laps);', 18),
    ('unclosed_brace', '        }\n        String name', '        String name', 0),  # drop the for-loop's closing brace
    ('wrong_case_system', 'System.out.println(name', 'system.out.println(name', 15),
]
for n, old, new, _ in CASES:
    assert CLEAN.count(old) == 1, n


def tree_rss_mb(root):
    out = subprocess.check_output(['ps', '-A', '-o', 'pid=,ppid=,rss=']).decode().split('\n')
    kids, rss = {}, {}
    for l in out:
        f = l.split()
        if len(f) == 3:
            pid, ppid, r = map(int, f); kids.setdefault(ppid, []).append(pid); rss[pid] = r
    tot, st = 0, [root]
    while st:
        p = st.pop(); tot += rss.get(p, 0); st += kids.get(p, [])
    return tot / 1024


def tree_pids(root):
    out = subprocess.check_output(['ps', '-A', '-o', 'pid=,ppid=']).decode().split()
    kids = {}
    for pid, ppid in zip(out[::2], out[1::2]): kids.setdefault(int(ppid), []).append(int(pid))
    res, st = [], [root]
    while st:
        p = st.pop(); res.append(p); st += kids.get(p, [])
    return res


def footprint_mb(root):
    # macOS phys_footprint (includes compressed pages, which RSS omits under memory pressure)
    import re
    out = subprocess.run(['footprint'] + [str(p) for p in tree_pids(root)], capture_output=True, text=True).stdout
    tot = 0.0
    for v, u in re.findall(r'Footprint: ([\d.]+) (KB|MB|GB)', out):
        tot += float(v) * {'KB': 1 / 1024, 'MB': 1, 'GB': 1024}[u]
    return tot


class Sampler(threading.Thread):
    def __init__(self, pid):
        super().__init__(daemon=True); self.pid = pid; self.peak = 0; self.stop = False
    def run(self):
        while not self.stop:
            try: self.peak = max(self.peak, tree_rss_mb(self.pid))
            except Exception: pass
            time.sleep(0.2)


class LSP:
    def __init__(self, cfg, tag):
        d = os.path.join(RUNTMP, tag); shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
        self.cmd = jdt_cmd(cfg['vm'], cfg['syntax'], os.path.join(d, 'data'), os.path.join(d, 'cfg'), cfg['appcds'])
        self.env = {k: v for k, v in os.environ.items() if k != 'JAVA_TOOL_OPTIONS'}
        self.env['syntaxserver'] = 'true' if cfg['syntax'] else 'false'
        self.imports = cfg['imports']; self.ver = 1; self.msgs = []; self.lock = threading.Condition()
        self.supports_completion = True

    def start(self):
        self.t0 = time.time()
        self.p = subprocess.Popen(self.cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, env=self.env)
        threading.Thread(target=self.reader, daemon=True).start()
        java = {'import': {'maven': {'enabled': self.imports}, 'gradle': {'enabled': self.imports}}}
        self.send({'jsonrpc': '2.0', 'id': 1, 'method': 'initialize', 'params': {
            'processId': os.getpid(), 'rootUri': 'file://' + WS,
            'workspaceFolders': [{'uri': 'file://' + WS, 'name': 'lesson_ws'}],
            'capabilities': {'textDocument': {'completion': {'completionItem': {'snippetSupport': True}}, 'publishDiagnostics': {}},
                             'workspace': {'workspaceFolders': True}},
            'initializationOptions': {'settings': {'java': java}, 'triggerFiles': [URI],
                                      'workspaceFolders': ['file://' + WS]}}})
        self.wait(lambda m: m.get('id') == 1, 300)
        self.send({'jsonrpc': '2.0', 'method': 'initialized', 'params': {}})
        n0 = len(self.msgs)
        self.send({'jsonrpc': '2.0', 'method': 'textDocument/didOpen', 'params': {'textDocument': {'uri': URI, 'languageId': 'java', 'version': 1, 'text': CLEAN}}})
        t, m = self.wait_pub(n0, 300)
        return (t - self.t0) if t else None, m

    def reader(self):
        f = self.p.stdout
        while True:
            h = {}
            while True:
                l = f.readline()
                if not l: return
                l = l.decode().strip()
                if not l: break
                k, v = l.split(':', 1); h[k.lower()] = v.strip()
            m = json.loads(f.read(int(h['content-length'])))
            with self.lock: self.msgs.append((time.time(), m)); self.lock.notify_all()
            if 'id' in m and 'method' in m:
                self.send({'jsonrpc': '2.0', 'id': m['id'], 'result': None})

    def send(self, m):
        b = json.dumps(m).encode(); self.p.stdin.write(b'Content-Length: %d\r\n\r\n' % len(b) + b); self.p.stdin.flush()

    def wait(self, pred, timeout, start=0):
        end = time.time() + timeout
        with self.lock:
            while True:
                for t, m in self.msgs[start:]:
                    if pred(m): return t, m
                if time.time() > end: return None, None
                self.lock.wait(0.5)

    def wait_pub(self, n0, timeout=60):
        return self.wait(lambda m: m.get('method') == 'textDocument/publishDiagnostics' and m['params']['uri'] == URI, timeout, n0)

    def settle(self, quiet=1.0, cap=20):
        # wait until no publishDiagnostics for `quiet` seconds; return last diagnostics seen for Student.java
        end = time.time() + cap
        while time.time() < end:
            n = len(self.msgs); time.sleep(quiet)
            if len(self.msgs) == n: break
        pubs = [m for _, m in self.msgs if m.get('method') == 'textDocument/publishDiagnostics' and m['params']['uri'] == URI]
        return pubs[-1]['params']['diagnostics'] if pubs else None

    def change(self, text):
        n0 = len(self.msgs); self.ver += 1; ts = time.time()
        self.send({'jsonrpc': '2.0', 'method': 'textDocument/didChange', 'params': {'textDocument': {'uri': URI, 'version': self.ver}, 'contentChanges': [{'text': text}]}})
        t, m = self.wait_pub(n0, 60)
        return ((t - ts) * 1000 if t else None), (m['params']['diagnostics'] if m else None)

    def complete(self, text, line, col, rid):
        self.change_nowait(text); ts = time.time()
        self.send({'jsonrpc': '2.0', 'id': rid, 'method': 'textDocument/completion', 'params': {'textDocument': {'uri': URI}, 'position': {'line': line, 'character': col}}})
        t, m = self.wait(lambda m: m.get('id') == rid, 60)
        items = (m or {}).get('result')
        if isinstance(items, dict): items = items.get('items')
        return ((t - ts) * 1000 if t else None), [i['label'] for i in (items or [])]

    def change_nowait(self, text):
        self.ver += 1
        self.send({'jsonrpc': '2.0', 'method': 'textDocument/didChange', 'params': {'textDocument': {'uri': URI, 'version': self.ver}, 'contentChanges': [{'text': text}]}})

    def kill(self):
        # graceful shutdown like VS Code does, so -XX:+AutoCreateSharedArchive can write its archive at exit
        try:
            self.send({'jsonrpc': '2.0', 'id': 999, 'method': 'shutdown', 'params': None})
            self.wait(lambda m: m.get('id') == 999, 30)
            self.send({'jsonrpc': '2.0', 'method': 'exit', 'params': None})
            self.p.wait(60)
        except Exception:
            self.p.kill(); self.p.wait()


class Diag:
    """Drives DiagD.java (javac in-process daemon). Diagnostics mapped to LSP shape (0-based line, severity 1=error 2=warning)."""
    def __init__(self, cfg, tag):
        self.cmd = [JDK] + DIAG_VMARGS
        if cfg['cds']: self.cmd += ['-XX:+AutoCreateSharedArchive', '-XX:SharedArchiveFile=' + os.path.join(S, 'diagd-dyn.jsa')]
        self.cmd += ['-cp', os.path.join(S, 'diagd.jar'), 'DiagD', SRC]
        self.env = {k: v for k, v in os.environ.items() if k != 'JAVA_TOOL_OPTIONS'}
        self.supports_completion = False; self.last = None

    def start(self):
        self.t0 = time.time()
        self.p = subprocess.Popen(self.cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, env=self.env)
        d = self.req(CLEAN)
        return time.time() - self.t0, d

    def req(self, text):
        b = text.encode(); self.p.stdin.write(b'%d\n' % len(b) + b); self.p.stdin.flush()
        r = json.loads(self.p.stdout.readline())['diagnostics']
        sev = {'ERROR': 1, 'WARNING': 2, 'MANDATORY_WARNING': 2}
        self.last = [{'range': {'start': {'line': d['line'] - 1, 'character': d['col'] - 1}}, 'severity': sev.get(d['severity'], 3), 'message': d['message']} for d in r]
        return self.last

    def change(self, text):
        ts = time.time(); d = self.req(text); return (time.time() - ts) * 1000, d

    def settle(self, **k): return self.last

    def kill(self):
        self.p.stdin.close()  # EOF -> DiagD returns from main -> normal JVM exit (writes CDS archive)
        try: self.p.wait(60)
        except Exception: self.p.kill(); self.p.wait()


def edited(old, new): return CLEAN.replace(old, new)


def run_once(name, cfg, tag, M, D, run):
    drv = (LSP if cfg['kind'] == 'lsp' else Diag)(cfg, tag)
    cold, _ = drv.start()
    samp = Sampler(drv.p.pid); samp.start()
    M.append([name, run, 'cold_start_first_diag', '', '%.3f' % cold if cold else '', 's'])
    # launch -> first publish that actually contains the type error (proves semantic checking is live)
    lat, d = drv.change(edited('int total = 0;', 'int total = "x";'))
    if cfg['kind'] == 'lsp' and d is not None and not any(x.get('severity') == 1 for x in d):
        t, _ = drv.wait(lambda m: m.get('method') == 'textDocument/publishDiagnostics' and m['params']['uri'] == URI and any(x.get('severity') == 1 for x in m['params']['diagnostics']), 120)
        tt = (t - drv.t0) if t else None
    else:
        tt = time.time() - drv.t0 if d is not None and any(x.get('severity') == 1 for x in d) else None
    M.append([name, run, 'launch_to_first_semantic_error', 'type_mismatch', '%.3f' % tt if tt else '', 's'])
    drv.change(CLEAN); drv.settle()
    for measured in (False, True):
        for cname, old, new, line in CASES:
            lat, first = drv.change(edited(old, new))
            final = drv.settle()
            drv.change(CLEAN); drv.settle()
            if not measured: continue
            M.append([name, run, 'edit_latency', cname, '%.1f' % lat if lat is not None else '', 'ms'])
            for phase, ds in (('first', first), ('final', final)):
                for x in ds or []:
                    D.append([name, run, cname, phase, x.get('severity'), x['range']['start']['line'] + 1, x['message']])
                if not ds: D.append([name, run, cname, phase, '', '', '(none)'])
    if drv.supports_completion:
        lines = CLEAN.split('\n'); ln = [i for i, l in enumerate(lines) if 'String name = "pip";' in l][0]
        for rid, (cname, frag) in enumerate((('string_dot', '"abc".'), ('math_dot', 'Math.')), 100):
            text = '\n'.join(lines[:ln + 1] + ['        ' + frag] + lines[ln + 1:])
            lat, items = drv.complete(text, ln + 1, 8 + len(frag), rid)
            M.append([name, run, 'completion_latency', cname, '%.1f' % lat if lat is not None else '', 'ms'])
            M.append([name, run, 'completion_items', cname, len(items), 'count'])
            M.append([name, run, 'completion_top5', cname, '|'.join(items[:5]), 'labels'])
            drv.change(CLEAN); drv.settle()
    clean = drv.settle()
    for x in clean or []:
        D.append([name, run, 'clean', 'final', x.get('severity'), x['range']['start']['line'] + 1, x['message']])
    if not clean: D.append([name, run, 'clean', 'final', '', '', '(none)'])
    time.sleep(10)
    M.append([name, run, 'idle_rss', '', '%.1f' % tree_rss_mb(drv.p.pid), 'MB'])
    M.append([name, run, 'idle_footprint', '', '%.1f' % footprint_mb(drv.p.pid), 'MB'])
    samp.stop = True; samp.join()
    M.append([name, run, 'peak_rss', '', '%.1f' % samp.peak, 'MB'])
    drv.kill()


def main():
    name, runs, outdir = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    cfg = CONFIGS[name]; os.makedirs(outdir, exist_ok=True)
    M, D = [], []
    run_once(name, cfg, name + '_warmup', [], [], 0)  # discarded; creates CDS archives, warms OS file cache
    for r in range(1, runs + 1):
        run_once(name, cfg, '%s_%d' % (name, r), M, D, r)
        print(name, 'run', r, 'done', flush=True)
    with open(os.path.join(outdir, name + '_metrics.csv'), 'w', newline='') as f:
        csv.writer(f).writerows([['config', 'run', 'metric', 'case', 'value', 'unit']] + M)
    with open(os.path.join(outdir, name + '_diags.csv'), 'w', newline='') as f:
        csv.writer(f).writerows([['config', 'run', 'case', 'phase', 'severity', 'line', 'message']] + D)


if __name__ == '__main__':
    main()
