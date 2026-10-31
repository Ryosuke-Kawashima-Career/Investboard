import {test,expect} from '@playwright/test';
import {Store} from '../../server/store';
import {snapshot} from '../../server/api';
import {manifest} from '../../server/domain';
import {importEvidence} from '../../server/evidence';
import {readFileSync} from 'node:fs';
test('persisted source-backed disclosure is linked without inventing publication recency',async({page})=>{const store=new Store(':memory:');store.set(`verified:${manifest.id}`,manifest);importEvidence(store,JSON.parse(readFileSync('dev/data/reliance-disclosure.json','utf8')));const s=snapshot(store);store.close();await page.route('**/api/companies',r=>r.fulfill({json:{data:s.data,meta:s.meta}}));await page.goto('/');await page.getByRole('button',{name:manifest.name,exact:true}).click();await expect(page.getByRole('link',{name:'Open original disclosure'})).toHaveAttribute('href',s.data[0].evidence[0].url);await expect(page.getByText(/Published: Unknown/)).toBeVisible();await expect(page.getByText(/No qualifying recent disclosure/)).toBeVisible();});
