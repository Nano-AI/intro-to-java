// Isolated real Monaco interactions; never opens the student's workspace.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium, webkit } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = await fs.mkdtemp(path.join(root, '.locked-editor-fixture-'));
const artifacts = await fs.mkdtemp(path.join(os.tmpdir(), 'pip-locked-editor-'));
const source = 'package games.supplyrelay;\n\npublic class Student {\n    public static void main(String[] args) {\n        final int gap = 2;\n        final int energy = 50;\n        final int costPerTile = 2;\n\n        int remaining = energy;\n        System.out.println(remaining);\n    }\n}\n';
const legacy = source.replaceAll('final int', 'int').replaceAll('\n', '\r\n');
await fs.writeFile(path.join(fixture, 'index.html'), '<html><body><div id="root"></div><script type="module" src="./app.jsx"></script></body></html>');
await fs.writeFile(path.join(fixture, 'app.jsx'), `
import React, {useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import * as monaco from 'monaco-editor/editor/editor.api';
import JavaEditor from '../src/editor.jsx';
import AppearanceProvider from '../src/appearance.jsx';
import '../web/style.css'; import '../src/style.css'; import '../src/workbench.css'; import '../src/desktop.css'; import '@radix-ui/themes/styles.css'; import '../src/appearance.css';
const initial = location.search.includes('legacy') ? ${JSON.stringify(legacy)} : ${JSON.stringify(source)};
window.observed = { saves:[], runs:[], diagnoses:[] };
function App() {
  const ref=useRef();
  const [running,setRunning]=useState(false);
  window.setFixtureRunning=setRunning;
  window.fixtureEditor=()=>({ api:ref.current, editor:monaco.editor.getEditors()[0], model:monaco.editor.getModels()[0], monaco });
  return <div style={{height:600}}><JavaEditor docKey="protected-fixture" initialSource={initial} sourceRef={ref}
    lockedInputs={{gap:2,energy:50,costPerTile:2}} running={running}
    onSave={value=>{window.observed.saves.push(value);return window.saveFixture(value);}}
    onRun={value=>window.observed.runs.push(value)}
    onDiagnose={value=>{window.observed.diagnoses.push(value);return [];}}/></div>;
}
createRoot(document.getElementById('root')).render(<AppearanceProvider><App/></AppearanceProvider>);
`);
const server = await createServer({ root, server:{host:'127.0.0.1',port:4322,strictPort:true,watch:null,hmr:false} });
await server.listen();
try {
  for (const [name, launcher] of Object.entries({chromium, webkit})) {
    const browser = await launcher.launch({headless:true});
    try {
      const page = await browser.newPage({viewport:{width:1000,height:700}}), errors=[];
      page.on('pageerror', error=>errors.push(error.message));
      const savedFile=path.join(artifacts,`${name}.java`);
      await page.exposeFunction('saveFixture', value=>fs.writeFile(savedFile,value));
      const open=async suffix=>{
        await page.goto(`http://127.0.0.1:4322/${path.basename(fixture)}/index.html${suffix||''}`);
        await page.locator('.monaco-editor .view-line').first().waitFor();
        await page.waitForFunction(()=>window.fixtureEditor?.().api);
      };
      const get=()=>page.evaluate(()=>window.fixtureEditor().api.get());
      const rejected=async(label,edit)=>{
        const before=await get();
        await edit();
        assert.equal(await get(),before,label);
      };
      const select=async(start,end=start)=>page.evaluate(({start,end})=>{
        const {editor,model,monaco}=window.fixtureEditor();
        editor.setSelection(monaco.Selection.fromPositions(model.getPositionAt(start),model.getPositionAt(end)));
        editor.focus();
      },{start,end});
      await open();
      await page.evaluate(()=>window.fixtureEditor().api.reveal('final int gap = 2;'));
      await page.keyboard.insertText('final int gap = 9;');
      assert.equal(await get(),source,'typing cannot modify the supplied declaration line');
      await rejected('multi-line paste cannot remove inputs',async()=>{
        const start=source.indexOf('final int gap'),end=source.indexOf('int remaining');
        await select(start,end);
        await page.keyboard.insertText('// changed inputs\nint gap = 9;\n');
      });
      await rejected('Select All + Delete preserves all source',async()=>{
        await select(0,source.length); await page.keyboard.press('Backspace');
      });
      await rejected('Select All + Paste cannot replace even unchanged input lines',async()=>{
        await select(0,source.length); await page.keyboard.insertText(source.replace('remaining = energy','remaining = 9'));
      });
      await rejected('cut events cannot remove protected lines',async()=>{
        await select(source.indexOf('        final int gap'),source.indexOf('        int remaining'));
        await page.evaluate(()=>{
          const {model}=window.fixtureEditor();window.cutChanges=0;
          window.cutListener=model.onDidChangeContent(()=>window.cutChanges++);
        });
        await page.keyboard.press(process.platform==='darwin'?'Meta+x':'Control+x');
        const changes=await page.evaluate(()=>{window.cutListener.dispose();return window.cutChanges;});
        assert.ok(changes>0,'cut test reaches the model boundary');
      });
      await rejected('clipboard paste is guarded independently of typed input',async()=>{
        await select(0,source.length);
        const changes=await page.evaluate(async()=>{
          const {editor,model}=window.fixtureEditor();let changes=0;
          const stop=model.onDidChangeContent(()=>changes++);
          editor.trigger('keyboard','paste',{text:'class Student {\n int gap = 999;\n}',pasteOnNewLine:false,multicursorText:null});
          await new Promise(resolve=>setTimeout(resolve,20));stop.dispose();return changes;
        });
        assert.ok(changes>0,'paste test reaches the model boundary');
      });
      const firstStart=source.lastIndexOf('\n',source.indexOf('final int gap'))+1;
      const lastEnd=source.indexOf('\n',source.indexOf('final int costPerTile'));
      for(const [label,offset,key] of [
        ['Delete before first input',firstStart-1,'Delete'],
        ['Backspace at first input start',firstStart,'Backspace'],
        ['Delete after last input',lastEnd,'Delete'],
        ['Backspace at following line start',lastEnd+1,'Backspace'],
      ]) await rejected(label,async()=>{await select(offset);await page.keyboard.press(key);});
      for(const [label,start,end,text] of [
        ['input indentation',firstStart,firstStart+8,'\t'],
        ['input trailing comment',lastEnd,lastEnd,' // editable?'],
        ['input identifier',source.indexOf('gap ='),source.indexOf('gap =')+3,'distance'],
      ]) await rejected(label,()=>page.evaluate(({start,end,text})=>{
        const {editor,model,monaco}=window.fixtureEditor();
        editor.executeEdits('test',[{range:monaco.Range.fromPositions(model.getPositionAt(start),model.getPositionAt(end)),text}]);
      },{start,end,text}));
      await rejected('multi-cursor edits reject the entire transaction',async()=>{
        await page.evaluate(()=>{
          const {editor,model,monaco}=window.fixtureEditor(),s=model.getValue();
          editor.setSelections([s.indexOf('gap = 2')+6,s.indexOf('remaining = energy')+12].map(at=>monaco.Selection.fromPositions(model.getPositionAt(at),model.getPositionAt(at+1))));
          editor.trigger('test','type',{text:'9'});
        });
      });
      await rejected('format edits cannot alter declaration whitespace',()=>page.evaluate(()=>{
        const {model}=window.fixtureEditor();
        model.pushEditOperations(null,[{range:model.getFullModelRange(),text:model.getValue().replaceAll('        ','    ')}],()=>null);
      }));
      await rejected('direct model replacement is guarded',()=>page.evaluate(()=>{
        const {model}=window.fixtureEditor(); model.setValue(model.getValue().replace('gap = 2','gap = 9'));
      }));
      await rejected('undo and redo never resurrect a rejected mutation',async()=>{
        for(let i=0;i<3;i++)await page.evaluate(async()=>{const {model}=window.fixtureEditor();await model.undo();await model.redo();});
      });
      await rejected('editor.replace cannot change protected inputs',async()=>{
        assert.equal(await page.evaluate(()=>{const {api}=window.fixtureEditor();return api.replace(api.get().replace('gap = 2','gap = 9'));}),false);
      });
      await page.evaluate(()=>{
        const {editor,monaco}=window.fixtureEditor();
        editor.pushUndoStop();editor.executeEdits('test',[{range:new monaco.Range(1,1,1,1),text:'// keep this header\n'}]);editor.pushUndoStop();
      });
      const moved=await get();assert.equal(moved,'// keep this header\n'+source,'ordinary edits before inputs remain possible');
      await rejected('protection follows lines moved by an earlier edit',async()=>{
        await page.evaluate(()=>window.fixtureEditor().api.reveal('final int energy = 50;'));
        await page.keyboard.insertText('final int energy = 900;');
      });
      await page.evaluate(()=>{
        const {editor,model,monaco}=window.fixtureEditor(),at=model.getValue().indexOf('remaining = energy')+12;
        editor.pushUndoStop();editor.executeEdits('test',[{range:monaco.Range.fromPositions(model.getPositionAt(at),model.getPositionAt(at+6)),text:'energy - 1'}]);editor.pushUndoStop();
      });
      const edited=await get();assert.equal(edited,moved.replace('remaining = energy','remaining = energy - 1'));
      await page.evaluate(async()=>{await window.fixtureEditor().model.undo();});assert.equal(await get(),moved,'allowed body edit can undo');
      await page.evaluate(async()=>{await window.fixtureEditor().model.redo();});assert.equal(await get(),edited,'allowed body edit can redo');
      await page.waitForFunction(value=>window.observed.saves.includes(value),edited);
      assert.equal(await fs.readFile(savedFile,'utf8'),edited,'autosave writes only accepted source');
      await page.getByRole('button',{name:/Run/}).click();
      assert.deepEqual(await page.evaluate(()=>window.observed.runs),[edited]);
      const observed=await page.evaluate(()=>window.observed);
      for(const value of [...observed.saves,...observed.runs,...observed.diagnoses]) {
        assert.match(value,/final int gap = 2;/);assert.match(value,/final int energy = 50;/);assert.match(value,/final int costPerTile = 2;/);
      }
      assert.equal(await page.evaluate(value=>window.fixtureEditor().api.replace(value,{resetLockedInputs:true}),source.replace('gap = 2','gap = 9')),false,'authorized reset still rejects invalid input declarations');
      const solution=source.replace('remaining = energy','remaining = energy - gap * costPerTile');
      await page.evaluate(()=>window.setFixtureRunning(true));
      await page.waitForFunction(()=>{const {editor,monaco}=window.fixtureEditor();return editor.getOption(monaco.editor.EditorOption.readOnly);});
      await rejected('user typing stays blocked while running',async()=>{
        await page.evaluate(()=>window.fixtureEditor().api.reveal('remaining = energy - 1'));
        await page.keyboard.insertText('remaining = 0');
      });
      assert.equal(await page.evaluate(value=>window.fixtureEditor().api.replace(value,{resetLockedInputs:true}),solution),true,'authorized demo solution is accepted');
      assert.equal(await get(),solution,'trusted replacement updates visible code even while user editing is disabled');
      assert.equal(await page.evaluate(()=>{const {editor,monaco}=window.fixtureEditor();return editor.getOption(monaco.editor.EditorOption.readOnly);}),true,'trusted replacement does not unlock user editing');
      assert.ok(await page.locator('.pip-locked-input-line').count()>=3,'locked declarations are visibly marked');
      await page.screenshot({path:path.join(artifacts,`${name}-protected.png`)});
      await fs.writeFile(savedFile,legacy);
      await open('?legacy');
      assert.equal(await get(),legacy,'opening an old file retains CRLF and original declarations');
      assert.equal(await fs.readFile(savedFile,'utf8'),legacy,'opening never rewrites an old file');
      await rejected('formatting cannot normalize protected legacy line endings',()=>page.evaluate(()=>{
        const {model,monaco}=window.fixtureEditor();model.setEOL(monaco.editor.EndOfLineSequence.LF);
      }));
      await rejected('old mutable declarations also have immutable physical lines',async()=>{
        await page.evaluate(()=>window.fixtureEditor().api.reveal('int energy = 50;'));
        await page.keyboard.insertText('final int energy = 1;');
      });
      assert.equal(await fs.readFile(savedFile,'utf8'),legacy);
      const updatedLegacy=source.replaceAll('\n','\r\n');
      assert.equal(await page.evaluate(value=>window.fixtureEditor().api.replace(value,{resetLockedInputs:true}),updatedLegacy),true,'an explicit authorized replacement can update legacy inputs');
      assert.equal(await get(),updatedLegacy);
      assert.deepEqual(errors,[]);
    } finally { await browser.close(); }
  }
  console.log(`Locked editor tests passed in Chromium and WebKit. Artifacts: ${artifacts}`);
} finally { await server.close(); await fs.rm(fixture,{recursive:true,force:true}); }
