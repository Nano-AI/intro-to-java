import { runTests } from '@vscode/test-electron';
import { access, mkdtemp, mkdir, readdir, realpath, symlink, writeFile } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root=fileURLToPath(new URL('../../',import.meta.url));
const temp=await realpath(await mkdtemp(path.join(tmpdir(),'pip-vscode-test-')));
await mkdir(path.join(temp,'workspace'));await mkdir(path.join(temp,'extensions'));
await mkdir(path.join(temp,'profile/User'),{recursive:true});
await writeFile(path.join(temp,'profile/User/settings.json'),JSON.stringify({'workbench.startupEditor':'none','chat.disableAIFeatures':true,'redhat.telemetry.enabled':false,'workbench.secondarySideBar.defaultVisibility':'hidden','workbench.colorTheme':'Default Light Modern','editor.inlayHints.enabled':'off','java.configuration.updateBuildConfiguration':'automatic'}));
// Reuse the installed Java extension read-only in an isolated profile, without changing the user's extensions/settings.
const installed=path.join(homedir(),'.vscode/extensions');
const java=(await readdir(installed)).filter(name=>name.startsWith('redhat.java-')).sort().at(-1);
if(!java)throw new Error('Install redhat.java before running the extension-host tests.');
await symlink(path.join(installed,java),path.join(temp,'extensions',java),'dir');
let executable=process.env.VSCODE_EXECUTABLE_PATH;
if(!executable&&process.platform==='darwin') {
  for(const name of ['Code','Electron']) {
    const candidate=`/Applications/Visual Studio Code.app/Contents/MacOS/${name}`;
    try { await access(candidate); executable=candidate; break; } catch {}
  }
}
let developmentPath=root;
if(process.env.PIP_TEST_VSIX) {
  const cli=process.env.VSCODE_CLI || '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code';
  execFileSync(cli,['--install-extension',path.resolve(process.env.PIP_TEST_VSIX),'--extensions-dir',path.join(temp,'extensions'),'--user-data-dir',path.join(temp,'profile'),'--force'],{stdio:'inherit'});
  const installed=(await readdir(path.join(temp,'extensions'))).find(name=>name.startsWith('pip-learning.pip-workshop-'));
  if(!installed)throw new Error('The packaged extension was not installed.');
  developmentPath=path.join(temp,'extensions',installed);
}
await runTests({
  vscodeExecutablePath:executable,
  extensionDevelopmentPath:developmentPath,
  extensionTestsPath:path.join(root,'extension-dist/test.cjs'),
  extensionTestsEnv:{PIP_TEST_WORKSPACE:path.join(temp,'workspace'),PIP_TEST_ROOT:root},
  launchArgs:[path.join(temp,'workspace'),'--user-data-dir',path.join(temp,'profile'),'--extensions-dir',path.join(temp,'extensions'),'--disable-workspace-trust','--skip-welcome','--skip-release-notes','--disable-updates','--remote-debugging-port=9237'],
});
console.log(`Isolated test profile and student files: ${temp}`);
