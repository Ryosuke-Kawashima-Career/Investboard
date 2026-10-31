import { chromium } from '@playwright/test';
import { makeServer } from '../server/index.ts';
import { Store } from '../server/store.ts';
import { manifest,normalizeDaily } from '../server/domain.ts';
import { mkdtempSync,rmSync,mkdirSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const store=new Store();
if(store.history().length<22) { store.close(); throw new Error('Actual acquired prices required for performance trial'); }
const server=makeServer(store);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch();
try {
 const context=await browser.newContext({viewport:{width:360,height:800}}),page=await context.newPage();const cdp=await context.newCDPSession(page);
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,downloadThroughput:1.6*1000000/8,uploadThroughput:750000/8,latency:150});
 const base=`http://127.0.0.1:${server.address().port}`;
 const start=performance.now();await page.goto(base);await page.getByRole('button',{name:manifest.name,exact:true}).waitFor();const elapsed=Math.round(performance.now()-start);
 await page.getByRole('button',{name:manifest.name,exact:true}).click();await page.getByRole('heading',{name:'Price history'}).waitFor();
 mkdirSync('dev/verification',{recursive:true});await page.screenshot({path:'dev/verification/phase2-mobile.png',fullPage:true});
 const report={profile:'360px, 4x CPU, 1.6 Mbps down, 750 Kbps up, 150ms latency, production build, warm server SQLite cache, cold browser cache',data:'Actual Yahoo Finance observations from the local persistent cache',primaryUsableMs:elapsed,targetMs:3000,passed:elapsed<3000};writeFileSync('dev/verification/phase2-performance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));store.close();}
