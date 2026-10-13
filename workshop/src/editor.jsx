import React, { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor/editor/editor.api';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import { conf, language } from 'monaco-editor/languages/definitions/java/java';
// Import only the Monaco features used here; editor.main also pulls in unrelated language services.
import 'monaco-editor/editor/browser/coreCommands';
import 'monaco-editor/features/codicon/register'; // icon font CSS; Vite bundles the .ttf
import 'monaco-editor/features/find/register';
import 'monaco-editor/editor/contrib/bracketMatching/browser/bracketMatching';
import 'monaco-editor/editor/contrib/clipboard/browser/clipboard';
import 'monaco-editor/editor/contrib/comment/browser/comment';
import 'monaco-editor/editor/contrib/contextmenu/browser/contextmenu';
import 'monaco-editor/editor/contrib/cursorUndo/browser/cursorUndo';
import 'monaco-editor/editor/contrib/folding/browser/folding';
import 'monaco-editor/editor/contrib/gotoError/browser/gotoError';
import 'monaco-editor/editor/contrib/hover/browser/hoverContribution';
import 'monaco-editor/editor/contrib/indentation/browser/indentation';
import 'monaco-editor/editor/contrib/linesOperations/browser/linesOperations';
import 'monaco-editor/editor/contrib/multicursor/browser/multicursor';
import 'monaco-editor/editor/contrib/snippet/browser/snippetController2';
import 'monaco-editor/editor/contrib/suggest/browser/suggestController';
import 'monaco-editor/editor/contrib/toggleTabFocusMode/browser/toggleTabFocusMode'; // Ctrl+M: let Tab leave the editor
import 'monaco-editor/editor/contrib/wordHighlighter/browser/wordHighlighter';
import 'monaco-editor/editor/contrib/wordOperations/browser/wordOperations';
import { parser } from '@lezer/java';
import { isJavaCodePosition, isJavaMemberPosition } from '../shared/game-commands.js';
import Icon from './icon.jsx';
import { useAppearance } from './appearance.jsx';
import { lockedInputLines, touchesLockedInput, moveLockedInputLines, sameLockedInputLines, validLockedInputReset } from './locked-inputs.js';
import './locked-inputs.css';

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
const { KeyMod: M, KeyCode: K, MarkerSeverity } = monaco;
const mac = /Mac|iPhone|iPad/.test(navigator.platform);

// Keywords and statement snippets ([label, template, detail]; ${name} = tab stop, ${} = final cursor).
// Member completions (after a dot) come only from onComplete, which knows the variable's type.
const words = [
  ...'public private static final void int double boolean char String class new return if else for while do break continue true false null this import'.split(' '),
  ['System.out.println', 'System.out.println(${});', 'print a line'],
  ['System.out.print', 'System.out.print(${});', 'print without a newline'],
  ['System.out.printf', 'System.out.printf("${%d}%n", ${value});', 'formatted print'],
  ['for', 'for (int ${i} = 0; ${i} < ${n}; ${i}++) {\n\t${}\n}', 'counting loop'],
  ['while', 'while (${condition}) {\n\t${}\n}', 'loop while true'],
  ['if', 'if (${condition}) {\n\t${}\n}', 'branch'],
  ['ifelse', 'if (${condition}) {\n\t${}\n} else {\n\t\n}', 'if / else'],
  ['main', 'public static void main(String[] args) {\n\t${}\n}', 'program entry'],
  ['Scanner', 'Scanner ${console} = new Scanner(System.in);', 'read input'],
  ['Random', 'Random ${rand} = new Random();', 'random numbers'],
];
const { CompletionItemKind: Kind, CompletionItemInsertTextRule: { InsertAsSnippet } } = monaco.languages;
// ${name} -> ${n:name} (same name, same n, so edits mirror); ${} -> $0.
const snippet = tpl => { const ids = {}; return tpl.replace(/\$\{([^}]*)\}/g, (_, name) => name ? `\${${ids[name] ??= Object.keys(ids).length + 1}:${name}}` : '$0'); };
const staticItems = words.map(w => typeof w === 'string'
  ? { label: w, kind: Kind.Keyword, insertText: w }
  : { label: w[0], detail: w[2], kind: Kind.Snippet, insertText: snippet(w[1]), insertTextRules: InsertAsSnippet });
