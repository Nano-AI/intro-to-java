import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readdir, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const workspace=path.join(root,'.demo-workspace'),profile=path.join(root,'.demo-profile'),extensions=path.join(root,'.demo-extensions');
await mkdir(workspace,{recursive:true});await mkdir(path.join(profile,'User'),{recursive:true});await mkdir(extensions,{recursive:true});
try { await writeFile(path.join(workspace,'README.md'),'# Pip live demo\n\nRun **Pip: Open Course** from the Command Palette. These practice files and progress are separate from your normal workspace.\n',{flag:'wx'}); } catch(e){if(e.code!=='EEXIST')throw e;}
try { await writeFile(path.join(profile,'User/settings.json'),JSON.stringify({'workbench.startupEditor':'none','chat.disableAIFeatures':true,'redhat.telemetry.enabled':false,'workbench.colorTheme':'Default Light Modern','editor.inlayHints.enabled':'off','window.title':'Pip Live Demo — ${activeEditorShort}'},null,2),{flag:'wx'}); } catch(e){if(e.code!=='EEXIST')throw e;}
const installed=path.join(os.homedir(),'.vscode/extensions');
const java=(await readdir(installed)).filter(name=>name.startsWith('redhat.java-')).sort().at(-1);
if(!java)throw new Error('Install redhat.java in VS Code before starting the demo.');
try{await symlink(path.join(installed,java),path.join(extensions,java),'dir');}catch(e){if(e.code!=='EEXIST')throw e;}
const npm=process.platform==='win32'?'npm.cmd':'npm';
execFileSync(npm,['run','build'],{cwd:root,stdio:'inherit'});
const children=['watch:web','watch:host'].map(script=>spawn(npm,['run',script],{cwd:root,stdio:'inherit'}));
const cli=process.env.VSCODE_CLI||(process.platform==='darwin'?'/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code':'code');
execFileSync(cli,['--new-window','--extensionDevelopmentPath='+root,'--user-data-dir',profile,'--extensions-dir',extensions,workspace],{stdio:'inherit'});
console.log('Pip live demo is open. Run “Pip: Open Course” in its Command Palette.');
console.log('React/CSS changes refresh the pane automatically. Host changes: Developer: Reload Window.');
console.log(`Demo files: ${workspace}\nKeep this terminal running; Ctrl+C stops the build watchers.`);
let stopping=false;const stop=()=>{if(stopping)return;stopping=true;children.forEach(child=>child.kill());process.exit(0);};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
