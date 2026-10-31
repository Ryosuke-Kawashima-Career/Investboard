import { spawn } from 'node:child_process';
const children = [spawn(process.execPath,['--env-file-if-exists=.env','server/index.ts'],{stdio:'inherit'}),spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1'],{stdio:'inherit'})];
for (const child of children) child.on('exit',()=> { for (const peer of children) if(peer !== child) peer.kill(); });
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=> { for(const child of children) child.kill(); });
