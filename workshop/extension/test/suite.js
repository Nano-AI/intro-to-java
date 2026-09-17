import * as vscode from 'vscode';
import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from 'playwright';
import { orderedLessons, lessons } from '../../src/curriculum.js';
import { withPackage, lessonPackage } from '../runner.js';

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(check, description, timeout=45000) {
  const start=Date.now();while(Date.now()-start<timeout){const result=await check();if(result)return result;await delay(200);}throw new Error(`Timed out: ${description}`);
}
export function run() { globalThis.__pipTestRun ||= suite(); return globalThis.__pipTestRun; }
async function suite() {
  console.log('Pip extension suite started',process.pid);
  const extension=vscode.extensions.getExtension('pip-learning.pip-workshop');assert.ok(extension,'extension discovered');
  const api=await extension.activate();
  const info=await api.runtimeInfo();assert.equal(info.java,true);assert.equal(info.javaSupport,true);
  const lesson=orderedLessons.find(l=>l.id==='first-movement');
  await api.openLesson(lesson.id);
  let document=await vscode.workspace.openTextDocument(api.lessonUri(lesson.id));
  assert.equal(document.languageId,'java');assert.match(document.getText(),/package pip.lessons.first_movement;/);
  const edit=new vscode.WorkspaceEdit();
  edit.replace(document.uri,new vscode.Range(document.positionAt(0),document.positionAt(document.getText().length)),withPackage(lesson.solution,lessonPackage(lesson.id)));
  await vscode.workspace.applyEdit(edit);
  const result=await api.run(lesson.id,1);assert.equal(result.result.passed,true);assert.equal(document.isDirty,false,'run saves the real editor document');
  await api.openLesson(lesson.id);assert.match(document.getText(),/setPower\(0.3, 0.3\)/,'reopening never overwrites code');
  const compilerEdit=new vscode.WorkspaceEdit();compilerEdit.replace(document.uri,new vscode.Range(document.positionAt(0),document.positionAt(document.getText().length)),withPackage('public class Student { public static void update(Robot r) { r.stopp(); } }',lessonPackage(lesson.id)));
  await vscode.workspace.applyEdit(compilerEdit);await api.run(lesson.id,1);
  assert.ok(vscode.languages.getDiagnostics(document.uri).some(d=>d.source==='Pip javac'),'compiler errors appear in native Problems');
  const terminal=orderedLessons.find(l=>l.id==='java-array-patterns');await api.openLesson(terminal.id);
  document=await vscode.workspace.openTextDocument(api.lessonUri(terminal.id));
  const terminalEdit=new vscode.WorkspaceEdit();terminalEdit.replace(document.uri,new vscode.Range(document.positionAt(0),document.positionAt(document.getText().length)),withPackage(terminal.solution,lessonPackage(terminal.id)));
  await vscode.workspace.applyEdit(terminalEdit);assert.equal((await api.run(terminal.id)).result.passed,true);
  await api.patch({reflections:{[terminal.id]:'I tested negative values so zero could not be a false maximum.'}});
  assert.ok(api.getProgress().completed.includes(terminal.id));

  // Exercise the actual VS Code webview, not a browser mock of the extension API.
  const browser=await chromium.connectOverCDP('http://127.0.0.1:9237');
  try {
    const page=await waitFor(async()=>browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('workbench')),'VS Code workbench');
    await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
    await vscode.commands.executeCommand('workbench.action.closeSidebar');
    page.on('console', message => { if(message.type()==='error')console.log('Renderer error:',message.text()); });
    page.on('pageerror', error => console.log('Renderer exception:',error.message));
    await api.showCourse('/');
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    await api.showCourse('/');
    console.log('Requested course page');
    let frame;
    try { frame=await waitFor(async()=>{for(const f of page.frames()){try{if(await f.locator('.module-card').count())return f;}catch{}}},'course React page',15000); }
    catch(error) {
      console.log('Pages:',browser.contexts().flatMap(c=>c.pages()).map(p=>p.url()));
      console.log('Frames:',page.frames().map(f=>f.url()));
      for(const f of page.frames()){try{console.log('Frame text:',(await f.locator('body').innerText()).slice(0,2000));}catch{}}
      await page.screenshot({path:path.join(process.env.PIP_TEST_ROOT,'screenshots/vscode-failure.png')});throw error;
    }
    assert.equal(await frame.locator('.module-card').count(),6);
    await page.screenshot({path:path.join(process.env.PIP_TEST_ROOT,'screenshots/vscode-course.png')});
    await frame.locator('.module-card').first().click();await frame.locator('.lesson-list').waitFor();
    const completedRow=frame.locator('.lesson-list li').filter({hasText:'First movement'});
    assert.equal(await completedRow.locator('.completion-title.is-complete').count(),1,'passed lesson is crossed off without a review');
    assert.equal(await completedRow.locator('.completion-title').evaluate(el=>getComputedStyle(el).textDecorationLine),'line-through');
    await frame.locator('.lesson-list a').first().click();await frame.locator('.briefing-slide').waitFor();
    assert.equal(await frame.locator('#run, #scene').count(),0,'knowledge is separate from practice');
    await frame.getByRole('button',{name:'Explore the idea'}).click();
    await frame.getByRole('button',{name:'Execute next statement'}).click();await frame.getByRole('button',{name:'Execute next statement'}).click();
    await frame.getByRole('link',{name:'Optional quiz'}).click();await frame.locator('.quiz-page').waitFor();
    assert.equal(await frame.getByRole('link',{name:'Start practice'}).isVisible(),true,'quiz answer is not a navigation gate');
    assert.equal(await frame.locator('.visual-lab,#scene,#run').count(),0,'quiz is a separate page');
    await frame.getByRole('radio',{name:'A new line',exact:true}).check();
    await frame.getByRole('link',{name:'Start practice'}).click();await frame.locator('#run').waitFor();
    assert.equal(await frame.locator('.visual-lab,.prediction-choices').count(),0,'practice contains no teaching slides');
    assert.equal(await frame.locator('textarea[aria-label*="code editor"], .cm-editor').count(),0,'no embedded editor');
    await waitFor(()=>vscode.window.visibleTextEditors.some(e=>e.document.fileName.endsWith('hello_java/Student.java')),'real Java editor beside lesson');
    const hello=orderedLessons.find(l=>l.id==='hello-java');document=await vscode.workspace.openTextDocument(api.lessonUri(hello.id));
    const helloEdit=new vscode.WorkspaceEdit();helloEdit.replace(document.uri,new vscode.Range(document.positionAt(0),document.positionAt(document.getText().length)),withPackage(hello.solution,lessonPackage(hello.id)));await vscode.workspace.applyEdit(helloEdit);
    await frame.locator('#run').click();await frame.locator('.practice-completion').waitFor({timeout:30000});
    assert.equal(await frame.locator('#reflection').isVisible(),false,'review starts collapsed');
    assert.equal(await frame.getByRole('button',{name:'Back to lesson outline'}).isEnabled(),true,'leaving completion needs no review');
    await frame.getByText('Optional review notes',{exact:true}).click();await frame.locator('#reflection').fill('OK');
    await waitFor(()=>api.getProgress().reflections['hello-java']==='OK','short optional note saved');
    await frame.getByRole('button',{name:'Back to lesson outline'}).click();await frame.locator('.lesson-list').waitFor();
    assert.equal(await frame.locator('.lesson-list li').filter({hasText:'Bring the console online'}).locator('.completion-title.is-complete').count(),1);
    await page.screenshot({path:path.join(process.env.PIP_TEST_ROOT,'screenshots/vscode-completed-lessons.png')});
    await api.showCourse('/learn/java-declare');await frame.locator('.briefing-slide').waitFor();
    await frame.getByRole('button',{name:'Explore the idea'}).click();
    await frame.getByLabel('Variable type').selectOption('int');await frame.getByLabel('Variable name').fill('bolts');await frame.getByLabel('Initial value').fill('4');
    await frame.getByRole('button',{name:'Create variable',exact:true}).click();
    await waitFor(()=>api.getProgress().activities['java-declare']===2,'interactive declaration recorded');
    await page.screenshot({path:path.join(process.env.PIP_TEST_ROOT,'screenshots/vscode-variable-briefing.png')});
    await frame.getByRole('link',{name:'Optional quiz'}).click();await frame.getByRole('radio',{name:'bolts',exact:true}).check();
    await frame.getByRole('link',{name:'Start practice'}).click();await frame.getByRole('heading',{name:'Build a first variable',exact:true}).waitFor();
    await waitFor(()=>vscode.window.activeTextEditor?.document.fileName.endsWith('java_declare/Student.java'),'declaration file focused');
    const declaration=orderedLessons.find(l=>l.id==='java-declare');
    const declarationDocument=await vscode.workspace.openTextDocument(api.lessonUri(declaration.id));
    const declarationEdit=new vscode.WorkspaceEdit();declarationEdit.replace(declarationDocument.uri,new vscode.Range(declarationDocument.positionAt(0),declarationDocument.positionAt(declarationDocument.getText().length)),withPackage(declaration.solution,lessonPackage(declaration.id)));await vscode.workspace.applyEdit(declarationEdit);
    await frame.locator('#run').click();await frame.locator('.practice-completion').waitFor({timeout:30000});
    assert.equal(await frame.locator('.case-tabs button').count(),4);await frame.locator('.case-tabs button').nth(1).click();
    assert.equal((await frame.locator('.actual-output').textContent()).trim(),'1');
    assert.equal(await frame.locator('.result-pane').getAttribute('data-active'),'true');
    const contrast=async()=>frame.locator('.case-tabs button[aria-pressed=true]').evaluate(el=>{
      const style=getComputedStyle(el),luma=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
      const a=luma(style.color),b=luma(style.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    });
    assert.ok(await contrast()>=4.5,'selected output case has readable contrast');
    await page.screenshot({path:path.join(process.env.PIP_TEST_ROOT,'screenshots/vscode-output-focus.png')});
    await vscode.workspace.getConfiguration('workbench').update('colorTheme','Default Dark Modern',vscode.ConfigurationTarget.Global);
    await frame.locator('body.vscode-dark').waitFor();assert.ok(await contrast()>=4.5,'dark theme selected case contrast');
    await page.screenshot({path:path.join(process.env.PIP_TEST_ROOT,'screenshots/vscode-output-dark.png')});
    await vscode.workspace.getConfiguration('workbench').update('colorTheme','Default Light Modern',vscode.ConfigurationTarget.Global);
    await frame.locator('body.vscode-light').waitFor();
    await api.openLesson(lesson.id);const good=new vscode.WorkspaceEdit();const robotDocument=await vscode.workspace.openTextDocument(api.lessonUri(lesson.id));good.replace(robotDocument.uri,new vscode.Range(robotDocument.positionAt(0),robotDocument.positionAt(robotDocument.getText().length)),withPackage(lesson.solution,lessonPackage(lesson.id)));await vscode.workspace.applyEdit(good);
    await frame.locator('#scene canvas').waitFor({timeout:30000});
    const completionPosition=robotDocument.positionAt(robotDocument.getText().indexOf('robot.setPower')+'robot.'.length);
    const completions=await waitFor(async()=>{
      const list=await vscode.commands.executeCommand('vscode.executeCompletionItemProvider',robotDocument.uri,completionPosition,'.');
      return list?.items?.some(item=>(typeof item.label==='string'?item.label:item.label.label).includes('setPower'))?list:null;
    },'native Java robot completion',90000);
    assert.ok(completions.items.length>0);
    const compactEdit=new vscode.WorkspaceEdit();
    compactEdit.replace(robotDocument.uri,new vscode.Range(robotDocument.positionAt(0),robotDocument.positionAt(robotDocument.getText().length)),withPackage('public class Student {public static void update(Robot robot){if(robot.seconds()<3){robot.setPower(0.3,0.3);}else{robot.stop();}}}',lessonPackage(lesson.id)));
    await vscode.workspace.applyEdit(compactEdit);
    console.log('Formatter enabled:',vscode.workspace.getConfiguration('java').get('format.enabled'));
    let formatEdits;
    await waitFor(async()=>{
      formatEdits=await vscode.commands.executeCommand('vscode.executeFormatDocumentProvider',robotDocument.uri,{tabSize:4,insertSpaces:true});
      return Array.isArray(formatEdits)&&formatEdits.length>0;
    },'native Java formatter',20000);
    const formatted=new vscode.WorkspaceEdit();formatted.set(robotDocument.uri,formatEdits);await vscode.workspace.applyEdit(formatted);
    assert.match(robotDocument.getText(),/\n\s+public static void update/);
    console.log('Native Java diagnostics:',vscode.languages.getDiagnostics(robotDocument.uri).map(d=>d.message));
    await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
    await vscode.commands.executeCommand('workbench.action.closeSidebar');
    await vscode.commands.executeCommand('notifications.clearAll');
    await delay(1500);
    await waitFor(()=>vscode.languages.getDiagnostics().flatMap(([,items])=>items.filter(d=>d.severity===vscode.DiagnosticSeverity.Error)).length===0,'clean Java project diagnostics',45000);
    await page.screenshot({path:path.join(process.env.PIP_TEST_ROOT,'screenshots/vscode-robot.png')});
    const canvas=frame.locator('#scene canvas'),before=await canvas.screenshot();const bounds=await canvas.boundingBox();
    await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width/2+70,bounds.y+bounds.height/2+20,{steps:8});await page.mouse.up();
    assert.ok(!before.equals(await canvas.screenshot()),'orbit camera responds');
    await frame.locator('.playback-tools select').selectOption('4');await frame.locator('#run').click();
    await frame.locator('.practice-completion').waitFor({timeout:30000});assert.equal(await frame.locator('#celebration').isVisible(),true);
    await page.screenshot({path:path.join(process.env.PIP_TEST_ROOT,'screenshots/vscode-success.png')});
    const savedDeclaration=declarationDocument.getText();
    await vscode.window.showTextDocument(declarationDocument,{viewColumn:vscode.ViewColumn.Two,preview:false});
    await waitFor(()=>vscode.window.activeTextEditor?.document.uri.toString()===declarationDocument.uri.toString()&&vscode.window.activeTextEditor?.viewColumn===vscode.ViewColumn.One,'Explorer-style switch routes Java left');
    await frame.getByRole('heading',{name:'Build a first variable',exact:true}).waitFor();
    assert.equal(declarationDocument.getText(),savedDeclaration,'switching files preserves source');
    await api.showCourse('/projects');await frame.locator('.collection-page').waitFor();assert.equal(await frame.locator('.lesson-list li').count(),3);
    await api.showCourse('/assignments');await frame.locator('.collection-page').waitFor();assert.equal(await frame.locator('.lesson-list li').count(),2);
    await api.showCourse('/learn/debug-semicolon');await frame.getByRole('button',{name:'Explore the idea'}).click();
    await frame.getByRole('button',{name:'Create variable',exact:true}).click();
    await frame.getByRole('button',{name:'Reassign',exact:true}).click();await frame.getByRole('button',{name:/^Apply/}).click();
    await frame.getByRole('button',{name:'Copy a value',exact:true}).click();
    await frame.getByRole('button',{name:'int backup = parts;',exact:true}).click();await frame.getByRole('button',{name:'parts = 7;',exact:true}).click();
    await frame.getByRole('link',{name:'Optional quiz'}).click();await frame.getByRole('radio',{name:/^No/}).check();await frame.getByRole('link',{name:'Start practice'}).click();
    const repairs=lessons.find(l=>l.id==='debug-semicolon').parts,repairDocuments=[];
    for(const id of repairs) {
      await api.openLesson(id);const item=lessons.find(l=>l.id===id),doc=await vscode.workspace.openTextDocument(api.lessonUri(id));
      const edit=new vscode.WorkspaceEdit();edit.replace(doc.uri,new vscode.Range(doc.positionAt(0),doc.positionAt(doc.getText().length)),withPackage(item.solution,lessonPackage(id)));await vscode.workspace.applyEdit(edit);
      assert.equal(doc.isDirty,true,'part has unsaved edits before run');const packet=await api.run(id);assert.equal(packet.result.passed,true);assert.equal(doc.isDirty,false,'Save & run saved the part');
      repairDocuments.push({doc,text:doc.getText()});
    }
    assert.ok(repairDocuments.every(({doc,text})=>doc.getText()===text),'all earlier repair files are preserved');
    await frame.locator('.part-navigation').waitFor();assert.equal(await frame.locator('.part-navigation button').count(),5);
    await frame.getByRole('button',{name:'Back to lesson outline'}).waitFor();
    assert.equal(await frame.locator('#reflection').isVisible(),false,'multipart review is optional too');
    assert.equal(await frame.locator('.part-navigation .completion-title.is-complete').count(),5);
    await page.screenshot({path:path.join(process.env.PIP_TEST_ROOT,'screenshots/vscode-multipart.png')});
    const hoop=orderedLessons.find(l=>l.id==='robot-hoop');await api.openLesson(hoop.id);const hoopDocument=await vscode.workspace.openTextDocument(api.lessonUri(hoop.id));
    const hoopEdit=new vscode.WorkspaceEdit();hoopEdit.replace(hoopDocument.uri,new vscode.Range(hoopDocument.positionAt(0),hoopDocument.positionAt(hoopDocument.getText().length)),withPackage(hoop.solution,lessonPackage(hoop.id)));await vscode.workspace.applyEdit(hoopEdit);
    await frame.locator('#scene canvas').waitFor();await frame.locator('.playback-tools select').selectOption('4');await frame.locator('#run').click();
    await frame.getByText('Scored!',{exact:true}).waitFor({timeout:30000});
    await frame.locator('.result-pane').click({position:{x:20,y:20}});
    await frame.locator('.result-pane').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(process.env.PIP_TEST_ROOT,'screenshots/vscode-hoop.png')});
    await api.openLesson(lesson.id);const crashDoc=await vscode.workspace.openTextDocument(api.lessonUri(lesson.id));
    const crashEdit=new vscode.WorkspaceEdit();crashEdit.replace(crashDoc.uri,new vscode.Range(crashDoc.positionAt(0),crashDoc.positionAt(crashDoc.getText().length)),withPackage('public class Student {public static void update(Robot r){r.setPower(1,1);}}',lessonPackage(lesson.id)));await vscode.workspace.applyEdit(crashEdit);
    await frame.locator('.playback-tools select').selectOption('4');await frame.locator('#run').click();await frame.getByText('Collision',{exact:true}).waitFor();
    await frame.locator('#scene canvas').scrollIntoViewIfNeeded();await delay(350);
    await page.screenshot({path:path.join(process.env.PIP_TEST_ROOT,'screenshots/vscode-explosion.png')});
    console.log('Separate content types, visual learning, multipart repairs, saved-file execution, varied tests, focus contrast, file sync, improved explosion and hoop scoring passed.');
  } finally { await browser.close(); }
}