// Members a CSE 121 student reaches for first; everything else follows alphabetically.
const common = ['println', 'print', 'printf', 'nextInt', 'nextLine', 'next', 'nextDouble', 'hasNextInt', 'length', 'charAt', 'substring', 'indexOf', 'equals', 'equalsIgnoreCase', 'toUpperCase', 'toLowerCase', 'max', 'min', 'abs', 'pow', 'sqrt', 'round', 'random'];
const kinds = { method: Kind.Method, field: Kind.Field, variable: Kind.Variable, class: Kind.Class, keyword: Kind.Keyword };
const owners = new Map(); // model -> that editor's props ref, so one provider serves every editor
monaco.languages.registerCompletionItemProvider('java', {
  triggerCharacters: ['.'],
  async provideCompletionItems(model, pos) {
    const source = model.getValue(), offset = model.getOffsetAt(pos);
    if (!isJavaCodePosition(source, offset)) return { suggestions: [] };
    const word = model.getWordUntilPosition(pos), range = new monaco.Range(pos.lineNumber, word.startColumn, pos.lineNumber, pos.column);
    const member = isJavaMemberPosition(source, offset);
    const owner = owners.get(model)?.current;
    if (owner?.autocomplete === false) return { suggestions: [] };
    let found = [];
    try { found = (await owner?.onComplete?.(source, offset)) ?? []; } catch {}
    const typed = found.map(c => {
      // "append(CharSequence arg0) : PrintStream" -> row "append(CharSequence)" with the return type on the right, so overloads read apart.
      const [, params = '', type = ''] = /^[^(:]*(\([^)]*\))?\s*(?::\s*(.*))?$/.exec((c.detail || '').replace(/ arg\d+/g, '')) || [];
      const rank = common.indexOf(c.label);
      return { label: { label: c.label, detail: params, description: type }, kind: kinds[c.kind] ?? Kind.Text, insertText: c.insertText ?? c.label, insertTextRules: InsertAsSnippet, sortText: `${rank < 0 ? 9 : 0}${String(Math.max(rank, 0)).padStart(2, '0')}${c.label}` };
    });
    const extra = (owner?.completionItems ?? []).map(item => ({
      label: item.label, detail: item.code, documentation: item.description,
      kind: Kind.Snippet, insertText: item.insertText, insertTextRules: InsertAsSnippet,
    }));
    return { suggestions: [...typed, ...(member ? [] : [...extra, ...staticItems])].map(i => ({ ...i, range })) };
  },
});

