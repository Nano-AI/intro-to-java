import { invoke } from './node-fs.js';
const { temp } = await invoke('paths');
export default { tmpdir: () => temp };
