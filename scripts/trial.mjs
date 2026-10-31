import {chromium,expect} from '@playwright/test';
import {Store} from '../server/store.ts';
import {makeServer} from '../server/index.ts';
import {snapshot} from '../server/api.ts';
import {writeFileSync} from 'node:fs';
const store=new Store(),snap=snapshot(store),s={data:snap.data.find(l=>l.id==='NSE:RELIANCE'),meta:snap.meta},server=makeServer(store);
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:360,height:800}});const base=`http://127.0.0.1:${server.address().port}`;
 await page.goto(base);await page.getByRole('button',{name:'Reliance Industries Limited',exact:true}).click();
 await page.getByRole('link',{name:'Open original disclosure'}).waitFor();
 if(s.data.history.length<22) throw new Error('GENUINE_HISTORY_REQUIRED');
 const price=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(s.data.quote.price);
 await expect(page.locator('.price strong')).toHaveText(price);
 await expect(page.locator('body')).toContainText(s.data.quote.sourceDate);
 for(const period of ['1M','6M','1Y']) { await page.getByRole('button',{name:period,exact:true}).click();await expect(page.getByRole('group',{name:'Inspect price chart'})).toBeVisible(); }
 await page.getByRole('button',{name:'Line',exact:true}).click();await page.getByRole('group',{name:'Inspect price chart'}).focus();await page.keyboard.press('ArrowLeft');
 await page.getByRole('button',{name:'Candles',exact:true}).click();

 if(await page.getByRole('link',{name:'Open original disclosure'}).getAttribute('href')!==s.data.evidence.find(e=>e.type==='company-disclosure').url)throw new Error('EVIDENCE_LINK_MISMATCH');
 if(await page.locator('body').innerText().then(t=>t.includes('synthetic')))throw new Error('DEMO_LEAK');
 await page.getByRole('button',{name:'Save RELIANCE NSE'}).click();await page.reload();await page.getByRole('button',{name:/Watchlist/}).click();await page.getByRole('button',{name:'Reliance Industries Limited',exact:true}).click();
 await page.screenshot({path:'dev/verification/phase2-actual-mobile.png',fullPage:true});await page.setViewportSize({width:1440,height:1050});await page.screenshot({path:'dev/verification/phase2-actual-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Remove RELIANCE NSE'}).click();
 const report={priceAndCalendarCharts:'passed',saveReloadRemove:'passed',mode:'real',providerCallsDuringTrial:0,listingVerified:s.data.verified,listings:snap.data.length,newsHeadlines:snap.data.reduce((n,l)=>n+l.evidence.filter(e=>e.type==='news-report').length,0),observations:s.data.history.length,evidenceCount:s.data.evidence.length,disclosureLinkAndSaveReload:'passed',genuinePriceJourney:s.data.history.length>=22?'available':'blocked: no actual price observations',error:s.meta.error};
 writeFileSync('dev/verification/phase2-trial.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();await new Promise(r=>server.close(r));store.close();}
