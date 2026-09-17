import * as vscode from 'vscode';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { watch } from 'node:fs';
import { lessons, modules } from '../src/curriculum.js';
import { findGame, games } from '../src/games/index.js';
import { practicePath } from '../src/routes.js';
import { ProgressStore } from './state.js';
import { assertCoding, findJdk, lessonPackage, runGame, runLesson, withPackage } from './runner.js';
import { GAME_REQUESTS, RUN_MODES, gamePackage, gameResult, gameRoute, gameSourcePath, mergeGameRecord } from '../shared/game-contract.js';

let service;
export async function activate(context) {
  const output = vscode.window.createOutputChannel('Pip Workshop');
  const diagnostics = vscode.languages.createDiagnosticCollection('Pip run');
  const storage = context.storageUri || context.globalStorageUri;
  const store = new ProgressStore(storage.fsPath);
  await store.load();
  let panel, panelRoute, currentLesson, currentGame, activeRun, lastResult, latestRunId, jdkPromise;
  const rates = new Map();
  let writes = Promise.resolve();
  let syncingEditor = false;
  let openingLesson = 0;
  const report = error => { output.appendLine(String(error.stack || error)); vscode.window.showErrorMessage(`Pip: ${error.message || error}`); };
  const broadcast = (event, data) => panel?.webview.postMessage({ event, data });
  const patch = async data => { const value = await store.patch(data); broadcast('progress', value); return value; };
  function getLesson(id) { const lesson = lessons.find(l => l.id === id); if (!lesson) throw new Error('Unknown lesson. Open it from the Pip course page.'); return lesson; }
  function workspaceRoot() {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) throw new Error('Open a learning folder in VS Code first (File → Open Folder), then start this lesson.');
    if (!['file','vscode-remote'].includes(folder.uri.scheme)) throw new Error('Pip requires a local filesystem workspace.');
    return folder.uri;
  }
  function lessonUri(id) { getLesson(id); return vscode.Uri.joinPath(workspaceRoot(), 'src', 'pip', 'lessons', id.replaceAll('-', '_'), 'Student.java'); }
  function getGame(id) { const game = findGame(id); if (!game) throw new Error('Unknown game. Open it from the Pip course page.'); return game; }
  function gameUri(id) { getGame(id); return vscode.Uri.joinPath(workspaceRoot(), ...gameSourcePath(id).split('/')); }
  function documentGame(document) {
    if (!document?.uri || !vscode.workspace.workspaceFolders?.length) return;
    return games.find(game => gameUri(game.id).toString() === document.uri.toString());
  }
  function documentLesson(document) {
    if (!document?.uri || !vscode.workspace.workspaceFolders?.length) return;
    return lessons.find(l => lessonUri(l.id).toString() === document.uri.toString() || (l.kind === 'robot' && vscode.Uri.joinPath(lessonUri(l.id),'..','Robot.java').toString() === document.uri.toString()));
  }
  async function jdk() {
    if (!jdkPromise) {
      const java = vscode.workspace.getConfiguration('java');
      const runtimes = java.get('configuration.runtimes', []);
      jdkPromise = findJdk([vscode.workspace.getConfiguration('pip').get('javaHome'), ...runtimes.filter(r => r.default).map(r => r.path), java.get('jdt.ls.java.home'), ...runtimes.map(r => r.path)]).catch(error => { jdkPromise = null; throw error; });
    }
    return jdkPromise;
  }
  async function runtimeInfo() {
    let runtime, error;
    try { runtime = await jdk(); } catch (e) { error = e.message; }
    return { extension: true, java: Boolean(runtime), jdk: runtime?.version, javaHome: runtime?.home, error, workspace: vscode.workspace.workspaceFolders?.[0]?.name, storage: store.file, version: context.extension.packageJSON.version, trusted: vscode.workspace.isTrusted, javaSupport: Boolean(vscode.extensions.getExtension('redhat.java')) };
  }
  async function html(webview, route) {
    const nonce = randomBytes(18).toString('base64');
    let page = await readFile(path.join(context.extensionPath, 'dist/index.html'), 'utf8');
    page = page.replace(/(?:src|href)="\.\/([^\"]+)"/g, (attribute, file) => attribute.replace(`./${file}`, webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist', file)).toString()));
    const policy = `default-src 'none'; script-src ${webview.cspSource} 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data:; font-src ${webview.cspSource} data:; connect-src ${webview.cspSource}; worker-src blob:;`;
    return page.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${policy}"><script nonce="${nonce}">window.__PIP_INITIAL_ROUTE__=${JSON.stringify(route).replaceAll('<','\\u003c')};</script>`);
  }
  async function showPanel(route, column = vscode.ViewColumn.One) {
    panelRoute = route;
    if (!panel) {
      panel = vscode.window.createWebviewPanel('pip.workshop', 'Pip Workshop', { viewColumn: column, preserveFocus: column === vscode.ViewColumn.Two }, { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist')] });
      panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'app-icon.svg');
      panel.onDidDispose(() => { activeRun?.controller.abort(); panel = undefined; });
      panel.webview.onDidReceiveMessage(async message => {
        if (!message || typeof message.id !== 'number' || typeof message.method !== 'string') return;
        const receiver = panel;
        try { const data = await handle(message.method, message.params || {}); if (receiver === panel) receiver?.webview.postMessage({ id: message.id, data }); }
        catch (error) { output.appendLine(error.message); if (receiver === panel) receiver?.webview.postMessage({ id: message.id, error: error.message }); }
      });
      panel.webview.html = await html(panel.webview, route);
    } else { panel.reveal(column, column === vscode.ViewColumn.Two); await broadcast('navigate', { route }); }
    panel.title = /^\/(?:lesson|practice|project|assignment)\//.test(route) ? `Pip · ${getLesson(route.split('/')[2]).title}` : route.startsWith('/game/') ? `Pip · ${getGame(route.split('/')[2]).title}` : route.startsWith('/learn/') ? 'Pip · Lesson' : route.startsWith('/quiz/') ? 'Pip · Quiz' : 'Pip · Java foundations';
  }
  // The Java extension needs an explicit source root in a newly created learning workspace.
  // Scope it to this workspace; never alter the student's global Java settings.
  async function ensureSourceRoot() {
    const project = vscode.workspace.getConfiguration('java.project', workspaceRoot());
    const sourcePaths = project.get('sourcePaths', []);
    if (!sourcePaths.length) {
      if (vscode.workspace.workspaceFolders.length > 1) throw new Error('Open a single-folder learning workspace, or configure java.project.sourcePaths to include src before starting Pip.');
      await project.update('sourcePaths', ['src'], vscode.ConfigurationTarget.Workspace);
    }
    else if (!sourcePaths.includes('src')) throw new Error('This workspace uses a different Java source root. Open a dedicated Pip learning folder, or include src in java.project.sourcePaths.');
  }
  async function ensureLesson(id) {
    if (!vscode.workspace.isTrusted) throw new Error('Trust this learning workspace before Pip creates or runs Java programs.');
    // A concept lesson has no Java at all, and this is the only place that
    // creates a lesson file or its source root.
    const lesson = assertCoding(getLesson(id)), uri = lessonUri(id), directory = path.dirname(uri.fsPath), namespace = lessonPackage(id);
    await mkdir(directory, { recursive: true });
    await ensureSourceRoot();
    try { await writeFile(uri.fsPath, withPackage(store.data.drafts[id] || lesson.starter, namespace), { flag: 'wx' }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    if (lesson.kind === 'robot') {
      const support = withPackage(await readFile(path.join(context.extensionPath, 'Robot.java'), 'utf8'), namespace);
      try { await writeFile(path.join(directory, 'Robot.java'), support, { flag: 'wx' }); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
    }
    return vscode.workspace.openTextDocument(uri);
  }
  async function openLesson(id, reveal = true) {
    openingLesson++;
    try {
      const document = await ensureLesson(id);
      currentLesson = id; currentGame = undefined;
      if (reveal) {
        await showPanel(practicePath(getLesson(id)), vscode.ViewColumn.Two);
        await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.One, preview: false, preserveFocus: false });
      }
      return { lessonId: id, uri: document.uri.toString(), file: vscode.workspace.asRelativePath(document.uri), source: document.getText(), result: lastResult?.lessonId === id ? lastResult : null };
    } finally {openingLesson--;}
  }
  function publishDiagnostics(document, version, items) {
    if (document.version !== version) return;
    diagnostics.set(document.uri, (items || []).map(item => {
      const line = Math.max(0, Math.min(document.lineCount - 1, item.line - 1));
      const start = Math.min(document.lineAt(line).text.length, item.column);
      const diagnostic = new vscode.Diagnostic(new vscode.Range(line, start, line, Math.min(start + 1, document.lineAt(line).text.length)), item.message, item.severity === 'warning' ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Error);
      diagnostic.source = 'Pip javac'; return diagnostic;
    }));
  }
  async function run(id = documentLesson(vscode.window.activeTextEditor?.document)?.id || currentLesson, controlHz, customInput) {
    if (activeRun) throw new Error('A program is running. Use Pip: Stop Run before starting another.');
    if (!vscode.workspace.isTrusted) throw new Error('Trust the workspace before running Java.');
    const lesson = getLesson(id), controller = new AbortController(), runId = randomBytes(8).toString('hex');
    const custom = customInput !== undefined;
    activeRun = { controller, lessonId: id, runId }; latestRunId = runId; if (!custom) lastResult = undefined;
    broadcast('run.started', { lessonId: id, runId, custom });
    try {
      const document = await ensureLesson(id), runtime = await jdk();
      if (controller.signal.aborted) throw new Error('Run cancelled.');
      controlHz ??= rates.get(id) ?? (lesson.mission < 2 ? 1 : 20);
      if (!await document.save()) throw new Error('The Java file could not be saved. The edits are still in the editor.');
      const version = document.version, source = document.getText();
      output.appendLine(`Running ${vscode.workspace.asRelativePath(document.uri)} with ${runtime.version}`);
      const result = await runLesson({ lesson, source, jdk: runtime, resourceRoot: context.extensionPath, cacheRoot: path.join(context.globalStorageUri.fsPath, 'runs'), controlHz, signal: controller.signal, customInput });
      publishDiagnostics(document, version, result.diagnostics);
      if (result.passed && !controller.signal.aborted) await patch({ completed: [...new Set([...store.data.completed, id])],assessments:{[id]:lesson.assessmentVersion} });
      await patch({ drafts: { [id]: document.getText() } });
      const packet = { lessonId: id, runId, result, sourceVersion: version, custom };
      if (!custom) lastResult = packet;
      output.appendLine(result.error || (custom ? 'Custom input run finished.' : result.passed ? 'All checks passed.' : 'A check failed.'));
      broadcast('run.finished', packet); return packet;
    } catch (error) { broadcast('run.finished', { lessonId: id, runId, custom, result: { error: error.message, stage: 'runtime' } }); throw error; }
    finally { activeRun = undefined; }
  }
  async function restore(id) {
    const lesson = getLesson(id), document = await ensureLesson(id);
    const choice = await vscode.window.showWarningMessage('Replace this lesson’s code with the starter? Undo restores it in VS Code.', { modal: true }, 'Restore starter');
    if (choice !== 'Restore starter') return { restored: false };
    const edit = new vscode.WorkspaceEdit(); edit.replace(document.uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), withPackage(lesson.starter, lessonPackage(id)));
    await vscode.workspace.applyEdit(edit); await document.save(); return { restored: true };
  }

  // ------------------------------------------------------------- games
  async function ensureGame(id) {
    if (!vscode.workspace.isTrusted) throw new Error('Trust this learning workspace before Pip creates or runs Java programs.');
    const game = getGame(id), uri = gameUri(id);
    await mkdir(path.dirname(uri.fsPath), { recursive: true });
    await ensureSourceRoot();
    try { await writeFile(uri.fsPath, withPackage(store.data.drafts[id] || game.starter, gamePackage(id)), { flag: 'wx' }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    return vscode.workspace.openTextDocument(uri);
  }
  async function openGame(id, reveal = true) {
    openingLesson++;
    try {
      const document = await ensureGame(id);
      currentGame = id; currentLesson = undefined;
      if (reveal) {
        await showPanel(gameRoute(id), vscode.ViewColumn.Two);
        await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.One, preview: false, preserveFocus: false });
      }
      return { gameId: id, uri: document.uri.toString(), file: vscode.workspace.asRelativePath(document.uri), source: document.getText(), result: lastResult?.gameId === id ? lastResult : null };
    } finally { openingLesson--; }
  }
  // Graded and custom-input runs take the same path and differ only by `mode`,
  // so an experiment can never be mistaken for an attempt. A run holds the
  // process-wide lock for all of its worlds and reports each one as it lands.
  async function playGame(id, mode = RUN_MODES.graded, customInput) {
    if (activeRun) throw new Error('A program is running. Use Pip: Stop Run before starting another.');
    const game = getGame(id), controller = new AbortController(), runId = randomBytes(8).toString('hex');
    const custom = mode === RUN_MODES.custom;
    const savedStars = store.data.games?.[id]?.stars ?? 0;
    activeRun = { controller, gameId: id, runId }; latestRunId = runId;
    // A newer run supersedes an older one: a late result is dropped rather than
    // broadcast, saved, or restored.
    const current = () => latestRunId === runId;
    const finish = packet => { if (current()) { if (!custom) lastResult = packet; broadcast('run.finished', packet); } return packet; };
    broadcast('run.started', { gameId: id, runId, mode });
    // Setup failures are not student failures, so they carry their own stage.
    let stage = 'setup';
    try {
      if (!vscode.workspace.isTrusted) throw new Error('Trust the workspace before running Java.');
      const document = await ensureGame(id), runtime = await jdk();
      if (controller.signal.aborted) { stage = 'runtime'; throw new Error('Run cancelled.'); }
      if (!await document.save()) throw new Error('The Java file could not be saved. The edits are still in the editor.');
      stage = null;
      const version = document.version, source = document.getText();
      output.appendLine(`Running ${vscode.workspace.asRelativePath(document.uri)} with ${runtime.version}`);
      const result = await runGame({
        game, source, jdk: runtime, resourceRoot: context.extensionPath,
        cacheRoot: path.join(context.globalStorageUri.fsPath, 'runs'), signal: controller.signal,
        mode, customInput, runId,
        onWorld: world => { if (current()) broadcast('run.progress', { gameId: id, runId, world }); },
      });
      publishDiagnostics(document, version, result.diagnostics);
      await patch({ drafts: { [id]: document.getText() } });
      // Cancellation and infrastructure errors leave the saved record untouched.
      if (!custom && !result.stage && !controller.signal.aborted && current()) {
        const record = mergeGameRecord(store.data.games?.[id], { stars: result.earnedStars, best: result.best, updatedAt: new Date().toISOString() }, id);
        await patch({ games: { ...store.data.games, [id]: record } });
      }
      output.appendLine(result.error || (custom ? 'Input experiment finished.' : `Earned ${result.earnedStars} of 3 stars.`));
      return finish({ gameId: id, runId, mode, sourceVersion: version, result: { ...result, savedStars: store.data.games?.[id]?.stars ?? savedStars } });
    } catch (error) {
      finish({ gameId: id, runId, mode, result: gameResult({ gameId: id, runId, mode, earnedStars: custom ? null : 0, savedStars, stage: stage || 'runtime', error: error.message }) });
      throw error;
    } finally { activeRun = undefined; }
  }
  async function restoreGame(id) {
    const game = getGame(id), document = await ensureGame(id);
    const choice = await vscode.window.showWarningMessage('Replace this game\u2019s code with the starter? Undo restores it in VS Code.', { modal: true }, 'Restore starter');
    if (choice !== 'Restore starter') return { restored: false };
    const edit = new vscode.WorkspaceEdit(); edit.replace(document.uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), withPackage(game.starter, gamePackage(id)));
    await vscode.workspace.applyEdit(edit); await document.save(); return { restored: true };
  }
  async function exportProgress() {
    const uri = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.joinPath(vscode.workspace.workspaceFolders?.[0]?.uri || context.globalStorageUri, 'pip-progress.json'), filters: { 'Pip progress': ['json'] } });
    if (!uri) return 'Export cancelled.';
    await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(store.data, null, 2))); return `Saved ${uri.fsPath}`;
  }
  async function importProgress() {
    const files = await vscode.window.showOpenDialog({ canSelectMany: false, filters: { 'Pip progress': ['json'] } });
    if (!files?.length) return 'Import cancelled.';
    const bytes = await vscode.workspace.fs.readFile(files[0]); if (bytes.length > 2000000) throw new Error('Progress backup is too large.');
    const raw = JSON.parse(Buffer.from(bytes).toString('utf8'));
    const choice = await vscode.window.showWarningMessage('Merge this backup into Pip? Existing Java files are kept; imported drafts are used only when a lesson file does not exist.', { modal: true }, 'Merge backup');
    if (choice !== 'Merge backup') return 'Import cancelled.';
    await store.import(raw); broadcast('progress', store.data); return 'Backup merged. Existing Java files were kept.';
  }
  async function handle(method, params) {
    switch (method) {
      case 'progress.load': return store.data;
      case 'progress.patch': {
        const allowed = Object.fromEntries(['steps','answers','reflections','activities','view'].filter(key => params[key] !== undefined).map(key => [key, params[key]]));
        if (JSON.stringify(allowed).length > 200000) throw new Error('Progress update is too large.');
        return patch(allowed);
      }
      case 'progress.export': return exportProgress();
      case 'progress.import': return importProgress();
      case 'runtime.info': return runtimeInfo();
      case 'lesson.open': return openLesson(params.lessonId, currentLesson !== params.lessonId || !vscode.window.visibleTextEditors.some(e => documentLesson(e.document)?.id === params.lessonId));
      case 'lesson.focus': return openLesson(params.lessonId);
      case 'lesson.learn': getLesson(params.lessonId); await showPanel(`/learn/${params.lessonId}`); return true;
      case 'lesson.quiz': getLesson(params.lessonId); await showPanel(`/quiz/${params.lessonId}`); return true;
      case 'lesson.run':
        if (params.input !== undefined && (typeof params.input !== 'string' || params.input.length > 10000)) throw new Error('Custom input must be text of at most 10,000 characters.');
        return run(params.lessonId, params.controlHz ?? 20, params.input);
      case 'lesson.rate': if (![1,20,60].includes(params.controlHz)) throw new Error('Invalid decision rate.'); getLesson(params.lessonId); rates.set(params.lessonId, params.controlHz); return true;
      case 'lesson.restore': return restore(params.lessonId);
      case 'lesson.reveal': {
        if (typeof params.text !== 'string' || params.text.length > 500) throw new Error('Invalid code location.');
        const document = await ensureLesson(params.lessonId), text = document.getText(), from = text.indexOf(params.text);
        const editor = await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.One, preview: false });
        if (from >= 0) { editor.selection = new vscode.Selection(document.positionAt(from), document.positionAt(from + params.text.length)); editor.revealRange(editor.selection, vscode.TextEditorRevealType.InCenterIfOutsideViewport); }
        return true;
      }
      case GAME_REQUESTS.open: return openGame(params.gameId, currentGame !== params.gameId || !vscode.window.visibleTextEditors.some(editor => documentGame(editor.document)?.id === params.gameId));
      case GAME_REQUESTS.focus: return openGame(params.gameId);
      case GAME_REQUESTS.run: {
        const mode = params.mode ?? RUN_MODES.graded;
        if (!Object.values(RUN_MODES).includes(mode)) throw new Error('Unsupported run mode.');
        if (mode === RUN_MODES.custom && (typeof params.input !== 'string' || params.input.length > 10000)) throw new Error('Custom input must be text of at most 10,000 characters.');
        return playGame(params.gameId, mode, mode === RUN_MODES.custom ? params.input : undefined);
      }
      case GAME_REQUESTS.restore: return restoreGame(params.gameId);
      case 'run.stop': activeRun?.controller.abort(); return true;
      case 'course.open': {
        const route = ['projects','assignments'].includes(params.collection)?`/${params.collection}`:params.moduleId ? `/module/${modules.find(m => m.id === params.moduleId)?.id || ''}` : '/';
        await showPanel(route); return true;
      }
      case 'settings.java': await vscode.commands.executeCommand('workbench.action.openSettings', 'pip.javaHome'); return true;
      case 'workspace.open': await vscode.commands.executeCommand('workbench.action.files.openFolder'); return true;
      default: throw new Error('Unsupported Pip request.');
    }
  }
  context.subscriptions.push(output, diagnostics,
    vscode.commands.registerCommand('pip.openCourse', () => showPanel('/').catch(report)),
    vscode.commands.registerCommand('pip.openProgress', () => showPanel('/progress').catch(report)),
    vscode.commands.registerCommand('pip.openSettings', () => showPanel('/settings').catch(report)),
    vscode.commands.registerCommand('pip.openLesson', id => openLesson(id).catch(report)),
    vscode.commands.registerCommand('pip.runLesson', async (id, hz) => {
      try {
        const game = id ? null : documentGame(vscode.window.activeTextEditor?.document) || (currentGame && !documentLesson(vscode.window.activeTextEditor?.document) ? getGame(currentGame) : null);
        if (game) { if (panelRoute !== gameRoute(game.id) || !panel?.visible) await openGame(game.id); return await playGame(game.id); }
        id ??= documentLesson(vscode.window.activeTextEditor?.document)?.id || currentLesson; if (panelRoute !== practicePath(getLesson(id)) || !panel?.visible) await openLesson(id); return await run(id, hz); } catch (error) { report(error); }
    }),
    vscode.commands.registerCommand('pip.stopRun', () => activeRun?.controller.abort()),
    vscode.commands.registerCommand('pip.exportProgress', () => exportProgress().catch(report)),
    vscode.commands.registerCommand('pip.importProgress', () => importProgress().catch(report)),
    vscode.window.registerTreeDataProvider('pip.launcher', { getTreeItem: item => item, getChildren: () => [] }),
    vscode.workspace.onDidChangeConfiguration(event => { if (event.affectsConfiguration('pip.javaHome') || event.affectsConfiguration('java')) jdkPromise = null; }),
    vscode.window.onDidChangeActiveTextEditor(async editor => {
      if (!editor) return;
      const lesson = documentLesson(editor.document), game = lesson ? null : documentGame(editor.document);
      broadcast('focus', { pane:'editor',lessonId:lesson?.id,gameId:game?.id });
      const route = lesson ? practicePath(lesson) : game ? gameRoute(game.id) : null;
      if (!route || syncingEditor || openingLesson || vscode.window.activeTextEditor !== editor) return;
      if ((lesson ? currentLesson === lesson.id : currentGame === game.id) && panelRoute === route && editor.viewColumn === vscode.ViewColumn.One && panel?.visible) return;
      syncingEditor = true;
      try {
        currentLesson = lesson?.id; currentGame = game?.id;
        await showPanel(route, vscode.ViewColumn.Two);
        await vscode.window.showTextDocument(editor.document,{viewColumn:vscode.ViewColumn.One,preview:false,preserveFocus:false});
        const duplicates=vscode.window.tabGroups.all.filter(group=>group.viewColumn===vscode.ViewColumn.Two).flatMap(group=>group.tabs.filter(tab=>tab.input instanceof vscode.TabInputText&&tab.input.uri.toString()===editor.document.uri.toString()));
        if(duplicates.length)await vscode.window.tabGroups.close(duplicates,true);
      } catch(error) { report(error); }
      finally { syncingEditor = false; }
    }),
    vscode.workspace.onDidChangeTextDocument(event => {
      const lesson = documentLesson(event.document), game = lesson ? null : documentGame(event.document);
      const id = lesson?.id || game?.id;
      if (!id || !event.contentChanges.length || path.basename(event.document.fileName)!=='Student.java') return;
      diagnostics.delete(event.document.uri);
      const text = event.document.getText();
      writes = writes.catch(() => {}).then(() => patch({ drafts: { [id]: text } })).catch(report);
      broadcast('document.changed', { lessonId: lesson?.id, gameId: game?.id, version: event.document.version, dirty: event.document.isDirty });
    }),
  );
  if(context.extensionMode===vscode.ExtensionMode.Development) {
    let refresh;
    const watcher=watch(path.join(context.extensionPath,'dist'),(_event,name)=>{
      if(name!=='index.html')return;
      clearTimeout(refresh);
      refresh=setTimeout(async()=>{
        const target=panel;
        if(!target)return;
        try {const content=await html(target.webview,panelRoute||'/');if(target===panel)target.webview.html=content;}catch(error){output.appendLine(`Preview refresh: ${error.message}`);}
      },350);
    });
    context.subscriptions.push({dispose(){clearTimeout(refresh);watcher.close();}});
  }
  service = { stop: () => activeRun?.controller.abort(), flush: async () => { await writes; await store.pending; }, close: () => panel?.dispose() };
  // The returned API supports extension-host integration tests without exposing a network service.
  return { openLesson, run, lessonUri, openGame, playGame, gameUri, runtimeInfo, getProgress: () => store.data, patch, showCourse: route => showPanel(route || '/'), stop: service.stop };
}
export async function deactivate() { service?.stop(); await service?.flush(); service?.close(); }