// Monaco's Java grammar tags every name as a plain identifier; add constants, types and method names so they get their own colours.
monaco.languages.register({ id: 'java', extensions: ['.java'] });
monaco.languages.setLanguageConfiguration('java', conf);
monaco.languages.setMonarchTokensProvider('java', { ...language, tokenizer: { ...language.tokenizer, root: [
  [/[A-Z][A-Z0-9_]*\b(?![\w$])/, 'constant'],
  [/[A-Z][\w$]*/, 'type'],
  [/[a-z_$][\w$]*(?=\s*\()/, { cases: { '@keywords': 'keyword.$0', '@default': 'function' } }],
  ...language.tokenizer.root,
] } });

// Share the appearance's code colours with the course examples.
function defineTheme(appearance) {
  const css = getComputedStyle(document.documentElement), v = name => css.getPropertyValue(`--${name}`).trim();
  const fg = name => v(name).replace('#', '');
  monaco.editor.defineTheme(`pip-${appearance}`, { base: appearance === 'dark' ? 'vs-dark' : 'vs', inherit: true,
    rules: [
      { token: '', foreground: fg('code-text') },
      { token: 'keyword', foreground: fg('syntax-keyword') },
      ...['true', 'false', 'null'].map(w => ({ token: `keyword.${w}`, foreground: fg('syntax-literal') })),
      { token: 'number', foreground: fg('syntax-literal') },
      { token: 'string', foreground: fg('syntax-string') },
      { token: 'comment', foreground: fg('code-muted'), fontStyle: 'italic' },
      { token: 'delimiter', foreground: fg('syntax-punctuation') },
      { token: 'operator', foreground: fg('syntax-punctuation') },
      { token: 'annotation', foreground: fg('syntax-function') },
      { token: 'type', foreground: fg('syntax-type') },
      { token: 'function', foreground: fg('syntax-function') },
      { token: 'constant', foreground: fg('syntax-literal') },
    ],
    colors: {
      'editor.background': v('code'), 'editor.foreground': v('code-text'), 'editorCursor.foreground': v('code-text'),
      'editorLineNumber.foreground': v('code-muted'), 'editorLineNumber.activeForeground': v('code-text'),
      'editor.lineHighlightBackground': v('code-active'), 'editor.selectionBackground': v('code-selection'),
      'editorGutter.background': v('code'), 'editorWidget.border': v('code-line'), 'focusBorder': v('code-muted'),
    },
  });
}

// Lezer's Java parser finds syntax errors instantly; Monaco has no Java parser of its own.
function syntaxErrors(model) {
  const text = model.getValue(), found = [], lines = new Set();
  parser.parse(text).iterate({ enter: node => {
    if (!node.type.isError) return;
    // An error at the start of a line usually means the previous line is missing a ; or ), so mark its end.
    const before = text.slice(Math.max(0, node.from - 200), node.from), gap = before.length - before.trimEnd().length;
    const from = /\n\s*$/.test(before) && gap < before.length ? node.from - gap : node.from, start = model.getPositionAt(from);
    if (lines.has(start.lineNumber)) return; // one per line keeps the gutter readable
    lines.add(start.lineNumber);
    const lineEnd = model.getOffsetAt({ lineNumber: start.lineNumber, column: model.getLineMaxColumn(start.lineNumber) });
    const end = model.getPositionAt(Math.min(Math.max(node.to, from + 1), from === node.from ? text.length : lineEnd));
    found.push({ startLineNumber: start.lineNumber, startColumn: start.column, endLineNumber: end.lineNumber, endColumn: end.column, severity: MarkerSeverity.Error, message: 'Syntax error: check for a missing ;, ), or }' });
  } });
  return found;
}

const status = { saved: 'Saved', unsaved: 'Unsaved changes', saving: 'Saving…', failed: 'Not saved' };

// Reusable Java editor. sourceRef.current = { get, replace, reveal, focus } for the parent.
export default function JavaEditor({ docKey, fileName = 'Student.java', initialSource, onSave, onChange, onDiagnose, onComplete, completionItems, onRun, running, sourceRef, hideRun = false, autocomplete = true, lockedInputs }) {
  const host = useRef(), props = useRef(), view = useRef();
  const { resolved, editorSize: size, setEditorSize: setSize } = useAppearance();
  const [saved, setSaved] = useState('saved');
  const [lockedNotice, setLockedNotice] = useState('');
  props.current = { onSave, onChange, onDiagnose, onComplete, completionItems, onRun, autocomplete, running };
  const run = () => { if (!running) props.current.onRun?.(view.current.getValue()); };
  props.current.run = run;
  useEffect(() => {
    let timer = 0, lintTimer = 0;
    const v = view.current = monaco.editor.create(host.current, {
      value: initialSource, language: 'java', theme: resolved === 'dark' ? 'vs-dark' : 'vs', ariaLabel: `${fileName} editor`,
      automaticLayout: true, minimap: { enabled: false }, fontSize: size, lineHeight: 1.55,
      readOnly: Boolean(running),
      fontFamily: getComputedStyle(document.documentElement).getPropertyValue('--mono').trim() || 'monospace',
      tabSize: 4, insertSpaces: true, detectIndentation: false, scrollBeyondLastLine: false, renderLineHighlight: 'line', wordWrap: 'on',
      glyphMargin: Boolean(lockedInputs),
      quickSuggestions: autocomplete, suggestOnTriggerCharacters: autocomplete, snippetSuggestions: autocomplete ? 'inline' : 'none', wordBasedSuggestions: 'off', fixedOverflowWidgets: true,
    });
    const model = v.getModel();
    let acceptedSource=model.getValue(), protectedLines=lockedInputLines(acceptedSource,lockedInputs), restoring=false, replacing=false, blockedTurn=false;
    const decoration=v.createDecorationsCollection();
    const decorate=()=>decoration.set(protectedLines.map(line=>({
      range:new monaco.Range(model.getPositionAt(line.start).lineNumber,1,model.getPositionAt(line.end).lineNumber,1),
      options:{isWholeLine:true,className:'pip-locked-input-line',glyphMarginClassName:'codicon codicon-lock pip-locked-input-glyph',
        hoverMessage:{value:'Given input — this line is read-only.'},glyphMarginHoverMessage:{value:'Given input — this line is read-only.'}},
    })));
    decorate();
    owners.set(model, props);
    const save = source => { if (!props.current.onSave) return; setSaved('saving'); Promise.resolve(props.current.onSave(source)).then(() => setSaved(s => s === 'saving' ? 'saved' : s), () => setSaved('failed')); };
    const mark = markers => { if (!model.isDisposed()) monaco.editor.setModelMarkers(model, 'pip', markers); };
    const lint = async () => {
      const version = model.getVersionId(), found = syntaxErrors(model);
      if (found.length || !props.current.onDiagnose) return mark(found); // javac adds nothing until the parse is clean
      let items;
      try { items = await props.current.onDiagnose(model.getValue()); } catch { return; }
      if (model.isDisposed() || model.getVersionId() !== version) return; // text changed since the request
      mark(items.filter(d => d.line >= 1 && d.line <= model.getLineCount()).map(d => {
        const column = Math.min(Math.max(0, d.column), model.getLineLength(d.line)) + 1;
        return { startLineNumber: d.line, startColumn: column, endLineNumber: d.line, endColumn: Math.min(column + 1, model.getLineMaxColumn(d.line)), severity: d.severity === 'warning' ? MarkerSeverity.Warning : MarkerSeverity.Error, message: d.message };
      }));
    };
    lint();
    model.onDidChangeContent(event => {
      if (restoring) return;
      if (!replacing && protectedLines.length && (blockedTurn || event.isEolChange || touchesLockedInput(event.changes,protectedLines))) {
        // This boundary catches model edits, paste, cut, format, undo and redo.
        // shortcut: rejecting a locked-line edit clears undo history; replace this guard if history must survive rejected edits.
        const selection=v.getSelections();
        if (!blockedTurn) {
          // Monaco can split one multiline input into several model edits.
          // Reject the remaining edits from that input turn as well.
          blockedTurn=true;
          v.updateOptions({readOnly:true});
          queueMicrotask(()=>{
            blockedTurn=false;
            if (!model.isDisposed()) { v.updateOptions({readOnly:Boolean(props.current.running)}); if (selection) v.setSelections(selection); }
          });
        }
        restoring=true;
        try { model.setValue(acceptedSource); } finally { restoring=false; }
        if (selection) v.setSelections(selection);
        decorate();
        setLockedNotice('Input lines are read-only.');
        return;
      }
      protectedLines=replacing?lockedInputLines(model.getValue(),lockedInputs):moveLockedInputLines(protectedLines,event.changes);
      acceptedSource=model.getValue();
      props.current.onChange?.();
      decorate();
      setLockedNotice('');
      setSaved('unsaved');
      clearTimeout(timer); timer = setTimeout(() => { timer = 0; save(model.getValue()); }, 500);
      clearTimeout(lintTimer); lintTimer = setTimeout(lint, 400);
    });
    // Editor-scoped actions; Monaco stops the key event, so the window-level Mod-Enter shortcut doesn't fire twice.
    const action = (id, label, keybindings, run) => v.addAction({ id, label, keybindings, run });
    action('pip.run', 'Run', [M.CtrlCmd | K.Enter], () => props.current.run());
    const zoom = d => () => setSize(s => d ? Math.min(28, Math.max(10, s + d)) : 15);
    action('pip.zoomIn', 'Zoom in', [M.CtrlCmd | K.Equal, M.CtrlCmd | M.Shift | K.Equal, M.CtrlCmd | K.NumpadAdd], zoom(1));
    action('pip.zoomOut', 'Zoom out', [M.CtrlCmd | K.Minus, M.CtrlCmd | K.NumpadSubtract], zoom(-1));
    action('pip.zoomReset', 'Reset zoom', [M.CtrlCmd | K.Digit0, M.CtrlCmd | K.Numpad0], zoom(0));
    if (sourceRef) sourceRef.current = {
      get: () => v.getValue(),
      replace: (source, { resetLockedInputs = false } = {}) => {
        const nextLines=lockedInputLines(source,lockedInputs);
        if (lockedInputs && !(resetLockedInputs ? validLockedInputReset(source,lockedInputs) : sameLockedInputLines(protectedLines,nextLines))) {
          setLockedNotice('Input lines are read-only.');
          return false;
        }
        clearTimeout(timer);
        if (model.getValue() !== source) {
          replacing=true;
          // Host replacements must work while user editing is disabled.
          try { model.pushStackElement(); model.pushEditOperations(v.getSelections(), [{ range: model.getFullModelRange(), text: source }], () => null); model.pushStackElement(); }
          finally { replacing=false; }
        }
        // Replacement events come from the host after it saves the file.
        clearTimeout(timer); timer = 0; setSaved('saved');
        setLockedNotice('');
        return true;
      },
      reveal: text => {
        const at = v.getValue().indexOf(text);
        if (at >= 0) { const a = model.getPositionAt(at), b = model.getPositionAt(at + text.length); v.setSelection(monaco.Selection.fromPositions(a, b)); v.revealRangeInCenterIfOutsideViewport(v.getSelection()); }
        v.focus();
      },
      focus: () => v.focus(),
    };
    return () => {
      clearTimeout(lintTimer);
      if (timer) { clearTimeout(timer); props.current.onSave?.(v.getValue()); } // flush pending edit
      if (sourceRef) sourceRef.current = null;
      owners.delete(model);
      v.dispose();
    };
  }, [docKey]);
  useEffect(() => {
    // The provider applies the root's CSS palette in its effect before the next frame.
    const frame = requestAnimationFrame(() => { defineTheme(resolved); monaco.editor.setTheme(`pip-${resolved}`); });
    return () => cancelAnimationFrame(frame);
  }, [resolved, docKey]);
  useEffect(() => { view.current?.updateOptions({ fontSize: size }); }, [size]);
  useEffect(() => { view.current?.updateOptions({ readOnly: Boolean(running) }); }, [running]);
  return <div className="java-editor-shell">
    <div className="editor-bar"><span className="file-title"><Icon name="file-code" /> {fileName}<small role="status">{lockedNotice || status[saved]}</small></span>
      {!hideRun && <button className="primary" disabled={running} onClick={run} aria-keyshortcuts={mac ? 'Meta+Enter' : 'Control+Enter'}>{running ? 'Running…' : <><Icon name="play" /> Run <kbd>{mac ? '⌘↵' : 'Ctrl+Enter'}</kbd></>}</button>}</div>
    <div ref={host} className="java-editor" />
  </div>;
}
